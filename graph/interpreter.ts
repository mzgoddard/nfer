import { Syntax } from './syntax';

type InterpretedCodeCursor = {};

class InterpretedCodeList<T> {
    cursor: InterpretedCodeNode<T>;

    get element() {
        return this.cursor.element;
    }

    save(): InterpretedCodeCursor {
        return this.cursor;
    }
    restore(cursor: InterpretedCodeCursor) {
        this.cursor = cursor as any;
    }

    incrementCursor() {
        this.cursor = this.cursor.next;
    }
    decrementCursor() {
        this.cursor = this.cursor.prev;
    }

    insertNext(element: T) {
        const next = new InterpretedCodeNode(element, this.cursor.next, this.cursor);
        next.prev.next = next;
        next.next.prev = next;
    }
    insertPrevious(element: T) {
        const prev = new InterpretedCodeNode(element, this.cursor, this.cursor.prev);
        prev.prev.next = prev;
        prev.next.prev = prev;
    }
    removeNext(element: T) {
        const next = this.cursor.next;
        next.prev.next = next.next;
        next.next.prev = next.prev;
    }
    removePrevious(element: T) {
        const prev = this.cursor.prev;
        prev.next.prev = prev.prev;
        prev.prev.next = prev.next;
    }
    replace(element: T) {
        this.cursor = new InterpretedCodeNode(element, this.cursor.next, this.cursor.prev);
        this.cursor.next.prev = this.cursor;
        this.cursor.prev.next = this.cursor;
    }
    replaceWithNext(element: T) {
        this.cursor.next.prev = this.cursor.prev;
        this.cursor.prev.next = this.cursor.next;
        this.incrementCursor();
    }
    replaceWithPrevious(element: T) {
        this.cursor.prev.next = this.cursor.next;
        this.cursor.next.prev = this.cursor.prev;
        this.decrementCursor();
    }
}

class InterpretedCodeNode<T> {
    constructor(public element: T,
    public next: InterpretedCodeNode<T>,
    public prev: InterpretedCodeNode<T>) {}


}

class InterpreterSavedFrame<T> {
    caller: InterpreterSavedFrame<T>;
    cursor: InterpretedCodeNode<T>;
    addressFrame: object;
}

interface InterpretedSyntax {
    type: 'syntax';
    syntax: Syntax;
}

interface InterpretedCallAgain {
    type: 'callAgain';
    caller: InterpreterSavedFrame<InterpretedInstruction>;
}

interface InterpretedReturnTrue {
    type: 'returnTrue';
}

interface InterpretedReturnFalse {
    type: 'returnFalse';
}

interface InterpretedAnswer {
    type: 'answer';
}

type InterpretedInstruction = InterpretedSyntax | InterpretedCallAgain | InterpretedReturnTrue | InterpretedReturnFalse | InterpretedAnswer;

class InterpreterThread {
    topFrame: InterpreterSavedFrame<InterpretedInstruction>;
    caller: InterpreterSavedFrame<InterpretedInstruction>;
    cursor: InterpretedCodeNode<InterpretedInstruction>;
    addressFrame: object;

    running = false;

    step() {
        switch (this.cursor.element.type) {
        case 'syntax':
            switch (this.cursor.element.syntax.type) {
            case 'call':
                break;
            case 'root':
                break;
            }
            break;
        default:
            throw new Error('error');
        }
    }
    run() {
        while (this.running) {
            this.step();
        }
    }
    teardown() {}
}
