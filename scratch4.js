import { Z_BEST_COMPRESSION } from "zlib";
import { isNamespaceExportDeclaration } from "typescript";

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

const YES = Object.assign(() => true, {cancel: () => CANCEL});
const yes = () => YES;

const NO = Object.assign(() => false, {cancel: () => CANCEL});
const no = () => NO;

function fact(args, body) {
    args = read(args);
    body = read(body);
    const [params, scope, callScope] = ['params', 'scope', 'callScope'].map(id);
    if (body) {
        body = [block, [
            [pushScope, [scope]],
            body,
            [popScope, []],
        ]];
    } else {
        body = yes;
    }
    if (Array.isArray(args) && args.every(arg => arg instanceof Id)) {
        args = [bindIndices, [args, params, scope, callScope]];
    } else if (Object.values(args).every(arg => arg instanceof Id)) {
        args = [bindKeys, [args, params, scope, callScope]];
    } else {
        args = [match, [args, params, scope, callScope]];
    }
    return function(...params) {
        const wrappedScope = {
            params,
            scope: {},
            callScope: _scope,
        };
        return [block, [
            [pushScope, [wrappedScope]],
            wrappedBody,
            [popScope, []],
        ]];
    };
}

function call(expr, next) {
    if (typeof next !== 'function') {
        if (typeof expr === 'function') next = expr();
        else if (Array.isArray(expr)) {
            let [method, params] = expr;
            if (Array.isArray(method)) method = fact(...method);
            if (typeof method === 'function') next = method(...params);
        }
    }
    if (typeof next === 'function') return next();
    return false;
}

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
        [cut],
    ]]];
})();
