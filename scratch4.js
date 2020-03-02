const CANCEL = 0;

class Block {
    constructor(scope, statements) {
        this.scope = scope;
        this.statements = statements;
        this.i = 0;
        this.again = [];
        this.cancel = this.cancel.bind(this);
        this.next = this.next.bind(this);
        this.next.cancel = this.cancel;
    }
    next() {
        if (this.i === this.statements.length) this.i--;
        while (this.i >= 0 && this.i < this.statements.length) {
            this.again[this.i] = call(this.scope, this.statements[this.i], this.again[this.i]);
            // console.log(id, 'block', i, again[i]);
            if (this.again[this.i] === CANCEL) return this.cancel();
            this.i += this.again[this.i] ? 1 : -1;
        }
        return this.i === this.statements.length ? this.next : false;
    }
    cancel() {
        for (; this.i >= 0; this.i--) {
            if (this.again[this.i]) this.again[this.i].cancel();
        }
        return CANCEL;
    }
}

function block(scope, ...statements) {
    return new Block(scope, statements).next;
    let id = Math.random().toString(16).substring(2, 7);
    let i = 0;
    let again = [];
    const cancel = () => {
        for (; i >= 0; i--) {
            if (again[i]) again[i].cancel();
        }
        return CANCEL;
    };
    const next = () => {
        if (i === statements.length) i--;
        while (i >= 0 && i < statements.length) {
            again[i] = call(scope, statements[i], again[i]);
            // console.log(id, 'block', i, again[i]);
            if (again[i] === CANCEL) return cancel();
            i += again[i] ? 1 : -1;
        }
        return i === statements.length ? next : false;
    };
    next.cancel = cancel;
    return next;
}

function branch(scope, ...branches) {
    let i = 0;
    let again = null;
    const cancel = () => {
        if (again) again.cancel();
        again = null;
        return CANCEL;
    };
    const next = () => {
        for (; i < branches.length; i++) {
            again = call(scope, branches[i], again);
            if (again === CANCEL) return cancel();
            if (again) return next;
        }
        return false;
    };
    next.cancel = cancel;
    return next;
}

const NO = Object.assign(() => false, {cancel: () => CANCEL});
const no = () => NO;

const YES = Object.assign(() => NO, {cancel: () => CANCEL});
const yes = () => YES;

class Id {
    constructor(name) {
        this.name = name;
    }
}

function id(name) {
    return new Id(name);
}

const _ = new Id();

class Address {
    constructor(scope, name) {
        this.name = name || (Address.nextId++).toString();
        this.scope = scope;
    }

    get value() {
        return this.scope[this.name];
    }
    set value(value) {
        this.scope[this.name] = value;
    }
}

Address.nextId = 0;

class ObjectAddress extends Address {
    get value() {
        return null;
    }
    set value(value) {}
}

class AnonymousAddress extends Address {
    constructor(scope = null, name = '_') {
        super(scope, name);
        this._value = undefined;
    }

    get value() {
        return this._value;
    }
    set value(value) {
        this._value = value;
    }
}

const readId = (scope, name) => {
    const id = scope[name];
    if (typeof id === 'undefined') {
        return new Address(scope, name);
    }
    return readAddress(scope, id);
};

const readAddress = (scope, arg) => {
    if (arg instanceof Id) {
        return readId(scope, arg.name);
    } else if (arg instanceof Address && arg.value instanceof Address) {
        return readAddress(scope, arg.value);
    // } else if (typeof arg === 'undefined') {
    //     return new AnonymousAddress();
    } else if (arg && typeof arg === 'object') {

    }
    return arg;
};

const read = (scope, arg) => {
    const address = readAddress(scope, arg);
    return address instanceof Address ? address.value : address;
};

function bindAddress(scope, left, right) {
    const next = () => {
        console.log('bindAddress', left, right);
        if (right && typeof right === 'object' && !(right instanceof Address)) {
            right = new ObjectAddress(scope, right);
        }
        left.value = right;
        const next = () => {
            left.value = undefined;
            return false;
        };
        next.cancel = () => {
            left.value = undefined;
            return CANCEL;
        };
        return next;
    };
    next.cancel = NO.cancel;
    return next;

}

function bind(scope, left, right, leftScope, rightScope) {
    const next = () => {
        leftScope = leftScope ? read(scope, leftScope) : scope;
        rightScope = leftScope ? read(scope, rightScope) : scope;
        left = readAddress(leftScope, left);
        right = readAddress(rightScope, right);
        if (left instanceof ObjectAddress) {
            ({name: left, scope: leftScope} = left);
        }
        if (right instanceof ObjectAddress) {
            ({name: right, scope: rightScope} = right);
        }

        console.log('bind', left, right);

        // console.log(left, right);

        if (left instanceof Address) {
            if (typeof left.value === 'undefined') {
                return bindAddress(rightScope, left, right)();
            }
            if (!left || typeof left !== 'object') {
                left = left.value;
            }
        } else if (left && typeof left === 'object') {
            left = new ObjectAddress(leftScope, left);
        }
        if (right instanceof Address) {
            if (typeof right.value === 'undefined') {
                return bindAddress(leftScope, right, left)();
            }
            if (!right || typeof right !== 'object') {
                right = right.value;
            }
        } else if (right && typeof right === 'object') {
            right = new ObjectAddress(rightScope, right);
        }

        // console.log(left, right);

        return left === right ? NO : false;
    };
    next.cancel = YES.cancel;
    return next;
}

function guardScope(callScope, scope, body) {
    const next = () => call(callScope.scope, body);
    next.cancel = NO.cancel;
    return next;
}

function bindFactIndices(callScope, args, params, scope, paramsScope) {
    const next = () => {
        // console.log(args);
        args = readAddress(callScope, args);
        // console.log(callScope, args);
        if (args instanceof Address) ({name: args, scope} = args);
        params = readAddress(callScope, params);
        if (params instanceof Address) ({name: params, scope: paramsScope} = params);
        console.log(callScope, args, params, scope, paramsScope);
        // params = read(callScope, params);
        // scope = read(callScope, scope);
        // paramsScope = read(callScope, paramsScope);
        if (args.length > params.length) return false;
        for (let i = 0; i < args.length; i++) {
            let addr = readAddress(paramsScope, params[i]);
            if (addr && typeof addr !== 'object' && !(addr instanceof Address)) {
                addr = new ObjectAddress(paramsScope, params[i]);
            }
            scope[args[i].name] = addr;
        }
        console.log(scope);
        const next = () => {
            for (let i = 0; i < args.length; i++) {
                scope[args[i].name] = undefined;
            }
            return false;
        };
        next.cancel = NO.cancel;
        return next;
    };
    next.cancel = () => {
        for (let i = 0; i < args.length; i++) {
            scope[args[i].name] = undefined;
        }
        return CANCEL;
    };
    return next;
}

function bindFactKeys(callScope, args, params, scope, paramsScope) {
    const next = () => {
        args = read(callScope, args);
        if (args instanceof ObjectAddress) ({name: args, scope: scope} = args);
        params = read(callScope, params);
        if (params instanceof ObjectAddress) ({name: params, scope: paramsScope} = params);
        // scope = read(callScope, scope);
        // paramsScope = read(callScope, paramsScope);
        for (const key in args) if (!(key in params)) return false;
        for (const key in args) {
            scope[args[key].name] = readAddress(paramsScope, params[key]);
        }
        return () => {
            for (const key in args) {
                scope[args[key].name] = undefined;
            }
            return false;
        };
    };
    next.cancel = () => {
        for (const key in args) {
            scope[args[key].name] = undefined;
        }
        return CANCEL;
    };
    return next;
}

function cutPoint(scope, body) {
    let again;
    const next = () => {
        again = call(scope, body, again);
        if (again === false || again === CANCEL) return false;
        return next;
    };
    next.cancel = () => {
        if (again) again.cancel();
        return CANCEL;
    };
    return next;
}

function fact(args, body) {
    if (!body) body = yes;

    let bindArgs;
    if (Array.isArray(args) && args.every(arg => arg instanceof Id)) {
        bindArgs = bindFactIndices;
    } else if (Object.values(args[0]).every(arg => arg instanceof Id)) {
        bindArgs = bindFactKeys;
    } else {
        bindArgs = match;
    }

    const [argsId, params, scope, paramsScope] = ['args', 'params', 'scope', 'paramsScope'].map(id);
    body = [block, [
        [bindArgs, [argsId, params, null, null]],
        [guardScope, [scope, body]],
    ]];

    return function(paramsScope, ...params) {
        const scope = {};
        return cutPoint({
            args: new ObjectAddress(scope, args),
            params: new ObjectAddress(paramsScope, params),
            scope,
            // paramsScope,
        }, body);
    };
}

function call(callScope, expr, next) {
    if (typeof next !== 'function') {
        if (typeof expr === 'function') next = expr(callScope);
        else if (Array.isArray(expr)) {
            let [method, params] = expr;
            if (Array.isArray(method)) method = fact(...method);
            if (typeof method === 'function') next = method(callScope, ...params);
        }
    }
    if (typeof next === 'function') return next();
    return false;
}

function callCancel(next) {
    if (next && next.cancel) next.cancel();
    return CANCEL;
}

const CUT0 = Object.assign(() => CANCEL, {cancel: () => CANCEL});
const CUT = Object.assign(() => CUT0, {cancel: () => CANCEL});
const cut = () => CUT;

function _match(scope, left, right, leftScope, rightScope, binds) {
    console.log('_match', left, right, leftScope, rightScope);
    const bound = bind(scope, left, right, leftScope, rightScope)();
    if (bound) {
        binds.push(bound);
        return true;
    }

    left = readAddress(leftScope, left);
    right = readAddress(rightScope, right);
    if (left instanceof Address) {
        ({name: left, scope: leftScope} = left);
    }
    if (right instanceof Address) {
        ({name: right, scope: rightScope} = right);
    }

    if (Array.isArray(left)) {
        if (Array.isArray(right) && left.length === right.length) {
            for (let i = 0; i < left.length; i++) {
                if (!_match(scope, left[i], right[i], leftScope, rightScope, binds)) {
                    return false;
                }
            }
            return true;
        }
    } else if (left && typeof left === 'object') {
        if (right && typeof right === 'object') {
            for (const key in left) {
                if (!(key in right)) return false;
                if (!_match(scope, left[key], right[key], leftScope, rightScope, binds)) {
                    return false;
                }
            }
            return true;
        }
    }

    return false;
}

function match(scope, left, right, leftScope, rightScope) {
    let binds = null;
    let cancel = NO.cancel;
    const next = () => {
        // const bound = bind(scope, left, right, leftScope, rightScope)();
        // if (bound) return bound;

        leftScope = leftScope ? read(scope, leftScope) : scope;
        rightScope = rightScope ? read(scope, rightScope) : scope;
        left = readAddress(scope, left);
        right = readAddress(scope, right);
        if (left instanceof Address) {
            ({name: left, scope: leftScope} = left);
        }
        if (right instanceof Address) {
            ({name: right, scope: rightScope} = right);
        }

        binds = [];
        cancel = next.cancel = () => {
            for (let i = binds.length - 1; i >= 0; i--) {
                binds[i].cancel();
            }
            return CANCEL;
        };
        if (!_match(scope, left, right, leftScope, rightScope, binds)) {
            cancel();
            return false;
        }

        const _next = () => {
            cancel();
            return false;
        };
        _next.cancel = cancel;
        return _next;
    };
    next.cancel = NO.cancel;
    return next;
}

function readJSON(scope, arg) {
    let value = readAddress(scope, arg);
    if (value instanceof ObjectAddress) {
        ({name: value, scope} = value);
    } else if (value instanceof Address) {
        value = value.value;
    }
    if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
            return value.map(arg => readJSON(scope, arg));
        }
        const o = {};
        for (const key in value) {
            o[key] = readJSON(scope, value[key]);
        }
        return o;
    }
    return value;
}

function json(scope, object, string) {

}

function log(scope, ...info) {
    const next = () => {
        console.log(...info);
        console.log(...info.map(arg => readJSON(scope, arg)));
        return NO;
    };
    next.cancel = YES.cancel;
    return next;
}

{
    call({}, [log, [1]]);
    call({key: 2}, [log, [id('key')]]);
    call({}, [block, [
        [log, [1]],
        [log, [2]],
        [log, [3]],
        [log, [4]],
    ]]);
    call({a: 1, b: 2}, [log, [{c: id('a'), d: id('b')}]]);
    call({c: 3}, [[[id('a'), id('b')], [log, [id('a'), id('b')]]], [1, id('c')]]);
    const factA = fact(...[['a'], [yes, []]]);
    call({b: undefined}, [block, [
        [log, ['log', id('b')]],
        [factA, [id('b')]],
        [log, ['log', id('b')]],
    ]]);
    call({}, [[[id('a'), id('b')], [log, [id('b'), id('a')]]], [1, 2]]);
    call({}, [block, [
        [[[{a: 1, b: 2}], [yes, []]], [{a: id('c'), b: _}]],
        [log, [id('c'), id('d')]],
    ]]);
    call({}, [block, [
        [[[], [block, [
            [branch, [
                [bind, [id('i'), 1]],
                [bind, [id('i'), 2]],
                [cut, []],
                [bind, [id('i'), 3]],
                [bind, [id('i'), 4]],
            ]],
            [log, [id('i')]],
            [no, []],
        ]]], []],
        [log, ['cut']],
    ]]);
    const s0 = {};
    call(s0, [block, [
        [[[id('i')], [block, [
            [log, [id('i'), s0]],
            [branch, [
                [bind, [id('i'), 1]],
                [block, [
                    [bind, [id('i'), 2]],
                    [cut, []]
                ]],
                [bind, [id('i'), 3]],
                [bind, [id('i'), 4]],
            ]],
            [log, [id('i'), s0]],
        ]]], [id('a')]],
        [log, ['cut', id('a'), s0]],
        [no, []],
    ]]);
    const exist0 = [[id('a'), [id('a'), id(1), id(2)]], [log, ['a', id('a')]]];
    const exist1 = [[id('a'), [id(1), id('a'), id(2)]]];
    const exist2 = [[id('a'), [id(1), id(2), id('a')]]];
    const exists = [[id('a'), id('list')], [branch, [
        [exist0, [id('a'), id('list')]],
        [exist1, [id('a'), id('list')]],
        [exist2, [id('a'), id('list')]],
        // (scope) => match(scope, id('list'), [new Address('a', scope), _, _]),
        // (scope) => match(scope, id('list'), [_, new Address('a', scope), _]),
        // (scope) => match(scope, id('list'), [_, _, new Address('a', scope)]),
    ]]];
    const s1 = {};
    call(s1, [block, [
        [log, [0]],
        [exists, [[id('d'), 0, 0], id('list')]],
        [log, [1, 'list', id('list'), s1]],
        [exists, [[1, 2, 0], id('list')]],
        [log, [2, 'list', id('list'), s1]],
        [exists, [[1, 2, 3], id('list')]],
        [log, [3, 'list', id('d'), id('list'), s1]],
    ]]);
}

console.log('EOF');
