type Scope = {[key: string]: any};
type AddressableObject = any[] | {[key: string]: any};
type Addressable = string | AddressableObject;
type Primitive = boolean | number | string | symbol | ((...args: any[]) => any);

type FactShape<Args extends any[] = any[], Body = CallShape> = [Args] | [Args, Body];
type MakeOp<Args extends any[] = any[]> = FactShape<Args> | ((scope: Scope, ...args: Args) => Op);
type CallShape<Args extends any[] = any[]> = [MakeOp<Args>, Args] | ((scope: Scope) => Op);

const CANCEL: 0 = 0;
type CANCEL = typeof CANCEL;
const FALSE: false = false;
type FALSE = typeof FALSE;

type OpResult = Op | FALSE | CANCEL;
interface Op {
    next(): OpResult;
    cancel(): CANCEL;
}

class True implements Op {
    next() {
        return FALSE;
    }
    cancel() {
        return CANCEL;
    }
}

const TRUE = new True();

class Yes implements Op {
    next() {
        return TRUE;
    }
    cancel() {
        return CANCEL;
    }
}
class No implements Op {
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

class CancelNext implements Op {
    next() {
        return CANCEL;
    }
    cancel() {
        return CANCEL;
    }
}

const CANCEL_NEXT = new CancelNext();

class Cut implements Op {
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

enum AsapType {
    Value,
    Error,
    Promise,
};

class Asap<T = any> {
    _type: AsapType;
    value: Promise<Asap<T>> | T | Error;
    constructor(value: Promise<Asap<T> | T> | T | Error, _type: AsapType) {
        if (typeof _type === 'undefined') {
            if (value && 'then' in value) {
                _type = AsapType.Promise;
            } else if (value instanceof Error) {
                _type = AsapType.Error;
            } else {
                _type = AsapType.Value;
            }
        }
        this._type = _type;
        if (_type === AsapType.Promise) {
            this.value = Promise.resolve(value as Promise<Asap<T> | T>).then(Asap.create);
        } else {
            this.value = value as (Error | T);
        }
    }
    map<U>(value: (value: T) => Promise<U> | U, error: (error: Error) => Promise<U> | U): Asap<U> {
        if (this._type === AsapType.Value) return Asap.create(value(this.value as T));
        else if (this._type === AsapType.Promise) return Asap.create((this.value as Promise<Asap<T>>)
            .then(inner => inner.map(value, error), error));
        return Asap.create(error(this.value as Error));
    }
    unwrap(): Promise<T> | T {
        if (this._type === AsapType.Value) return this.value as T;
        else if (this._type === AsapType.Promise) return (this.value as Promise<Asap<T>>).then(inner => inner.unwrap());
        throw this.value;
    }
    static create<T>(value: Promise<Asap<T> | T> | Asap<T> | T | Error): Asap<T> {
        if (value instanceof Asap) return value;
        else if (value && 'then' in value) {
            return new Asap(value.then(Asap.create, Asap.create), AsapType.Promise);
        } else if (value instanceof Error) {
            return new Asap<T>(value, AsapType.Error);
        } else {
            return new Asap(value, AsapType.Value);
        }
    }
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

class UnbindAddress implements Op {
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

function bindAddress(addr: Address<string>, value: Address | Primitive, binds: Op[]) {
    const addrValue = addr.scope[addr.name];
    if (typeof addrValue === 'undefined') {
        addr.scope[addr.name] = value;
        binds.push(new UnbindAddress(addr));
        return true;
    }
    if (value instanceof Address) {
        if (typeof value.name === 'string') {
            const valueValue = value.scope[value.name];
            if (typeof valueValue === 'undefined') {
                value.scope[value.name] = addrValue;
                binds.push(new UnbindAddress(value as Address<string>));
                return true;
            }
            value = valueValue;
        } else {
            return false;
        }
    }
    return addrValue === value;
}

function _match(left: any, right: any, leftScope: Scope, rightScope: Scope, binds: Op[]) {
    const _left = readId(leftScope, left);
    const _right = readId(rightScope, right);
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

class Match implements Op {
    scope: Scope;
    left: any;
    right: any;
    binds: Op[] = null;
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
    function callOne(scope: Scope, [makeOp, args]: [(scope: Scope, ...args: any[]) => Op, any[]], fn: (name: string, scope: Scope) => void) {
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

class Fact implements Op {
    scope: Scope = {};
    args: any[];
    body: CallShape;
    paramsScope: Scope;
    params: any[];
    match: Op | FALSE | CANCEL = null;
    repeat: Op | FALSE | CANCEL = null;
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

function call(scope: Scope, callShape: CallShape, repeat: Op | FALSE | CANCEL) {
    if (!repeat) {
        if (Array.isArray(callShape)) {
            const [makeOp, params] = callShape;
            if (Array.isArray(makeOp)) {
                const [args, body] = makeOp;
                repeat = fact(args, body)(scope, ...params);
            } else {
                repeat = makeOp(scope, ...params);
            }
        } else {
            repeat = callShape(scope);
        }
    }
    if (repeat) return repeat.next();
    return FALSE;
}

class Block implements Op {
    scope: Scope;
    statements: CallShape[];

    i: number = 0;
    repeat: OpResult[] = [];
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

class Branch implements Op {
    scope: Scope;
    branches: CallShape[];

    i: number = 0;
    repeat: OpResult;
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

class BranchFacts implements Op {
    scope: Scope;
    facts: FactShape[];
    params: any[];

    i: number = 0;
    repeat: OpResult;
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

class Log implements Op {
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

function inspect(scope, arg) {
    if (arg instanceof Id) {
        const value = scope[arg.name];
        if (typeof value === 'undefined') {
            return arg;
        }
        return inspect(scope, value);
    } else if (arg instanceof Address) {
        if (typeof arg.name === 'string') {
            const value = arg.scope[arg.name];
            if (typeof value === 'undefined') {
                return arg;
            }
            return inspect(arg.scope, arg.scope[arg.name]);
        }
        return inspect(arg.scope, arg.name);
    } else if (arg && typeof arg === 'object') {
        if (Array.isArray(arg)) {
            return arg.map(item => inspect(scope, item));
        } else {
            const o = {};
            for (const key in arg) {
                o[key] = inspect(scope, arg[key]);
            }
            return o;
        }
    }
    return arg;
}

function log(scope, ...params) {
    return new Log(scope, params);
}

const existFacts = [
    [[id('item'), [id('item'), id('_1'), id('_2')]]],
    [[id('item'), [id('_1'), id('item'), id('_2')]]],
    [[id('item'), [id('_1'), id('_2'), id('item')]]],
];

const exists = [id('params'), [block, [[branchFacts, [existFacts, id('params')]]]]];

call({}, [block, [
    [exists, [[1, 0, id('_1')], id('list')]],
    [exists, [[id('_2'), 0, 0], id('list')]],
    [branchFacts, [existFacts, [[0, 2, id('_3')], id('list')]]],
    [branchFacts, [existFacts, [[id('_4'), 2, 0], id('list')]]],
    [branchFacts, [existFacts, [[0, 0, id('_5')], id('list')]]],
    [branchFacts, [existFacts, [[id('_6'), 0, 3], id('list')]]],
    [log, ['list', id('list')]],
]], FALSE);

const s1 = {};
call(s1, [block, [
    // [log, ['a']],
    [exists, [1, id('list')]],
    // [log, ['b', id('list'), s1]],
    [exists, [2, id('list')]],
    // [log, ['c', id('list'), s1]],
    [exists, [3, id('list')]],
    // [log, ['d']],
    // [log, ['hi']],
    // [match, [id('yes'), [yes]]],
    // id('yes'),
    [log, ['yes', id('list')]],
]], FALSE);



// call({}, [match, []], FALSE);
