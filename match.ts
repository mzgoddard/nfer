type Scope = {[key: string]: any};
type AddressableObject = any[] | {[key: string]: any};
type Addressable = string | AddressableObject;
type Primitive = boolean | number | string | symbol | ((...args: any[]) => any);

type FactShape<Args extends any[] = any[], Body = CallShape> = [Args] | [Args, Body];
type MakeOp<Args extends any[] = any[]> = FactShape<Args> | ((scope: Scope, ...args: Args) => StackFrame);
type CallShape<Args extends any[] = any[]> = [MakeOp<Args>, Args] | ((scope: Scope) => StackFrame);

const CANCEL: 0 = 0;
type CANCEL = typeof CANCEL;
const FALSE: false = false;
type FALSE = typeof FALSE;

type FrameResult = StackFrame | FALSE | CANCEL;
interface StackFrame {
    next(): FrameResult;
    cancel(): CANCEL;
}

class True implements StackFrame {
    next() {
        return FALSE;
    }
    cancel() {
        return CANCEL;
    }
}

const TRUE = new True();

class Yes implements StackFrame {
    next() {
        return TRUE;
    }
    cancel() {
        return CANCEL;
    }
}
class No implements StackFrame {
    next() {
        return FALSE;
    }
    cancel() {
        return CANCEL;
    }
}

const YES = new Yes();
const NO = new No();

function yes() {
    return YES;
}
function no() {
    return NO;
}

class CancelNext implements StackFrame {
    next() {
        return CANCEL;
    }
    cancel() {
        return CANCEL;
    }
}

const CANCEL_NEXT = new CancelNext();

class Cut implements StackFrame {
    next() {
        return CANCEL_NEXT;
    }
    cancel() {
        return CANCEL;
    }
}

const CUT = new Cut();

function cut() {
    return CUT;
}

class Id {
    name: string;
    constructor(name: string) {
        this.name = name;
    }

    static nextId = 0;

    static get _() {
        return new Id((Id.nextId++).toString());
    }
}

function id(name: string) {
    return new Id(name);
}

class Address<Name extends Addressable = Addressable> {
    scope: Scope;
    name: Name;
    constructor(scope: Scope, name: Name) {
        this.scope = scope;
        this.name = name;
    }
}

function readAddress(addr: Address): Address {
    if (typeof addr.name === 'string') {
        const value = addr.scope[addr.name];
        if (value instanceof Address) return readAddress(value);
    }
    return addr;
}

function readId(scope: Scope, arg: any): Address | Primitive {
    if (arg instanceof Id) {
        const addr = readId(scope, scope[arg.name]);
        if (addr instanceof Address) return addr;
        return new Address(scope, arg.name);
    } else if (arg instanceof Address) {
        return readAddress(arg);
    } else if (arg && typeof arg === 'object') {
        return new Address(scope, arg);
    }
    return arg as Primitive;
}

class UnbindAddress implements StackFrame {
    addr: Address<string>;
    constructor(addr: Address<string>) {
        this.addr = addr;
    }
    next() {
        this.addr.scope[this.addr.name] = undefined;
        return FALSE;
    }
    cancel() {
        this.addr.scope[this.addr.name] = undefined;
        return CANCEL;
    }
}

function bindAddress(addr: Address<string>, value: Address | Primitive, binds: StackFrame[]) {
    const addrValue = addr.scope[addr.name];
    if (typeof addrValue === 'undefined') {
        addr.scope[addr.name] = value;
        binds.push(new UnbindAddress(addr));
        return true;
    }
    if (value instanceof Address) {
        if (typeof value.name === 'string') {
            const rightValue = value.scope[value.name];
            if (typeof rightValue === 'undefined') {
                if (addrValue && typeof addrValue === 'object') {
                    value.scope[value.name] = addr;
                } else {
                    value.scope[value.name] = addrValue;
                }
                binds.push(new UnbindAddress(value as Address<string>));
                return true;
            }
            value = rightValue;
        } else {
            return false;
        }
    }
    return addrValue === value;
}

function _match(left: any, right: any, leftScope: Scope, rightScope: Scope, binds: StackFrame[]) {
    const _left = readId(leftScope, left);
    const _right = readId(rightScope, right);
    // console.log(_match, left && left.name, inspect(leftScope, _left), right && right.name, inspect(rightScope, _right));
    // console.log(_left, _right);

    if (_left === _right) return true;

    if (_left instanceof Address) {
        if (typeof _left.name === 'string') {
            return bindAddress(_left as Address<string>, _right, binds);
        }
        if (_right instanceof Address) {
            if (typeof _right.name === 'string') {
                return bindAddress(_right as Address<string>, _left, binds);
            } else if (Array.isArray(_left.name) && Array.isArray(_right.name) && _left.name.length === _right.name.length) {
                const {name, scope: leftScope} = _left;
                const {name: rightName, scope: rightScope} = _right;
                for (let i = 0; i < name.length; i++) {
                    // console.log('m', i, name[i], rightName[i]);
                    if (!_match(name[i], rightName[i], leftScope, rightScope, binds)) {
                        // console.log('f', i, name[i], rightName[i]);
                        return false;
                    }
                }
                return true;
            } else if (typeof _right.name === 'object') {
                const {name, scope: leftScope} = _left;
                const {name: rightName, scope: rightScope} = _right;
                for (const key in name) {
                    if (!(key in rightName)) return false;
                    if (!_match(name[key], rightName[key], leftScope, rightScope, binds)) {
                        return false;
                    }
                }
                return true;
            }
        }
        return false;
    }
    if (_right instanceof Address) {
        if (typeof _right.name === 'string') {
            return bindAddress(_right as Address<string>, _left, binds);
        }
    }

    return false;
}

class Match implements StackFrame {
    scope: Scope;
    left: any;
    right: any;
    binds: StackFrame[] = null;
    constructor(scope: Scope, left: any, right: any) {
        this.scope = scope;
        this.left = left;
        this.right = right;
    }
    next() {
        if (this.binds !== null) {
            this.cancel();
            return FALSE;
        }

        const left = readId(this.scope, this.left);
        const right = readId(this.scope, this.right);
        this.binds = [];
        if (left instanceof Address) {
            if (typeof left.name === 'string') {
                if (bindAddress(left as Address<string>, right, this.binds)) {
                    return this;
                }
                return FALSE;
            }
            if (right instanceof Address) {
                if (typeof right.name === 'string') {
                    if (bindAddress(right as Address<string>, left, this.binds)) {
                        return this;
                    }
                    return FALSE;
                }
                const {name: leftObject, scope: leftScope} = left;
                const {name: rightObject, scope: rightScope} = right;
                if (_match(leftObject, rightObject, leftScope, rightScope, this.binds)) {
                    return this;
                }
                // console.log(this.scope, leftObject, rightObject);
                this.cancel();
                return FALSE;
            }
        }
        if (right instanceof Address && typeof right.name === 'string') {
            if (bindAddress(right as Address<string>, left, this.binds)) {
                return this;
            }
            return FALSE;
        }
        return left === right ? this : FALSE;
    }
    cancel() {
        for (let i = this.binds.length - 1; i >= 0; i--) {
            this.binds[i].cancel();
        }
        this.binds.length = 0;
        return CANCEL;
    }
}

function match(scope: Scope, left: any, right: any) {
    return new Match(scope, left, right);
}

{
    function callOne(scope: Scope, [makeOp, args]: [(scope: Scope, ...args: any[]) => StackFrame, any[]], fn: (name: string, scope: Scope) => void) {
        const op = makeOp(scope, ...args);
        const out = op.next();
        if (out) {
            fn('answer', scope);
            out.cancel();
        } else {
            // console.warn('false');
        }
        fn('end', scope);
    };

    callOne({}, [match, [id('a'), 1]], console.log.bind(console));
    callOne({}, [match, [1, 1]], console.log.bind(console));
    callOne({}, [match, [id('a'), [1, 2]]], console.log.bind(console));
    callOne({}, [match, [[id('a'), id('b')], [1, 2]]], console.log.bind(console));
    callOne({}, [match, [[id('a'), id('a')], [1, 1]]], console.log.bind(console));
    callOne({}, [match, [[id('a'), id('a')], [1, 2]]], console.log.bind(console));
    callOne({}, [match, [[[id('a'), id('b')], [id('b'), id('a')]], [[1, 2], [2, 1]]]], console.log.bind(console));
    callOne({}, [match, [[id('a'), id('a')], [[1, 1], [1, 1]]]], console.log.bind(console));
    callOne({}, [match, [[id('a'), [1, 1]], [[1, 1], id('a')]]], console.log.bind(console));
    callOne({}, [match, [[id('a'), id('a'), id('c'), id('c')], new Address({}, [[1, 1], id('b'), id('b'), [1, 1]])]], console.log.bind(console));
    callOne({}, [match, [new Address({}, [id('a'), id('a'), 2]), [{a: id('b')}, {a: {b: id('c')}}, id('c')]]], console.log.bind(console));
}

class Fact implements StackFrame {
    scope: Scope = {};
    args: any[];
    body: CallShape;
    paramsScope: Scope;
    params: any[];
    match: StackFrame | FALSE | CANCEL = null;
    repeat: StackFrame | FALSE | CANCEL = null;
    constructor(args: any[], body: CallShape, paramsScope: Scope, params: any[]) {
        this.args = args;
        this.body = body;
        this.paramsScope = paramsScope;
        this.params = params;
    }
    next() {
        if (this.match === null) this.match = match(this.paramsScope, new Address(this.scope, this.args), this.params).next();
        if (!this.match) return this.match;
        if (this.repeat === null) this.repeat = call(this.scope, this.body, this.repeat);
        else if (this.repeat) this.repeat = this.repeat.next();
        if (!this.repeat) {
            this.match = this.match.cancel();
            return FALSE;
        }
        // console.log('Fact', this.match, this.repeat);
        return this;
    }
    cancel() {
        if (this.repeat) this.repeat = this.repeat.cancel();
        if (this.match) this.match = this.match.cancel();
        return CANCEL;
    }
}

function fact(args: any[], body?: CallShape) {
    if (!body) body = yes;
    return function makeFact(paramsScope, ...params) {
        return new Fact(args, body, paramsScope, params);
    };
}

function call(scope: Scope, callShape: CallShape, repeat: StackFrame | FALSE | CANCEL = FALSE) {
    if (!repeat) {
        if (Array.isArray(callShape)) {
            const [makeOp, params] = callShape;
            if (Array.isArray(makeOp)) {
                const [args, body] = makeOp;
                repeat = params ?
                    fact(args, body)(scope, ...params) :
                    fact(args, body)(scope);
            } else {
                repeat = params ? makeOp(scope, ...params) : makeOp(scope);
            }
        } else {
            repeat = callShape(scope);
        }
    }
    if (repeat) return repeat.next();
    return FALSE;
}

class Block implements StackFrame {
    scope: Scope;
    statements: CallShape[];

    i: number = 0;
    repeat: FrameResult[] = [];
    constructor(scope, statements) {
        this.scope = scope;
        this.statements = statements;
    }
    next() {
        if (this.i === this.statements.length) this.i -= 1;
        while (this.i >= 0 && this.i < this.statements.length) {
            const result = this.repeat[this.i] = call(this.scope, this.statements[this.i], this.repeat[this.i]);
            if (result === CANCEL) {
                this.cancel();
                return CANCEL;
            }
            this.i += result ? 1 : -1;
        }
        return (this.i === this.statements.length) ? this : FALSE;
    }
    cancel() {
        if (this.i === this.statements.length) this.i -= 1;
        for (; this.i >= 0; this.i--) {
            const repeat = this.repeat[this.i];
            if (repeat) this.repeat[this.i] = repeat.cancel();
        }
        return CANCEL;
    }
}

function block(scope, ...statements) {
    return new Block(scope, statements);
}

class Branch implements StackFrame {
    scope: Scope;
    branches: CallShape[];

    i: number = 0;
    repeat: FrameResult;
    constructor(scope, branches) {
        this.scope = scope;
        this.branches = branches;
    }
    next() {
        for (; this.i < this.branches.length; this.i += 1) {
            const result = this.repeat = call(this.scope, this.branches[this.i], this.repeat);
            if (result) return this;
            if (result === CANCEL) {
                this.cancel();
                return CANCEL;
            }
        }
        return FALSE;
    }
    cancel() {
        this.i = this.branches.length;
        if (this.repeat) this.repeat = this.repeat.cancel();
        return CANCEL;
    }
}

function branch(scope, ...branches) {
    return new Branch(scope, branches);
}

class BranchFacts implements StackFrame {
    scope: Scope;
    facts: FactShape[];
    params: any[];

    i: number = 0;
    repeat: FrameResult;
    constructor(scope, facts, params) {
        this.scope = scope;
        this.facts = facts;
        this.params = params;
    }
    next() {
        for (; this.i < this.facts.length; this.i += 1) {
            if (!this.repeat) {
                const [args, body] = this.facts[this.i];
                this.repeat = new Fact(args, body || yes, this.scope, this.params).next();
            } else {
                this.repeat = this.repeat.next();
            }
            const result = this.repeat;
            if (result) return this;
            if (result === CANCEL) {
                this.cancel();
                return CANCEL;
            }
        }
        return FALSE;
    }
    cancel() {
        this.i = this.facts.length;
        if (this.repeat) this.repeat = this.repeat.cancel();
        return CANCEL;
    }
}

function branchFacts(scope, facts, params) {
    return new BranchFacts(scope, facts, params);
}

class Log implements StackFrame {
    scope: Scope;
    params: any[];
    constructor(scope, params) {
        this.scope = scope;
        this.params = params;
    }
    next() {
        console.log(...this.params.map(param => inspect(this.scope, param)));
        return TRUE;
    }
    cancel() {
        return CANCEL;
    }
}

function inspect(scope, obj) {
    if (obj instanceof Id) {
        if (typeof scope[obj.name] !== 'undefined') {
            return inspect(scope, scope[obj.name]);
        }
    } else if (obj instanceof Address) {
        if (typeof obj.name === 'string') {
            return inspect(obj.scope, obj.scope[obj.name]);
        }
        return inspect(obj.scope, obj.name);
    } else {
        if (obj && typeof obj === 'object') {
            if (Array.isArray(obj)) {
                return obj.map(item => inspect(scope, item));
            } else {
                const o = {};
                for (const key in obj) {
                    o[key] = inspect(scope, obj[key]);
                }
                return o;
            }
        }
    }
    return obj;
}

function log(scope, ...params) {
    return new Log(scope, params);
}

const [item, _1, _2] = 'item, _1, _2'.split(', ').map(id);
const existFacts = [
    // [id('params'), [block, [[log, ['existFacts', id('params')]], [no]]]],
    [[item, [item, _1, _2]], [yes]],
    [[item, [_1, item, _2]], [yes]],
    [[item, [_1, _2, item]], [yes]],
];

const exists = [id('params'), [block, [[branchFacts, [existFacts, id('params')]]]]];

call({}, [block, [
    [exists, [[1, 0, id('_1')], id('list')]],
    [exists, [[id('_2'), 0, 0], id('list')]],
    [branchFacts, [existFacts, [[0, 2, id('_3')], id('list')]]],
    [branchFacts, [existFacts, [[id('_4'), 2, 0], id('list')]]],
    [branchFacts, [existFacts, [[0, 0, id('_5')], id('list')]]],
    [branchFacts, [existFacts, [[id('_6'), 0, 3], id('list')]]],
    [log, ['branchFacts + existFacts =', id('list')]],
]], FALSE);

const s1 = {};
call(s1, [block, [
    // [log, ['a']],
    [exists, [1, id('list')]],
    // [log, ['b', id('list'), s1]],
    [exists, [2, id('list')]],
    // [branchFacts, [existFacts, [2, id('list')]]],
    // [log, ['c', id('list'), s1]],
    [exists, [3, id('list')]],
    // [log, ['d']],
    // [log, ['hi']],
    // [match, [id('yes'), [yes]]],
    // id('yes'),
    [log, ['exists =', id('list')]],
]], FALSE);
{
    const [list, _1, _2, _3, _4, _5, _6] = 'list, _1, _2, _3, _4, _5, _6'.split(', ').map(id);
    call({}, [block, [
        [branchFacts, [existFacts, [1, list]]],
        [branchFacts, [existFacts, [2, list]]],
        [branchFacts, [existFacts, [3, list]]],
        [log, ['branchFacts + existFacts =', list]],
    ]], FALSE);
}
{
    const [list, _1, _2, _3, _4, _5, _6] = 'list, _1, _2, _3, _4, _5, _6'.split(', ').map(id);
    call({}, [block, [
        [branch, [
            [match, [[1, _1, _2], list]],
            [match, [[_1, 1, _2], list]],
            [match, [[_1, _2, 1], list]],
        ]],
        [branch, [
            [match, [[2, _3, _4], list]],
            [match, [[_3, 2, _4], list]],
            [match, [[_3, _4, 2], list]],
        ]],
        [branch, [
            [match, [[3, _5, _6], list]],
            [match, [[_5, 3, _6], list]],
            [match, [[_5, _6, 3], list]],
        ]],
        [log, ['branch + match =', list]],
    ]], FALSE);
}
// call({}, [match, []], FALSE);
