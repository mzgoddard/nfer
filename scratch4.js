const CANCEL = 0;

function block(...statements) {
    let i = 0;
    let again = [];
    const cancel = () => {
        for (; i >= 0; i--) {
            if (again[i]) again[i].cancel();
        }
        return CANCEL;
    };
    const next = () => {
        while (i >= 0 && i < statements.length) {
            again[i] = call(statements[i], again[i]);
            if (again[i] === CANCEL) return cancel();
            i += again[i] ? 1 : -1;
        }
        if (i >= 0) i--;
        return i === statements.length ? next : false;
    };
    next.cancel = cancel;
    return next;
}

function branch(...branches) {
    let i = 0;
    let again = null;
    const cancel = () => {
        if (again) again.cancel();
        again = null;
        return CANCEL;
    };
    const next = () => {
        for (; i < branches.length; i++) {
            again = call(branches[i], again);
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

class Address {
    constructor(name, scope) {
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

const readAddress = (arg, scope) => {
    if (arg instanceof Id) {
        const address = readAddress(scope[arg.name], scope);
        if (typeof address === 'undefined') return new Address(arg.name, scope);
        return address;
    } else if (arg instanceof Address) {
        if (arg.value instanceof Address) return readAddress(arg.value, scope);
        return arg;
    }
    return arg;
};

const read = (arg, scope) => {
    const address = readAddress(scope[arg.name], scope);
    return address instanceof Address ? address.value : address;
};

function bindAddress(left, right) {
    const next = () => {
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

function bind(left, right, leftScope, rightScope) {
    const next = () => {
        left = readAddress(left, leftScope);
        right = readAddress(right, rightScope);

        if (left instanceof Address) {
            if (typeof left.value === 'undefined') {
                return bindAddress(left, right)();
            }
            left = left.value;
        }
        if (right instanceof Address) {
            if (typeof right.value === 'undefined') {
                return bindAddress(right, left)();
            }
            right = right.value;
        }

        return left === right ? NO : false;
    };
    next.cancel = NO.cancel;
    return next;
}

let _scope = null;

function guardScope(callScope, scope, body) {
    const next = () => call(read(callScope, scope), body);
    next.cancel = NO.cancel;
    return next;
}

function bindFactIndices(callScope, args, params, scope, paramsScope) {
    const next = () => {
        params = read(callScope, params);
        scope = read(callScope, scope);
        paramsScope = read(callScope, paramsScope);
        if (args.length > params.length) return false;
        for (let i = 0; i < args.length; i++) {
            scope[args[i].name] = readAddress(callScope, params[i]);
        }
        return () => {
            for (let i = 0; i < args.length; i++) {
                scope[args[i].name] = undefined;
            }
            return false;
        };
    };
    next.cancel = () => {
        for (let i = 0; i < args.length; i++) {
            scope[args[i].name] = undefined;
        }
        return CANCEL;
    };
    return next;
}

function bindFactKeys(callScope, [args], params, scope, paramsScope) {
    const next = () => {
        [params] = read(callScope, params);
        scope = read(callScope, scope);
        paramsScope = read(callScope, paramsScope);
        for (const key in args) if (!(key in params)) return false;
        for (const key in args) {
            scope[args[key].name] = readAddress(callScope, params[key]);
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

function fact(args, body) {
    if (!body) {
        body = yes;
    }
    let bindArgs;
    if (Array.isArray(args) && args.every(arg => arg instanceof Id)) {
        bindArgs = bindFactIndices;
    } else if (Object.values(args[0]).every(arg => arg instanceof Id)) {
        bindArgs = bindFactKeys;
    } else {
        bindArgs = match;
    }
    const [params, scope, paramsScope] = ['params', 'scope', 'paramsScope'].map(id);
    body = [block, [
        [bindArgs, [args, params, scope, paramsScope]],
        [guardScope, [scope, body]],
    ]];
    return function(callScope, ...params) {
        const scope = {};
        return block({
            params,
            scope,
            paramsScope,
        }, ...body);
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

const CUT = Object.assign(() => CANCEL, {cancel: () => CANCEL});
const cut = () => CUT;

function matchArray(left, right, leftScope, rightScope) {
    let i = 0;
    const again = [];
    const cancel = () => {
        for (; i >= 0; i--) {
            if (again[i]) again[i].cancel();
        }
        return CANCEL;
    };
    const next = () => {
        left = read(left);
        right = read(right);

        if (Array.isArray(left) && Array.isArray(right) && left.length === right.length) {
            return block(left.map((_, i) => [match, [left[i], right[i], leftScope, rightScope]]))();
            while (i >= 0 && i < left.length) {
                again[i] = call([match, [left[i], right[i], leftScope, rightScope]], again[i]);
                i += again[i] ? 1 : -1;
            }
            i -= 1;
            return i >= 0;
        }

        return false;
    };
    next.cancel = cancel;
    return next;
}

const match = (() => {
    const [left, right, leftScope, rightScope] = ['left', 'right', 'leftScope', 'rightScope'].map(id);
    return [[left, right, leftScope, rightScope], [block, [
        [branch, [
            [bind, [left, right, leftScope, rightScope]],
            [matchArray, [left, right, leftScope, rightScope]],
            [matchObject, [left, right, leftScope, rightScope]],
        ]],
        [cut, []],
    ]]];
})();
