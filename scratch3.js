import { bind } from ".";

function block(...statements) {
    let i = 0;
    let cont = [];
    const next = () => {
        while (i >= 0 && i < statements.length) {
            const check = cont[i] = call(statements[i], cont[i]);
            i += check === false ? -1 : 1;
        }
        i--;
        return i >= 0 ? next : false;
    };
    return next;
}

function branch(...branches) {
    let i = 0;
    let again = null;
    const next = () => {
        for (; i < branches.length; i++) {
            again = call(branches[i], again);
            if (again === false) continue;
            return next;
        }
        return false;
    };
    return next;
}

class Id {
    constructor(name) {
        this.name = name;
    }
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
    return () => {
        left.value = right;
        return () => {
            left.value = undefined;
            return false;
        };
    };
}

function bind(left, right, leftScope, rightScope) {
    return () => {
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

        return left === right ? (() => false) : false;
    };
}

function bindArgs(args, params, argScope, paramScope) {
    return block(...args.map((arg, i) => [bind, [arg, params[i], argScope, paramScope]]));
}

let _scope = {};

function setScope(enter, exit) {
    return () => {
        _scope = enter;
        return () => {
            _scope = exit;
            return false;
        };
    };
}

function fact(args, body, params) {
    const scope = _scope;
    args = read(args, scope);
    body = read(body, scope);
    params = read(params, scope);
    if (Array.isArray(args) && Array.isArray(params) && args.length === params.length) {
        const scope = {};
        if (args.every(arg => arg instanceof Id)) {
            return block(
                [bindArgs, [args, params]],
                [setScope, [scope, _scope]],
                body,
                [setScope, [_scope, scope]],
            );
        } else {
            return block(
                [match, [args, params]],
                [setScope, [scope, _scope]],
                body,
                [setScope, [_scope, scope]],
            );
        }
    } else {
        throw new Error();
    }
}

function call(statement, next) {
    if (typeof next !== 'undefined') return next();
    if (Array.isArray(statement)) {
        const [method, params] = statement;
        if (Array.isArray(method)) {
            const [args, body] = method;
            return fact(args, body, params)();
        } else if (typeof method === 'function') {
            return method(...params)();
        } else {
            throw new Error();
        }
    } else if (typeof statement === 'function') {
        return statement();
    } else {
        throw new Error();
    }
}
