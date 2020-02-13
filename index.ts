import {inspect} from "util";

function rule(s: TemplateStringsArray, ...args) {}

// const between = rule``;
// const betweenA = rule`(N, A, B) :- N >= A, N <= B`;
// const betweenB = rule`(N, A, B) :- N is A; A1 is A + 1, A1 < B, ${between}(N, A1, B)`;

export interface UnboundAddress<T> {
    set(value: T): BoundAddress<T>;
    refer(addr: UnboundAddress<T> | BoundAddress<T> | Reference<T>): Reference<T>;
}

export interface Reference<T> {
    readonly ref: UnboundAddress<T> | BoundAddress<T>;
    deref(): UnboundAddress<T> | BoundAddress<T>;
    unref(): UnboundAddress<T>;
}

export interface BoundAddress<T> {
    readonly value: T;
    get(): T;
    unset(): UnboundAddress<T>;
}

class Address<T> implements UnboundAddress<T>, BoundAddress<T>, Reference<T> {
    value: T = null;
    ref: Address<T> = null;
    id: number = nextId++;
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
    refer(addr: UnboundAddress<T> | BoundAddress<T>): Reference<T> {
        if (addr instanceof Address) {
            this.ref = addr;
            return this;
        }
        throw new Error('May only refer to other Address objects');
    }
    deref(): UnboundAddress<T> | BoundAddress<T> {
        if (this.ref === null) return this;
        return this.ref.deref();
    }
    unref(): UnboundAddress<T> {
        this.ref = null;
        return this;
    }
}

// class BoundAddress<T> extends Address<T> {

// }

export function addr<T = any>(): UnboundAddress<T> {
    return new Address<T>();
}

export function* bindValue<T>(a: UnboundAddress<T>, b: T): Generator<boolean, void, boolean> {
    // console.log('set value', b)
    const ba = a.set(b);
    yield true;
    // console.log('unset value', b)
    ba.unset();
}

export function* bindRef<T>(a: UnboundAddress<T>, b: UnboundAddress<T> | BoundAddress<T> | Reference<T>): Generator<boolean, void, boolean> {
    // console.log('set ref', b);
    const ra = a.refer(b);
    yield true;
    // console.log('unset ref', b);
    ra.unref();
}

export function* bindUnbound<T>(a: UnboundAddress<T>, b: T | BoundAddress<T> | UnboundAddress<T>) {
    if (value(b)) {
        return bindValue(a, b);
    } else {
        return bindRef(a, b);
    }
}

export function* bind2<T>(a: Ptr<T>, b: Ptr<T>): Generator<boolean, Generator<boolean, void, boolean>, boolean> {
    let a2: T | UnboundAddress<T> | BoundAddress<T>;
    let b2: T | UnboundAddress<T> | BoundAddress<T>;
    if (ref(a)) a2 = a.deref();
    else a2 = a;
    if (ref(b)) b2 = b.deref();
    else b2 = b;

    if (a2 === b2) {
        yield true;
    } else if ((value(a2) || bound(a2)) && (value(b2) || bound(b2))) {
        yield read(a2) === read(b2);
    } else if (value(a2)) {
        return bindValue(b2 as UnboundAddress<T>, a2);
    } else if (bound(a2)) {
        return bindRef(b2 as UnboundAddress<T>, a2);
    } else if (value(b2)) {
        return bindValue(a2, b2);
    } else {
        return bindRef(a2, b2);
    }
}

export function* bind<T>(a: Ptr<T>, v: Ptr<T>): Predicate {
    if (value(a) && value(v) || a === v) {
        yield a === v;
    } else if (value(a)) {
        return bind(v, a);
    } else if (ref(a)) {
        return bind(a.deref(), v);
    } else if (unbound(a)) {
        if (value(v)) {
            const b = a.set(v);
            yield true;
            b.unset();
        } else {
            const b = a.refer(v);
            yield true;
            b.unref();
        }
    } else {
        if (value(v)) {
            yield a.get() === v;
        } else if (bound(v)) {
            yield a.get() === v.get();
        } else {
            return bind(v, a);
        }
    }
}

export type Ptr<T = any> = T | BoundAddress<T> | UnboundAddress<T> | Reference<T>;

export function value<T>(p: Ptr<T>): p is T {
    return !(p instanceof Address);
}

export function unbound<T>(p: Ptr<T>): p is UnboundAddress<T> {
    return p instanceof Address && p.ref === null && p.value === null;
}

export function bound<T>(p: Ptr<T>): p is BoundAddress<T> {
    return p instanceof Address && p.ref === null && p.value !== null;
}

export function ref<T>(p: Ptr<T>): p is Reference<T> {
    return p instanceof Address && p.ref !== null;
}

export function read<T>(p: UnboundAddress<T>): never;
export function read<T>(p: T | BoundAddress<T>): T
export function read<T>(p: Ptr<T>): T
export function read<T>(p: Ptr<T>): T {
    if (bound(p)) return p.value;
    if (value(p)) return p;
    if (ref(p)) return read(p.deref());
    throw new Error('Cannot read non-value or unbound address');
}

export function write<T>(p: T | BoundAddress<T>, v: T): never;
export function write<T>(p: UnboundAddress<T>, v: T): BoundAddress<T>;
export function write<T>(p: Ptr<T>, v: T): BoundAddress<T>;
export function write<T>(p: Ptr<T>, v: T): BoundAddress<T> {
    if (unbound(p)) return p.set(v);
    if (ref(p)) return write(p.deref(), v);
    throw new Error('Cannot write value or bound address');
}

export function formatValue(p) {
    if (typeof p === 'object' && p) {
        if (Array.isArray(p)) {
            return p.map(formatAddress);
        } else {
            const o = {};
            for (const key in p) {
                o[key] = formatAddress(p[key]);
            }
            return o;
        }
    } else {
        return p;
    }
}

export function formatAddress<T>(p: Ptr<T>): T {
    if (value(p)) {
        return formatValue(p);
    } else if (bound(p)) {
        return formatValue(p.value);
    } else if (unbound(p)) {
        return null;
    } else {
        return formatAddress(p.deref());
    }
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
    inPlaceOf: T;
    parent: Link<T>;
    sibling: Link<T>;
    child: Link<T>;

    constructor(value: T, parent: Link<T> = null, sibling: Link<T> = null, child: Link<T> = null) {
        this.value = value;
        this.inPlaceOf = value;
        this.parent = parent;
        this.sibling = sibling;
        this.child = child;
    }

    down() {
        // console.log('down', JSON.stringify(this.child && this.child.inPlaceOf), JSON.stringify(this.inPlaceOf));
        return this.child;
    }

    up() {
        // console.log('up', JSON.stringify(this.inPlaceOf), JSON.stringify(this.child && this.child.inPlaceOf));
        return this.parent;
    }

    push(value: T) {
        // if (!(value as unknown as {__id}).__id) (value as unknown as {__id}).__id = nextId++;
        // console.log('push', JSON.stringify(this.child && this.child.inPlaceOf), JSON.stringify(value));
        return (this.child = new Link(value, this, this.child));
    }

    pop() {
        // console.log('pop', JSON.stringify(this.inPlaceOf), JSON.stringify(this.child && this.child.inPlaceOf));
        if (this.child) {
            throw new Error('Popping Link that has a child');
        } else if (this.sibling) {
            this.parent.child = this.sibling;
        } else {
            this.parent.child = null;
        }
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

export class Pot<T = any> {
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

type RunState = {link: Link<Predicate>, direction: boolean, loops: number, unwindLink: Link<Predicate>, start: number};
type PredicateYield = Predicate | boolean | void;
type PredicateReturn = Predicate | boolean | void;

let nextId = 1;

function stepYield(state: RunState, value: PredicateYield) {
    if (typeof value === 'object') {
        // if (!(value as unknown as {__id}).__id) (value as unknown as {__id}).__id = nextId++;
        state.direction = true;
        if (state.link.child && (state.link.child.inPlaceOf === value)) {
            // state.link.child.value !== value && console.log('down');
            state.link = state.link.down();
        } else {
            // console.log('push', state.link.child && JSON.stringify(state.link.child.inPlaceOf), JSON.stringify(value));
            state.link = state.link.push(value);
        }
    } else if (value === true) {
        state.direction = true;
        // console.log('up');
        state.link = state.link.up();
    } else {
        state.direction = false;
        if (!state.unwindLink) state.unwindLink = state.link.parent;
        if (state.link.child) {
            while (state.link.child) {
                // console.log('down');
                state.link = state.link.down();
            }
        } else {
            // console.log('pop');
            // state.link = state.link.pop();
        }
    }
    return state;
}

function stepReturn(state: RunState, value: PredicateReturn) {
    if (typeof value === 'object') {
        state.direction = true;
        // const inPlaceOf = state.link.inPlaceOf;
        // const child = state.link.child;
        // console.log('pop', 'push');
        // state.link = state.link.pop().push(value);
        // state.link.inPlaceOf = inPlaceOf;
        // state.link.child = child;
        state.link.value = value;
        if (state.link.child) {
            if (!state.unwindLink) state.unwindLink = state.link;
            while (state.link.child) {
                // console.log('down');
                state.link = state.link.down();
            }
        }
    } else {
        state.direction = value === true;
        if (!state.unwindLink) state.unwindLink = state.link.parent;
        if (state.link.child) {
            while (state.link.child) {
                // console.log('down');
                state.link = state.link.down();
            }
        } else {
            // console.log('pop');
            // state.link = state.link.pop();
        }
    }
    return state;
}

function step(state: RunState): Promise<RunState> | RunState {
    if (state.link.value === null) return state;

    if (state.unwindLink) {
        if (state.link === state.unwindLink) {
            state.unwindLink = null;
            return state;
        }

        const out = state.link.value.next(false);

        if (out.value === false || out.value == null) {
            if (state.link.child) {
                throw new Error('Zombie child');
            }
            else {
                // console.log('pop');
                state.link = state.link.pop();
                if (state.link === state.unwindLink) {
                    state.unwindLink = null;
                    return state;
                }
                while (state.link.child) {
                    // console.log('down');
                    state.link = state.link.down();
                }
            }
        } else {
            throw new Error(`yielding or returning false or null are accepted when unwinding: ${out.value}`);
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
        stack.loops++;
        const nextStack = step(stack);
        if (nextStack instanceof Promise) return nextStack.then(loop);
        stack = nextStack;
    };
    return stack;
}

export function ask(p: SyncPredicate): boolean;
export function ask(p: Predicate): Promise<boolean>;
export function ask(p: Predicate): boolean | Promise<boolean> {
    let link = Link.init(p);
    let direction = true;
    return Pot.some({link, direction, loops: 0, start: Date.now()})
        .map(loop)
        .map(state => (console.log(state.loops, Date.now() - state.start), state))
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
    interface Reporter {
        startSuite(): void;
        finishSuite(): void;
        startTest(name: string): void;
        finishTest(): void;
        assert(ok: boolean, message: string): void;
    }
    class NullReporter implements Reporter {
        startSuite() {}
        finishSuite() {}
        startTest(name: string) {}
        finishTest() {}
        assert(ok: boolean, message: string) {}
    }
    class LogReporter implements Reporter {
        tests: number;
        testsPassed: number;
        testName: string;
        testResult: {ok: boolean, message: string}[];
        testStart: number;
        startSuite() {
            this.tests = 0;
            this.testsPassed = 0;
        }
        finishSuite() {
            console.log(`${this.tests === this.testsPassed ? 'OK' : 'FAIL'}: ${this.tests} ran. ${this.testsPassed} passed. ${this.tests - this.testsPassed} failed.`);
            process.exitCode = 1;
        }
        startTest(name: string) {
            this.tests++;
            this.testName = name;
            this.testResult = [];
            this.testStart = Date.now();
        }
        finishTest() {
            const duration = Date.now() - this.testStart;
            this.testsPassed += this.testResult.every(({ok}) => ok) ? 1 : 0;
            // console.log(`${this.testName} - ${this.testResult.filter(({ok}) => ok).length} ${this.testResult.filter(({ok}) => !ok).length}`);
            console.log(this.testName, `- ${duration}ms`);
            this.testResult.map(({ok, message}) => console.log(ok ? '✓' : '⨯', message));
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
        pass(message: string) {
            this.reporter.assert(true, message);
        }
        fail(message: string) {
            this.reporter.assert(false, message);
        }
        ok(truthy: any, message = '') {
            this.reporter.assert(Boolean(truthy), message);
        }
        true(t: boolean, message = '') {
            if (t === true) this.reporter.assert(true, message);
            else this.reporter.assert(false, `Expected ${inspect(t)} to be true. ${message}`);
        }
        false(f: boolean, message = '') {
            if (f === false) this.reporter.assert(true, message);
            else this.reporter.assert(false, `Expected ${inspect(f)} to be false. ${message}`);
        }
        throws(E: new () => Error, f: () => Promise<never>, message?: string): Promise<void>;
        throws(E: new () => Error, f: () => never, message?: string): void;
        throws(E: new () => Error, f: () => never | Promise<never>, message?: string): void | Promise<void>;
        throws(E: new () => Error, f: () => never | Promise<never>, message = ''): void | Promise<void> {
            try {
                const r = f();
                if (r instanceof Promise) {
                    return r.then(() => this.fail(`Expected ${E} to be thrown. ${message}`), e => {
                        if (e instanceof E) this.pass(`Throws ${E}. ${message}`);
                        else this.fail(`Expected ${E} but threw ${e}. ${message}`);
                    });
                }
                this.fail(`Expected ${E} to be thrown. ${message}`);
            } catch (e) {
                if (e instanceof E) this.pass(`Throws ${E}. ${message}`);
                else this.fail(`Expected ${E} but threw ${e}. ${message}`);
            }
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

        constructor(suite: Suite, reporter: Reporter = new LogReporter(), assert = new Assert(reporter)) {
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
                        this.assert.fail('Timeout');
                    } else {
                        this.assert.fail(`Unexpected exception thrown: ${e.stack || e.message || e}`);
                    }
                }
                this.reporter.finishTest();
            }
            this.reporter.finishSuite();
        }
    }

    const s = new Suite();

    try {
        // Link
        s.test('Link.init', t => {
            const l = Link.init(1);
            t.ok(l.value === 1);
            t.ok(l.parent instanceof Link);
            t.ok(l.parent.value === null);
            t.ok(l.sibling === null);
            t.ok(l.child === null);
        });
        s.test('Link.push', t => {
            let l = Link.init(1);
            l = l.push(2);
            t.ok(l.parent.value === 1);
            l = l.up();
            t.ok(l.value === 1);
            l = l.push(3);
            t.ok(l.parent.value === 1);
            t.ok(l.sibling.value === 2);
        });
        s.test('Link.pop', t => {
            let l = Link.init(1);
            l = l.push(2);
            l = l.pop();
            t.ok(l.value === 1);
            t.ok(l.child === null);
            l = l.push(3);
            l = l.push(4);
            l = l.up();
            t.throws(Error, () => l.pop());
        });

        // run()
        s.test('run - depth 1, yield true', t => {
            const root = function* () {
                yield true;
            };
            t.true(ask(root()));
        });
        s.test('run - depth 1, yield false', t => {
            const root = function* () {
                yield false;
            };
            t.false(ask(root()));
        });
        s.test('run - depth 1, yield resolve true', async t => {
            function* root() {
                yield Promise.resolve(true);
            }
            t.true(await ask(root()));
        });
        s.test('run - depth 1, yield resolve false', async t => {
            function* root() {
                yield Promise.resolve(false);
            }
            t.false(await ask(root()));
        });
        s.test('run - depth 1, return true', t => {
            const root = function* () {
                return true;
            };
            t.true(ask(root()));
        });
        s.test('run - depth 1, return false', t => {
            const root = function* () {
                return false;
            };
            t.false(ask(root()));
        });
        s.test('run - depth 1, return resolve true', async t => {
            const root = function* () {
                return Promise.resolve(true);
            };
            t.true(await ask(root()));
        });
        s.test('run - depth 1, return resolve false', async t => {
            const root = function* () {
                return Promise.resolve(false);
            };
            t.false(await ask(root()));
        });
        s.test('run - depth 1, return generator yield true', t => {
            const root = function* () {
                return root2();
            };
            const root2 = function* () {
                yield true;
            };
            t.true(ask(root()));
        });
        s.test('run - depth 1, return generator yield false', t => {
            const root = function* () {
                return root2();
            };
            const root2 = function* () {
                yield false;
            };
            t.false(ask(root()));
        });
        s.test('run - depth 2, yield generator yield true', t => {
            const root = function* () {
                yield yield root2();
            };
            const root2 = function* () {
                yield true;
            };
            t.true(ask(root()));
        });
        s.test('run - depth 2, yield generator yield false', t => {
            const root = function* () {
                yield yield root2();
            };
            const root2 = function* () {
                yield false;
            };
            t.false(ask(root()));
        });
        s.test('run - depth 3, count to 0-index 10', t => {
            const count10 = function* (a: UnboundAddress<number>) {
                for (let i = 0, binding = bind(a, i); i < 10; i++, binding = bind(a, i))
                while (yield binding)
                if ((yield true) === false) return;
            };
            const last = function*<T> (a: UnboundAddress<T>, g: Predicate) {
                let value: T = null;
                while (yield g) if (bound(a)) value = a.value;
                if (value !== null) yield yield bind(a, value);
            };
            const root = function* () {
                const a = addr<number>();
                const lasting = last(a, count10(a));
                while (yield lasting) yield bound(a) && a.value === 9;
            };
            t.true(ask(root()));
        });
        s.test('run - depth 2, sibling 2, 10 * 10', t => {
            const count10 = function* (a: UnboundAddress<number>) {
                for (let i = 0, binding = bind(a, i); i < 10; i++, binding = bind(a, i))
                while (yield binding)
                if ((yield true) === false) return;
            };
            const root = function* () {
                let ary = [];
                const av = addr<number>();
                const bv = addr<number>();
                const a = count10(av);
                let b: Predicate;
                while ((yield a) && (b = count10(bv))) while (yield b) ary.push([read(av), read(bv)]);
                yield ary.length === 100;
            };
            t.true(ask(root()));
        });
    } finally {
        const r = new Runner(s);
        r.run();
    }
}
