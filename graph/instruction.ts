import { AndSyntax, CallSyntax, CodeBuilder, isCodeBuilder, isSyntax, OrSyntax, RootSyntax, Syntax } from "./syntax";
import {Resource, ResourceId, ResourceManager, StackedResource} from './resource';
import { AddressHistoryMarker, AddressHistory, AddressHistoryList, Data, DataAddress, match, cloneValue } from "./address.mts";
import { Compiler, Func, SourceCompilation, SyntaxVisitor } from "./compiler";

interface Instruction {
    action(thread: InstructionThread): void;
}

export class FuncCompilation {
    firstInstruction: Instruction;
    resourceId: ResourceId<any>;

    constructor(public readonly func: Func) {}
}

export function isFuncCompilation(compilation: any): compilation is FuncCompilation {
    return compilation && compilation.func;
}

class CompileFuncInstruction {
    compilation: FuncCompilation;

    action(thread: InstructionThread) {
        thread.compiler.compile(this.compilation);
        thread.instruction = this.compilation.firstInstruction;
    }
}

class CallInstruction {
    constructor(public func: FuncCompilation, public args: any[], public ifTrue: Instruction = null, public ifFalse: Instruction = null) {}

    action(thread: InstructionThread) {
        thread.caller = [thread.caller, this, thread.addressFrame];
        thread.instruction = this.func.firstInstruction;
        thread.addressFrame = {};
    }
}

type ReenterFrameTuple = [teardown: object, caller: SavedFrame, instruction: Instruction, addressFrame: object];

class CallAgainInstruction {
    action(thread: InstructionThread) {
        [, thread.caller, thread.instruction, thread.addressFrame] = thread.instructionData.peekFirst<ReenterFrameTuple>();
        thread.instructionData.destroyFirst();
    }
}

class ReturnTrueInstruction {
    constructor(public ifContinue: Instruction) {}

    action(thread: InstructionThread) {
        thread.instructionData.create4<ReenterFrameTuple>(null, thread.caller, this.ifContinue, thread.addressFrame);

        ({caller: [thread.caller, {ifTrue: thread.instruction}, thread.addressFrame]} = thread);
    }
}

class ReturnFalseInstruction {
    action(thread: InstructionThread) {
        ({caller: [thread.caller, {ifFalse: thread.instruction}, thread.addressFrame]} = thread);
    }
}

type AddressRevertChangesTuple = [teardown: object, addressHistory: AddressHistory, start: AddressHistoryMarker, stop: AddressHistoryMarker];

const addressRevertTeardown = {
    destroy([, addressHistory, start, stop]: AddressRevertChangesTuple) {
        addressHistory.revert(start, stop);
    }
};

type BranchTuple = [teardown: object, instruction: Instruction];

class PushBranchInstruction {
    constructor(public ifContinue: Instruction, public branchInstruction: Instruction) {}

    action(thread: InstructionThread) {
        thread.instructionData.create2<BranchTuple>(null, this.ifContinue);

        thread.instruction = this.branchInstruction;
    }
}

class PopBranchInstruction {
    action(thread: InstructionThread) {
        [, thread.instruction] = thread.instructionData.peekFirst<BranchTuple>();
        thread.instructionData.destroyFirst();
    }
}

class MatchArgsInstruction {
    ifTrue: Instruction;
    ifFalse: Instruction;
    args: any[]; 

    action(thread: InstructionThread) {
        const startMarker = thread.addressHistory.markStart();
        const [, instruction, addressFrame] = thread.caller;
        if (match(thread, this.args, thread.addressFrame, instruction.args, addressFrame)) {
            thread.instructionData.create4<AddressRevertChangesTuple>(addressRevertTeardown, thread.addressHistory, startMarker, thread.addressHistory.markEnd());
            thread.instruction = this.ifTrue;
        } else {
            thread.addressHistory.revert(startMarker);
            thread.instruction = this.ifFalse;
        }
    }
}

class TeardownInstruction {
    ifTrue: Instruction;

    action(thread: InstructionThread) {
        const teardownTuple = thread.instructionData.peekFirst();
        teardownTuple[0].destroy(teardownTuple);
        thread.instructionData.destroyFirst();
        thread.instruction = this.ifTrue;
    }
}



class NthInstruction {
    ifTrue: Instruction;
    ifFalse: Instruction;
    args: [array: Data<object>, index: Data<number>, value: Data<any>];

    action(thread: InstructionThread) {
        const [_array, _index, _value] = this.args;
        const array = readDataAddress(_array);
        if (array !== null) {
            if (isSet(_index)) {
                const index = readDataAddress(_index);
                if (match(thread, _value, thread.caller.data, array[index], thread.caller.data)) {

                } else {

                }
            } else {
                if (isSet(_value)) {

                } else {

                }
            }
        } else {
            
        }
    }
}

type SavedFrame = [
    caller: SavedFrame,
    instruction: CallInstruction,
    addressFrame: object,
];

class ThreadDataStack {
    stack: any[] = [];

    constructor(public resource: Resource<any[]>) {}

    create2<T extends [any, any]>(a1: T[0], a2: T[1]) {
        const item = this.resource.create();
        item[0] = a1;
        item[1] = a2;
        this.stack.push(item);
        return item as T;
    }

    create3<T extends [any, any, any]>(a1: T[0], a2: T[1], a3: T[2]) {
        const item = this.resource.create();
        item[0] = a1;
        item[1] = a2;
        item[2] = a3;
        this.stack.push(item);
        return item as T;
    }

    create4<T extends [any, any, any, any]>(a1: T[0], a2: T[1], a3: T[2], a4: T[3]) {
        const item = this.resource.create();
        item[0] = a1;
        item[1] = a2;
        item[2] = a3;
        item[3] = a4;
        this.stack.push(item);
        return item as T;
    }

    createV<T extends [] | any[]>(...item: T): T {
        this.stack.push(item);
        return item;
    }

    destroyFirst() {
        const item = this.stack.pop();
        item.length = 0;
        this.resource.destroy(item);
    }

    peekFirst<T extends [] | any[]>(): T {
        return this.stack[this.stack.length - 1];
    }
}

class InstructionThread {
    readonly program: Program;
    readonly resourceManager: ResourceManager;

    topFrame: SavedFrame;
    caller: SavedFrame;
    instruction: Instruction;
    addressFrame: object;

    addressHistory: AddressHistory;
    instructionData: ThreadDataStack;

    running = false;

    constructor(program: Program) {
        this.program = program;
        this.resourceManager = program.settings.resourceManager;
        this.addressHistory = new AddressHistoryList();
        this.instructionData = new ThreadDataStack(new StackedResource(() => []));
    }

    step() {
        this.instruction.action(this);
    }
    run() {
        this.running = true;
        while (this.running) {
            this.step();
        }
        return this.instruction === this.topFrame[1].ifTrue;
    }
    teardown() {
        let item;
        while (item = this.instructionData.peekFirst()) {
            this.instructionData.destroyFirst();
            item[0].destroy(item);
        }
    }
}

interface ThreadFactory {
    createThread(): InstructionThread;
}

interface InstructionCompileState {
    readonly instructions: Instruction[];
}

class InstructionVisitor extends SyntaxVisitor {
    enterRoot(s: RootSyntax, p: string[], state: InstructionCompileState) {
        const falseInstruction = new ReturnFalseInstruction();
        return {
            ...state,
            ifTrue: new ReturnTrueInstruction(falseInstruction),
            ifFalse: falseInstruction,
        };
    }

    enterAnd(s: AndSyntax, p: string[], state: InstructionCompileState) {
        return {
            ...state,
            controlStack: 
        }
    }

    exitAnd(s: AndSyntax, p: string[], state: InstructionCompileState) {
        const rightInstruction = state.instruction;
        const leftInstruction = state.instructions.next;
        return {
            ...state,
            instruction: {
                value: leftInstruction.
            },
        };
    }

    enterOr(s: OrSyntax, p: string[], state: InstructionCompileState) {
        const ifFalse = new PopBranchInstruction();
        const ifTrue = new PushBranchInstruction(state.ifTrue, ifFalse);
        return {
            ...state,
            addTest(i: Instruction) {
                return {
                    ...state,
                    ifTrue,
                    ifFalse: 
                };
            },
            orBranch: {
                ifFalse,
                next: state.orBranch,
            },
            ifTrue: new PushBranchInstruction(state.ifTrue, ifFalse),
        };
    }

    exitOr(s: OrSyntax, p: string[], state: InstructionCompileState) {
        const rightInstruction = state.instruction;
        const leftInstruction = state.instructions.next;
        return {
            ...state,
            instruction: {
                value: leftInstruction.and(state.ifTrue).or(state.ifFalse),
            }
        };
    }

    exitCall(s: CallSyntax, p: string[], state: InstructionCompileState) {
        return {
            ...state,
            ifTrue: new CallInstruction(new FuncCompilation(s.func), s.args, state.ifTrue, state.ifFalse),
        }
    }
}

class InstructionFunc {
    constructor(public args: any[], public code: Syntax) {}
}

class InstructionCompiler implements Compiler<Syntax, {}> {
    visitor: InstructionVisitor;

    cache: Map<object, FuncCompilation>;

    private _getCompilation(arg: Syntax | CodeBuilder<Syntax, {}> | InstructionFunc | FuncCompilation): FuncCompilation {
        if (isCodeBuilder<Syntax>(arg)) {
            arg = arg.code;
        }
        if (isSyntax(arg)) {
            arg = new InstructionFunc([], arg);
        }
        if (!isFuncCompilation(arg)) {
            arg = new FuncCompilation(arg);
        }

        return arg;
    }

    compile(code: Syntax): FuncCompilation;
    compile(builder: CodeBuilder<Syntax, {}>): FuncCompilation;
    compile(func: InstructionFunc): FuncCompilation;
    compile(compilation: FuncCompilation): FuncCompilation;
    compile(arg: Syntax | CodeBuilder<Syntax, {}> | InstructionFunc | FuncCompilation): FuncCompilation {
        const compilation = this._getCompilation(arg);

        return compilation;
    }
}

class InstructionThreadFactory {
    createThread(program: Program) {
        return new InstructionThread(program);
    }
}

class Settings {
    resourceManager: ResourceManager;
    compiler: Compiler;
    threads: ThreadFactory;

    run(goal: Syntax): Program {
        return new Program(this, goal);
    }
}

const halt = {
    action() {},
};
const topFrameContinue = new CallAgainInstruction();
const topFrameCall = new CallInstruction(null, null, topFrameContinue, halt);

class Program {
    constructor(public settings: Settings, public goal: Syntax) {}

    *[Symbol.iterator]() {
        const firstInstruction = this.settings.compiler.compile(this.goal);

        const thread = new InstructionThread(this);
        const answer = {};
        thread.topFrame = [null, topFrameCall, answer];
        thread.caller = thread.topFrame;
        thread.instruction = firstInstruction;
        thread.addressFrame = answer;

        try {
            while (thread.run()) {
                yield cloneValue(answer, answer);
            }
        } finally {
            thread.teardown();
        }
    }
}

class InstructionCompiler implements Compiler<Syntax> {
    compile(source: Syntax | Func<Syntax> | SourceCompilation<Syntax> | CodeBuilder<Syntax, any>) {
        const v = 
    } 
}
