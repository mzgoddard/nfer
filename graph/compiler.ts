import { FuncCompilation, isFuncCompilation } from "./instruction";
import { AndSyntax, CallSyntax, CodeBuilder, isCodeBuilder, isSyntax, OrSyntax, RootSyntax, Syntax } from "./syntax";

export class SyntaxVisitor {
    typeMethodMap = {
        root: {enter: 'enterRoot', exit: 'exitRoot', visit: [['visitKey', 'node']]},
        and: {enter: 'enterAnd', exit: 'exitAnd', visit: [['visitKey', 'right'], ['visitKey', 'left']]},
        or: {enter: 'enterOr', exit: 'exitOr', visit: [['visitKey', 'right'], ['visitOr'], ['visitKey', 'left']]},
        call: {enter: 'enterCall', exit: 'exitCall', visit: []},
    };

    visit(code: Syntax, path, state) {
        return this.visitType(code, this.typeMethodMap[code.type].visit, path, state);
    }

    visitMethod(code: Syntax, method, path, state) {
        return (method ? method.call(this, code, path, state) : null) || state;
    }

    visitType(code: Syntax, visit, path, state) {
        const enterState = this._enter(code, path, state);
        // const visitState = visitMethod.call(this, code, path, enterState);
        let visitState = enterState;
        for (const [method, ...args] of visit) {
            visitState = this[method](code, path, visitState, ...args);
        }
        return this._exit(code, path, visitState);
    }

    visitRoot(code: RootSyntax, path, state) {
        return state;
    }

    visitAnd(code: AndSyntax, path, state) {
        return state;
    }

    visitOr(code: OrSyntax, path, state) {
        return state;
    }

    visitCall(code: CallSyntax, path, state) {
        return state;
    }

    _enter(code: Syntax, path, state) {
        const enterState = this.visitMethod(code, this.enter, path, state);
        return this.visitMethod(code, this[this.typeMethodMap[code.type].enter], path, enterState);
    }

    _exit(code: Syntax, path, state) {
        const exitState = this.visitMethod(code, this[this.typeMethodMap[code.type].exit], path, state);
        return  this.visitMethod(code, this.exit, path, exitState);
    }

    enter(code: Syntax, path, state): any {}

    exit(code: Syntax, path, state): any {}

    enterRoot(code: RootSyntax, path, state): any {}

    exitRoot(code: RootSyntax, path, state): any {}

    enterAnd(code: AndSyntax, path, state): any {}

    exitAnd(code: AndSyntax, path, state): any {}

    enterOr(code: OrSyntax, path, state): any {}

    exitOr(code: OrSyntax, path, state): any {}

    enterCall(code: CallSyntax, path, state): any {}

    exitCall(code: CallSyntax, path, state): any {}
}

export interface Func<Code> {
    readonly code: Code;
}

export function isFunc<Code>(obj: unknown): obj is Func<Code> {
    return typeof obj === 'object' && obj !== null && 'code' in obj;
}

export interface SourceCompilation<Code> {
    source: Code;
}

export function isCompilation<Code>(obj: unknown): obj is SourceCompilation<Code> {
    return typeof obj === 'object' && obj !== null && 'source' in obj;
}

export interface Compiler<Code> {
    compile(code: Code): SourceCompilation<Code>;
    compile(builder: CodeBuilder<Code, any>): SourceCompilation<Code>;
    compile(func: Func<Code>): SourceCompilation<Code>;
    compile(compilation: SourceCompilation<Code>): SourceCompilation<Code>;
}

function getCode<Code>(source: Func<Code> | CodeBuilder<Code, any> | SourceCompilation<Code> | Code): Code {
    if (isFunc<Code>(source)) {
        return source.code;
    } else if (isCodeBuilder<Code>(source)) {
        return source.code;
    } else if (isCompilation<Code>(source)) {
        return source.source;
    }
    return source as Code;
}

export class CompilerCache<Code> implements Compiler<Code> {
    _cache: Map<Code, SourceCompilation<Code>>;
    _compiler: Compiler<Code>;

    constructor({
        cache = new Map(),
        compiler,
    }: {
        cache?: Map<Code, SourceCompilation<Code>>,
        compiler: Compiler<Code>,
    }) {
        this._cache = cache;
        this._compiler = compiler;
    }

    compile(source: Code | CodeBuilder<Code, any> | Func<Code> | SourceCompilation<Code>) {
        const code = getCode<Code>(source);
        if (!this._cache.has(code)) {
            this._cache.set(code, this._compiler.compile(code));
        }
        return this._cache.get(code);
    }
}
