import { threadId } from "worker_threads";
import { Address } from ".";
import { forEachChild } from "typescript";

// const match = {
// 	description: {
// 		hierarchy: {contents: select.member(
// 			{type: "Scroller", contents: [
// 				{contents: select.member(
// 					{contents: [
// 						{string: select.key("label")},
// 					]},
// 				)},
// 			]},
// 		)},
// 	},
// }
// select.block(
// 	[select, [described, {description: {hierarchy: {contents: [{contents: [{contents: scrollerContents}]}]}}}]],
// 	[member, [{contents: [{string: label}]}, scrollerContents]],
// 	[branch, [[block, [[select, [label, oldLabel]], [false], [cut]], [true]]]],
// )

// function* block(...statements) {
//     for (let i = 0; i > 0 && i <= statements.length; i += (yield statements[i]) ? 1 : -1)
//     if (i === statements.length)
//     if ((yield true) === false) return false;
//     else i--;
// }

function block(...statements) {
    let state = 2;
    let index = 0;
    return {
        next(forward) {
            switch (state) {
                case 0:
                    if (forward === false) {
                        state = 3;
                        return {done: true};
                    }
                    forward = false;
                case 1:
                    index += forward ? 1 : -1;
                case 2:
                    forward = index >= 0 && index <= statements.length;
                    if (index === statements.length) {
                        state = 0;
                        return {value: true};
                    } else if (forward !== false) {
                        state = 1;
                        return {value: statements[index]};
                    }
                    state = 3;
                case 3:
                    return {done: true};
            }
        }
    }
}

// function* branch(...branches) {
//     for (const branch of branches)
//     while (yield branch)
//     if ((yield true) === false) return;
// }

function branch(...branches) {
    let state = 1;
    let branchIndex = -1;
    return {
        next(forward) {
            switch (state) {
                case 0:
                    if (forward) {
                        state = 1;
                        return {value: true};
                    }
                    branchIndex += 1;
                    forward = branchIndex >= branches.length;
                case 1:
                    if (forward !== false) {
                        state = 0;
                        return {value: branches[branchIndex]};
                    }
                    state = 2;
                case 2:
                    return {done: true};
            }
        },
    };
}

const REPLACE = -2;
const UNWIND = -1;
const RETURN_FALSE = 0;
const RETURN_TRUE = 1;
const PUSH_FIRST = 2;
const PUSH_REPEAT = 3;

function branc(...branches) {
    let i = 0;
    return {
        next(status) {
            switch (status) {
            case RETURN_FALSE:
                i += 1;

            case PUSH_FIRST:
            case PUSH_REPEAT:
                if (i >= branches.length) return RETURN_FALSE;
                return branches[i];

            case RETURN_TRUE:
                return RETURN_TRUE;

            default:
                return UNWIND;
            }
        }
    }
}

function bloc(...statements) {
    let i = 0;
    return {
        next(status) {
            switch (status) {
            case PUSH_REPEAT:
            case RETURN_FALSE:
            case RETURN_TRUE:
                i += status === RETURN_TRUE ? 1 : -1;

            case PUSH_FIRST:
                if (i < 0) return RETURN_FALSE;
                if (i === statements.length) return RETURN_TRUE;
                return statements[i];

            default:
                return UNWIND;
            }
        }
    }
}

class Frame {
    constructor(cell, parent = null, sibling = null, child = null) {
        this.cell = cell;
        this.tailOf = cell;
        this.parent = parent;
        this.sibling = sibling;
        this.child = child;
    }

    up() { return this.parent; }
    down() { return this.child; }
    bottom() { return this.child ? this.child.bottom() : this; }
    push(cell) {
        if (this.child && this.child.tailOf === cell) return this.down();
        return this.child = new Frame(cell, this, this.child, null);
    }
    pop() {
        if (this.child) throw new Error();
        if (this.parent) this.parent.child = this.sibling;
        return this.parent;
    }
}

class FrameView {
    constructor(frame = new Frame(null)) {
        this.frame = frame;
    }

    get cell() {
        return this.frame.cell;
    }
    set cell(cell) {
        this.frame.cell = cell;
    }

    get tailOf() {
        return this.frame.tailOf;
    }

    get parent() {
        return this.frame.parent;
    }

    get sibling() {
        return this.frame.sibling;
    }

    get child() {
        return this.frame.child;
    }

    up() {
        this.frame = this.frame.up();
        return this;
    }
    down() {
        this.frame = this.frame.down();
        return this;
    }
    bottom() {
        this.frame = this.frame.bottom();
        return this;
    }
    push(cell) {
        this.frame = this.frame.push(cell);
        return this;
    }
    pop() {
        this.frame = this.frame.pop();
        return this;
    }
}

class Id {
    constructor(name) {
        this.name = name;
    }

    static create(name) {
        return new Id(name);
    }
}

const id = Id.create;

class Address {
    constructor(id, scope) {
        this.id = id;
        this.scope = scope;
    }

    get value() {
        return this.scope[this.id.name];
    }
    set value(value) {
        this.scope[this.id.name] = value;
    }

    is(other) {
        return this.id === other.id && this.scope === other.scope;
    }
}

function read(arg, scope) {
    if (arg instanceof Id) {
        return read((scope || Thread.scope)[arg.name], scope);
    } else if (arg instanceof Address) {
        return read(arg.value, scope);
    }
    return arg;
}

function readAddress(arg, scope) {
    if (arg instanceof Id) {
        const address = readAddress((scope || Thread.scope)[arg.name], scope);
        if (typeof address === 'undefined') return new Address(arg, scope || Thread.scope);
        return address;
    } else if (arg instanceof Address) {
        if (arg.value instanceof Address) return readAddress(arg.value, scope);
        else return arg;
    }
    return arg;
}

function bindOne(left, right) {
    let state = 0;
    return {
        next() {
            switch (state) {
            case 0:
                left.value = right;
                state = 1;
                return {value: true};
            case 1:
                left.value = undefined;
                state = 2;
            case 2:
                return {done: true};
            }
        },
    };
}

class Primitive {
    next(status) {
        switch (status) {
        case PUSH_FIRST:
            return this.first();
        case PUSH_REPEAT:
            return this.repeat();
        case RETURN_TRUE:
            return this.true();
        case RETURN_FALSE:
            return this.false();
        case UNWIND:
            return this.unwind();
        default:
            return this.default();
        }
    }
    first() {
        return this.default();
    }
    repeat() {
        return this.default();
    }
    true() {
        return this.default();
    }
    false() {
        return this.default();
    }
    unwind() {
        return UNWIND;
    }
    replace() {
        return UNWIND;
    }
    default() {
        return UNWIND;
    }
}

class BindOne extends Primitive {
    constructor(left, right) {
        super();
        this.left = left;
        this.right = right;
    }
    first() {
        this.left.value = this.right;
        return RETURN_TRUE;
    }
    default() {
        if (this.left.value === this.right) this.left.value = undefined;
        return UNWIND;
    }
}

function bindOn(left, right) {
    return new BindOne(left, right);
    return {
        next(status) {
            switch (status) {
            case PUSH_FIRST:
                left.value = right;
                return RETURN_TRUE;
            case RETURN_FALSE:
            case RETURN_TRUE:
            case PUSH_REPEAT:
            case UNWIND:
            default:
                if (left.value === right) left.value = undefined;
                return UNWIND;
            }
        }
    }
}

function bind(left, right, leftScope, rightScope) {
    let state = 0;
    return {
        next() {
            switch (state) {
            case 0:
                left = readAddress(left, leftScope);
                right = readAddress(right, rightScope);

                if (left instanceof Address) {
                    if (typeof left.value === 'undefined') {
                        return {value: bindOne(left, right), done: true};
                    }
                    left = left.value;
                }
                if (right instanceof Address) {
                    if (right.value === 'undefined') {
                        return {value: bindOne(right, left), done: true};
                    }
                    right = right.value;
                }

                state = 1;
                return {value: left === right};

            case 1:
                return {done: true};
            }
        },
    };
}

class Replace extends Primitive {
    constructor(cell) {
        super();
        this.cell = cell;
    }
    replace() {
        return this.cell;
    }
    default() {

    }
}

function replace(cell) {
    return {
        next(status) {
            
        }
    };
}

class Bind extends Replace {
    constructor(left, right, leftScope, rightScope) {
        super(null);
        this.left = left;
        this.right = right;
        this.leftScope = leftScope;
        this.rightScope = rightScope;
    }
    first() {
        let {left, right, leftScope, rightScope} = this;
        left = readAddress(left, leftScope);
        right = readAddress(right, rightScope);

        if (left instanceof Address) {
            if (typeof left.value === 'undefined') {
                this.cell = bindOn(left, right);
                return REPLACE;
            }
            left = left.value;
        }
        if (right instanceof Address) {
            if (right.value === 'undefined') {
                this.cell = bindOn(right, left);
                return REPLACE;
            }
            right = right.value;
        }

        return left === right ? RETURN_TRUE : RETURN_FALSE;
    }
}

function bin(left, right, leftScope, rightScope) {
    return {
        next(status) {
            switch (status) {
            case PUSH_FIRST:
                left = readAddress(left, leftScope);
                right = readAddress(right, rightScope);

                if (left instanceof Address) {
                    if (typeof left.value === 'undefined') {
                        return bindOn(left, right);
                    }
                    left = left.value;
                }
                if (right instanceof Address) {
                    if (right.value === 'undefined') {
                        return bindOn(right, left);
                    }
                    right = right.value;
                }

                return left === right ? RETURN_TRUE : RETURN_FALSE;

            case RETURN_TRUE:
            case RETURN_FALSE:
                return status;

            case PUSH_REPEAT:
            case UNWIND:
            default:
                return UNWIND;
            }
        },
    };
}

function match(left, right, leftScope, rightScope) {
    left = readAddress(left, leftScope);
    right = readAddress(right, rightScope);

    if (left instanceof Address) {
        if (typeof left.value === 'undefined') {
            left.value = right;
            return true;
        }
        left = left.value;
    }
    if (right instanceof Address) {
        if (right.value === 'undefined') {
            right.value = left;
            return true;
        }
        right = right.value;
    }

    if (Object(right) === right) {
        if (Object(left) !== left) return false;
        if (Array.isArray(right)) {
            if (!Array.isArray(left)) return false;
            if (left.length !== right.length) return false;
            return block(...right.map((item, index) => [match, [left[index], right[index]]]));
        }
        const keys = Object.keys(right);
        for (const key of keys) if (!(key in left)) return false;
        for (const key in left) if (!(right.includes(key))) return false;
        return block(...keys.map(key => [match, [left[key], right[key]]]));
    }

    return left === right;
}

const matc = function(left, right, leftScope, rightScope) {
    return branch(
        [block, [
            [bind, [left, right, leftScope, rightScope]],
            [cut],
        ]],
        () => ({
            next(forward) {
                if (forward) {
                    const l = read(left);
                    const r = read(right);

                    if (Object(right) === right) {
                        if (Object(left) !== left) return false;
                        if (Array.isArray(right)) {
                            if (!Array.isArray(left)) return false;
                            if (left.length !== right.length) return false;
                            return block(...right.map((item, index) => [match, [left[index], right[index]]]));
                        }
                        const keys = Object.keys(right);
                        for (const key of keys) if (!(key in left)) return false;
                        for (const key in left) if (!(right.includes(key))) return false;
                        return block(...keys.map(key => [match, [left[key], right[key]]]));
                    }
                }
                return {done: true};
            },
        }),
    );
};

function setScope(scope) {
    let state = 0;
    let lastScope;
    return {
        next() {
            switch (state) {
            case 0:
                lastScope = Thread.scope;
                Thread.scope = scope;
                state = 1;
                return {value: true};
            case 1:
                Thread.scope = lastScope;
                state = 2;
            case 2:
                return {done: true};
            }
        },
    };
}

// a(a, b) :- b(a, b).
// b(a, a).
function callFact([[args, body], params]) {
    const lastScope = Thread.scope;
    const scope = {};
    return Object.assign(block(
        [match, [args, params, scope, lastScope]],
        [setScope, [scope]],
        body,
        [setScope, [lastScope]],
    ), {cutPoint: true});
}

function call(value) {
    if ('next' in value) return value;
    else if (typeof value === 'function') return value();
    else if (Array.isArray(value))
        if (value.length === 1)
            if (Array.isArray(value[0])) return callFact(value);
            else if (typeof value[0] === 'function') return value[0]();
            else throw new Error();
        else if (value.length === 2) return value[0](...value[1]);
        else throw new Error();
    throw new Error();
}

function unwind(state) {
    if (!state.unwind) state.unwind = state.frame.tailOf;
    state.frame.bottom();
}

function stepUnwind(state) {
    if (state.frame.tailOf === state.unwind) {
        state.unwind = null;
        return;
    }

    state.frame.cell.next(false);

    state.frame.pop().bottom();
}

function stepUnwin(state) {
    if (state.frame.tailOf === state.unwind) {
        state.unwind = null;
        return;
    }

    state.frame.cell.next(UNWIND);

    state.frame.pop().bottom();
}

function stepWind(state) {
    const {value, done} = state.frame.cell.next(state.forward);

    state.forward = Boolean(value);
    if (done) {
        if (value === true) throw new Error();
        else if (Object(value) === value) {
            state.frame.cell = call(value);
            unwind(state);
        } else if (!value) {
            state.frame.up();
            unwind(state);
        }
    } else {
        if (Object(value) === value) {
            const child = state.frame.child;
            state.frame.push(value);
            if (state.frame.tailOf !== child.tailOf) {
                state.frame.cell = call(value);
            }
        } else {
            state.frame.up();
            if (!value) unwind(state);
        }
    }
}

function stepWin(state) {
    let status = state.frame.cell.next(state.status);

    switch (status) {
    case UNWIND:
        status = RETURN_FALSE;
    case RETURN_FALSE:
        state.frame.up();
    case REPLACE:
        state.status = status;
        unwind(state);
        return;

    case RETURN_TRUE:
        state.frame.up();
        state.status = status;
        return;
    }

    if (typeof status === 'object' && status !== null || typeof status === 'function') {
        let isFirst = true;
        if (state.status !== REPLACE) {
            const child = state.frame.child;
            state.frame.push(status);
            isFirst = child !== null && state.frame.tailOf !== child.tailOf;
        }
        if (isFirst) state.frame.cell = call(status);
        state.status = isFirst ? PUSH_FIRST : PUSH_REPEAT;
    }
}

function loop(state) {
    while (state.frame.cell) {
        if (state.unwind) stepUnwind(state);
        else stepWind(state);
    }
}

// function select(input, program) {

// }

const bound = function(arg) {
    return {
        next(forward) {
            return forward ? {value: typeof read(arg) !== 'undefined'} : {done: true};
        },
    };
};

const [index, item, list] = ['index', 'item', 'list'].map(id);
const member = [[item, list], [block, [
    [bound, [list]],
    () => {
        let state = 1;
        let i = 0;
        let b;
        return {
            next(forward) {
                switch (state) {
                case 0:
                    i += 1;
                case 1:
                    if (i >= read(list).length) {
                        state = 4;
                        return {done: true};
                    }
                    state = 2;
                    return {value: b = match(item, read(list)[i])};
                case 2:
                    state = 3;
                    return {value: true};
                case 3:
                    if (forward === false) return {done: true};
                    state = 0;
                    return {value: b};
                case 4:
                    return {done: true};
                }
            },
        };
    },
]]]

const [describedNav, string, hierarchy, item] = ['describedNav', 'string', 'hierarchy', 'item'].map(id);
[[describedNav, string],
    [match, [{description: {hierarchy}}, describedNav]],
    [walk, [item, hierarchy]],
    [match, [{type: "Label", string}, item]],
    [member, [string, ["English", "Español", "Français"]]],
]

const hierarchy = describedNav.description.hierarchy;
for (const item of walk(hierarchy)) {
    if (item.type === "Label") {
        if (langauges.includes(item.string)) {
            return item.string;
        }
    }
}
