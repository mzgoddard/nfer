function rule(s: TemplateStringsArray, ...args) {}

// const between = rule``;
// const betweenA = rule`(N, A, B) :- N >= A, N <= B`;
// const betweenB = rule`(N, A, B) :- N is A; A1 is A + 1, A1 < B, ${between}(N, A1, B)`;

interface UnboundAddress<T> {
    set(value: T): BoundAddress<T>;
}

interface BoundAddress<T> {
    readonly value: T;
    get(): T;
    unset(): UnboundAddress<T>;
}

class Address<T> {
    value: T;
    get() {
        return this.value;
    }
    set(value: T): BoundAddress<T> {
        this.value = value;
        return this;
    }
    unset(): UnboundAddress<T> {
        this.value = null;
        return this;
    }
}

// class BoundAddress<T> extends Address<T> {

// }

function addr<T>(): UnboundAddress<T> {
    return new Address<T>();
}

function* bind<T>(a: Ptr<T>, v: T): Predicate {
    if (unbound(a)) {
        const b = a.set(v);
        yield true;
        b.unset();
    } else {
        yield bound(a) ? a.get() === v : a === v;
    }
}

type Ptr<T = any> = T | BoundAddress<T> | UnboundAddress<T>;

function value<T>(p: Ptr<T>): p is T {
    return !(p instanceof Address);
}

function unbound<T>(p: Ptr<T>): p is UnboundAddress<T> {
    return p instanceof Address && p.value === null;
}

function bound<T>(p: Ptr<T>): p is BoundAddress<T> {
    return p instanceof Address && p.value !== null;
}

function* is(lhs: Ptr, rhs: Ptr) {
    yield true;
}

// class Thread {
//     call(...args): Generator<boolean> {}
// }

type Between = Generator<boolean | Generator, boolean | Generator, boolean>;

function* between(n: Ptr<number>, a: number, b: number): Predicate {
    if (bound(n)) return between(n.value, a, b);
    if (value(n)) return n >= a && n <= b;
    if ((yield a < b && (yield bind(n, a))) === false) return;
    if (a === b) return bind(n, a);
    return a < b && between(n, a + 1, b);
}

function* ttable() {
    const table: [number, number, number][] = [];
    const x = addr<number>();
    const y = addr<number>();
    const a = between(x, 1, 10);
    while ((yield a) as boolean) {
        const b = between(y, 1, 10);
        while (yield b) {
            if (bound(x) && bound(y)) {
                table.push([x.value, y.value, x.value * y.value]);
            }
        }
    }
}

type SyncPredicate = Generator<PredicateYield, PredicateReturn, boolean>;
type Predicate = Generator<PredicateYield | Promise<PredicateYield>, PredicateReturn | Promise<PredicateReturn>, boolean>;

class Link<T> {
    value: T;
    parent: Link<T>;
    sibling: Link<T>;
    child: Link<T>;

    constructor(value: T, parent: Link<T> = null, sibling: Link<T> = null, child: Link<T> = null) {
        this.value = value;
        this.parent = parent;
        this.sibling = sibling;
        this.child = child;
    }

    down() {
        return this.child;
    }

    up() {
        return this.parent;
    }

    push(value: T) {
        return (this.child = new Link(value, this, this.child));
    }

    pop() {
        this.parent.child = new Link(this.sibling.value, this.parent, this.sibling.sibling, this.sibling.child);
        return this.parent;
    }

    static init<T>(value: T) {
        return new Link<T>(null).push(value);
    }
}

type Potable<T> = Promise<Pot<T>> | T;

enum PotType {
    Unknown,
    None,
    Error,
    Some,
    Promise,
}

class Pot<T = any> {
    readonly value: unknown;
    private readonly type: PotType;

    constructor(value: Error, type?: PotType.Error);
    constructor(value: Promise<Pot<T>>, type?: PotType.Promise);
    constructor(value: T, type?: PotType.Some);
    constructor(value: null, type?: PotType.None);
    constructor(value: Promise<Pot<T>> | T | Error, type?: PotType.Unknown);
    constructor(value: Promise<Pot<T>> | T | Error, type: PotType = PotType.Unknown) {
        if (type === PotType.Unknown) type = Pot.typeof(value);
        this.type = type;
        if (type === PotType.None) this.value = null;
        else this.value = value;
    }

    map<S>(isSome: (value: T) => Promise<S> | S, isNone: () => Promise<S> | S = null, isError: (error: Error) => Promise<S> | S = null): Pot<S> {
        try {
            if (this.isPromise()) {
                return new Pot(this.value.then(innerPot => innerPot.map(isSome, isNone, isError)));
            } else if (this.isError()) {
                if (isError) return Pot.some(isError(this.value));
                return Pot.error(this.value);
            } else if (this.isSome()) {
                if (isSome) return Pot.some(isSome(this.value));
                return Pot.none();
            }
            if (isNone) return Pot.some(isNone());
            return Pot.none();
        } catch (error) {
            return Pot.error(error);
        }
    }

    unwrap(): Promise<T> | T {
        if (this.isPromise()) {
            return this.value.then(innerPot => innerPot.unwrap());
        } else if (this.isError()) {
            throw this.value;
        } else if (this.isSome()) {
            return this.value;
        }
        return null;
    }

    isSome(): this is {value: T, unwrap: () => T} {
        return this.type === PotType.Some;
    }

    isNone() {
        return this.type === PotType.None;
    }

    isError(): this is {value: Error} {
        return this.type === PotType.Error;
    }

    isPromise(): this is {value: Promise<Pot<T>>, unwrap: () => Promise<T>} {
        return this.type === PotType.Promise;
    }

    static typeof(value: any): PotType {
        if (value instanceof Promise) return PotType.Promise;
        else if (value instanceof Error) return PotType.Error;
        else if (value != null) return PotType.Some;
        return PotType.None;
    }

    // static some<T>(value: null): Pot<T>;
    // static some<T>(value: Error): Pot<T>;
    // static some<T>(value: Promise<Pot<T> | T>): Pot<T> & {value: Promise<Pot<T>>};
    // static some<T>(value: Pot<T>): Pot<T>;
    // static some<T>(value: T): Pot<T> & {value: T};
    // static some<T>(value: Promise<Pot<T> | T> | Pot<T> | T): Pot<T>;
    static some<T>(value: Promise<Pot<T> | T> | Pot<T> | T): Pot<T> {
        if (value instanceof Promise) {
            return new Pot(value.then(Pot.some as (value: Pot<T> | T) => Pot<T>, Pot.error as (reason: Error) => Pot<T>), PotType.Promise);
        } else if (value instanceof Pot) {
            return value;
        } else if (value instanceof Error) {
            return Pot.error(value);
        } else if (value != null) {
            return new Pot(value, PotType.Some);
        }
        return Pot.none();
    }

    static none() {
        return new Pot(null, PotType.None);
    }

    static error(error: Error) {
        return new Pot<any>(error, PotType.Error);
    }
}

type RunState = {link: Link<Predicate>, direction: boolean, unwindLink: Link<Predicate>};
type PredicateYield = Predicate | boolean | void;
type PredicateReturn = Predicate | boolean | void;

function stepYield(state: RunState, value: PredicateYield) {
    if (typeof value === 'object') {
        state.direction = true;
        if (state.link.child && state.link.child.value === value) {
            state.link = state.link.down();
        } else {
            state.link = state.link.push(value);
        }
    } else if (value === true) {
        state.direction = true;
        state.link = state.link.up();
    } else {
        state.direction = false;
        if (state.link.child) {
            if (!state.unwindLink) state.unwindLink = state.link.parent;
            state.link = state.link.down();
        } else {
            state.link = state.link.pop();
        }
    }
    return state;
}

function stepReturn(state: RunState, value: PredicateReturn) {
    if (typeof value === 'object') {
        state.direction = true;
        const child = state.link.child;
        state.link = state.link.pop().push(value);
        state.link.child = child;
        if (state.link.child) {
            if (!state.unwindLink) state.unwindLink = state.link;
            state.link = state.link.down();
        }
    } else {
        state.direction = value === true;
        if (state.link.child) {
            if (!state.unwindLink) state.unwindLink = state.link.parent;
            state.link = state.link.down();
        } else {
            state.link = state.link.pop();
        }
    }
    return state;
}

function step(state: RunState): Promise<RunState> | RunState {
    if (state.link.value === null) return state;

    if (state.unwindLink) {
        if (state.link === state.unwindLink) {
            state.unwindLink = null;
            if (state.link.value === null) return state;
        }

        const out = state.link.value.next(false);

        if (out.value === false || out.value == null) {
            if (state.link.child) state.link = state.link.down();
            else state.link = state.link.pop();
        } else {
            throw new Error('yielding or returning false or null are accepted when unwinding');
        }
        return state;
    }

    const {value, done} = state.link.value.next(state.direction);

    if (done) {
        if (value instanceof Promise) {
            return value.then((value) => stepReturn(state, value));
        } else {
            stepReturn(state, value);
        }
    } else {
        if (value instanceof Promise) {
            return value.then((value) => stepYield(state, value));
        } else {
            stepYield(state, value);
        }
    }
    return state;
}

function loop(stack: RunState): Promise<RunState> | RunState {
    while (stack.link.value !== null) {
        const nextStack = step(stack);
        if (nextStack instanceof Promise) return nextStack.then(loop);
        stack = nextStack;
    };
    return stack;
}

function run(p: SyncPredicate): boolean;
function run(p: Predicate): Promise<boolean>;
function run(p: Predicate): boolean | Promise<boolean> {
    let link = Link.init(p);
    let direction = true;
    return Pot.some({link, direction})
        .map(loop)
        .map(({direction}) => direction, () => false)
        .unwrap();
}

// function ng_between(n: Ptr<number>, a: number, b: number) {
//     let state = 0;
//     return {
//         next() {
//             switch (state) {
//             case 0:
//                 state = 1;
//                 return {value: bound(n) && n >= a && n <= b, done: false};
//             case 1:
//                 state = 2;
//                 return {value: is(n, a), done: false};
//             case 2:
//                 state = 3;
//                 return {value: a + 1 && between(n, a + 1, b), done: false};
//             default:
//                 return {value: null, done: true};
//             }
//         }
//     }
// }

if (typeof process === 'object' && process.env.NODE_ENV === 'test') {
    class Reporter {
        testName: string;
        testResult: {ok: boolean, message: string}[];
        startSuite() {}
        finishSuite() {}
        startTest(name: string) {
            this.testName = name;
            this.testResult = [];
        }
        finishTest() {
            console.log(`${this.testName} - ${this.testResult.filter(({ok}) => ok).length} ${this.testResult.filter(({ok}) => !ok).length}`);
        }
        assert(ok: boolean, message: string) {
            this.testResult.push({ok, message});
        }
    }
    class Assert {
        reporter: Reporter;
        constructor(reporter: Reporter) {
            this.reporter = reporter;
        }
        ok(truthy: any, message = '') {
            this.reporter.assert(Boolean(truthy), message);
        }
    }

    class Suite {
        tests: {name: string, body: (t: Assert) => Promise<void> | void}[];

        constructor() {
            this.tests = [];
        }
        test(name: string, body: (t: Assert) => Promise<void> | void) {
            this.tests.push({
                name,
                body
            });
        }
    }

    class TimeoutError extends Error {}

    class Runner {
        suite: Suite;
        reporter: Reporter;
        assert: Assert;

        constructor(suite: Suite, reporter: Reporter = new Reporter(), assert = new Assert(reporter)) {
            this.suite = suite;
            this.reporter = reporter;
            this.assert = assert;
        }

        async run() {
            this.reporter.startSuite();
            for (const test of this.suite.tests) {
                this.reporter.startTest(test.name);
                try {
                    await Promise.race([
                        test.body(this.assert),
                        new Promise(resolve => setTimeout(resolve, 2000))
                            .then(() => {throw new TimeoutError();})
                    ]);
                } catch (e) {
                    if (e instanceof TimeoutError) {
                        this.assert.ok(false, 'Timeout');
                    } else {
                        this.assert.ok(false, 'Unexpected exception thrown');
                    }
                }
                this.reporter.finishTest();
            }
            this.reporter.finishSuite();
        }
    }

    const s = new Suite();

    try {
        s.test('', t => {
            const root = function* () {
                yield true;
            };
            t.ok(run(root()));
        });
        s.test('', t => {
            const root = function* () {
                yield false;
            };
            t.ok(!run(root()));
        });
        s.test('', async t => {
            function* root() {
                yield Promise.resolve(true);
            }
            t.ok(await run(root()));
        });
        s.test('', t => {
            const root = function* () {
                return true;
            };
            t.ok(run(root()));
        });
        s.test('', t => {
            const root = function* () {
                console.log('b');
                return root2();
            };
            const root2 = function* () {
                console.log('a');
                yield true;
            };
            t.ok(run(root()));
        });
    } finally {
        const r = new Runner(s);
        r.run();
    }
}
