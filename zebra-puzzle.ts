// house(color, nation, pet, drink, movie genre)

import {Ptr, bind, bound, unbound, value, ref, read, UnboundAddress, BoundAddress, bind2, bindUnbound, ask, addr, formatValue, formatAddress, SyncPredicate, deref, Address, Predicate, Cons, demand} from '.';

enum Color {Red}
enum Nation {Japan}
enum Pet {Dog}
enum Drink {OrangeJuice}
enum MovieGenre {SciFi}

type House = [Ptr<Color>, Ptr<Nation>, Ptr<Pet>, Ptr<Drink>, Ptr<MovieGenre>];
type List = [Ptr<House>, Ptr<House>, Ptr<House>, Ptr<House>, Ptr<House>];

const house = function(a, b, c, d, e): List {
    return [a, b, c, d, e];
};
const color = function(v) {
    return house(v, addr(), addr(), addr(), addr());
};
const nation = function(v) {
    return house(addr(), v, addr(), addr(), addr());
};
const pet = function(v) {
    return house(addr(), addr(), v, addr(), addr());
};
const drink = function(v) {
    return house(addr(), addr(), addr(), v, addr());
};
const genre = function(v) {
    return house(addr(), addr(), addr(), addr(), v);
};
const list = function(a, b, c, d, e): List {
    return [a, b, c, d, e];
};

const match = function* <T>(a: Ptr<T>, b: Ptr<T>): Generator<true | SyncPredicate, void | SyncPredicate, boolean> {
    if (a === b) {
        yield true;
        return;
    }

    let a2: T | UnboundAddress<T> | BoundAddress<T>;
    let b2: T | UnboundAddress<T> | BoundAddress<T>;
    if (ref(a)) a2 = a.deref();
    else a2 = a;
    if (ref(b)) b2 = b.deref();
    else b2 = b;

    if (a2 === b2) {
        yield true;
    } else if (unbound(a2)) {
        return bindUnbound(a2, b2);
    } else if (unbound(b2)) {
        return bindUnbound(b2, a2);
    } else {
        const av = read(a2);
        const bv = read(b2);

        if (av === bv || av == null || bv == null) {
            yield true;
        } else if (typeof av === 'object') {
            if (typeof bv !== 'object') return;

            if (Array.isArray(av)) {
                if (!Array.isArray(bv)) return;
                if (av.length !== bv.length) return;

                for (let i = 0; i < av.length; i++) {
                    if ((yield match(av[i], bv[i])) === false) return;
                }
            } else {
                for (const key in av) {
                    if (!(key in bv)) return;
                    if ((yield match(av[key], bv[key])) === false) return;
                }
                for (const key in bv) {
                    if (!(key in av)) return;
                }
            }
            yield true;
        }
    }
}

const exists = function* (v, l: Ptr<List>) {
    const _a = addr();
    const _b = addr();
    const _c = addr();
    const _d = addr();
    let i = 0;
    top: while (true) {
        if (i++ && (yield false) === false) continue top;
        for (const b = match(list(v, _a, _b, _c, _d), l); yield b;) {
            if ((yield true) as boolean === false) continue top;
        }
        for (const b = match(list(_a, v, _b, _c, _d), l); yield b;) {
            if ((yield true) as boolean === false) continue top;
        }
        for (const b = match(list(_a, _b, v, _c, _d), l); yield b;) {
            if ((yield true) as boolean === false) continue top;
        }
        for (const b = match(list(_a, _b, _c, v, _d), l); yield b;) {
            if ((yield true) as boolean === false) continue top;
        }
        for (const b = match(list(_a, _b, _c, _d, v), l); yield b;) {
            if ((yield true) as boolean === false) continue top;
        }
    }
};

const rightOf = function* (a, b, l) {
    let r = match(list(b, a, addr(), addr(), addr()), l);
    while (yield r) if ((yield true) === false) return;
    r = match(list(addr(), b, a, addr(), addr()), l);
    while (yield r) if ((yield true) === false) return;
    r = match(list(addr(), addr(), b, a, addr()), l);
    while (yield r) if ((yield true) === false) return;
    r = match(list(addr(), addr(), addr(), b, a), l);
    while (yield r) if ((yield true) === false) return;
};

const nextTo = function* (a, b, l) {
    let r = match(list(b, a, addr(), addr(), addr()), l);
    while (yield r) if ((yield true) === false) return;
    r = match(list(addr(), b, a, addr(), addr()), l);
    while (yield r) if ((yield true) === false) return;
    r = match(list(addr(), addr(), b, a, addr()), l);
    while (yield r) if ((yield true) === false) return;
    r = match(list(addr(), addr(), addr(), b, a), l);
    while (yield r) if ((yield true) === false) return;
    r = match(list(a, b, addr(), addr(), addr()), l);
    while (yield r) if ((yield true) === false) return;
    r = match(list(addr(), a, b, addr(), addr()), l);
    while (yield r) if ((yield true) === false) return;
    r = match(list(addr(), addr(), a, b, addr()), l);
    while (yield r) if ((yield true) === false) return;
    r = match(list(addr(), addr(), addr(), a, b), l);
    while (yield r) if ((yield true) === false) return;
};

const middle = function* (a, l) {
    const r = match(list(addr(), addr(), a, addr(), addr()), l);
    while (yield r) if ((yield true) === false) return;
};

const first = function* (a, l) {
    const r = match(list(a, addr(), addr(), addr(), addr()), l);
    while (yield r) {if ((yield true) === false) return;}
};

// const _ = addr;

const puzzle = function* (houses) {
    let a, b, c, d, e, f, g, h, i, j, k, l, m, n;
    // while (yield call(exists, ))
    a = exists(house('red', 'england', addr(), addr(), addr()), houses);
    b = exists(house(addr(), 'spain', 'dog', addr(), addr()), houses);
    c = exists(house('green', addr(), addr(), 'coffee', addr()), houses);
    d = exists(house(addr(), 'ukraine', addr(), 'tea', addr()), houses);
    g = exists(house('yellow', addr(), addr(), addr(), 'sci-fi'), houses);
    while ((yield a))
    while ((yield b))
    while ((yield c))
    while ((yield d))
    for (const e = rightOf(color('green'), color('ivory'), houses); yield e;)
    for (const f = exists(house(addr(), addr(), 'snails', addr(), 'fantasy'), houses); yield f;)
    while ((yield g) && (h = middle(drink('milk'), houses)))
    while ((yield h) && (i = first(nation('norweigh'), houses)))
    while ((yield i) && (j = nextTo(genre('romance'), pet('fox',), houses)))
    while ((yield j) && (k = nextTo(genre('sci-fi'), pet('horses'), houses)))
    while ((yield k) && (l = exists(house(addr(), addr(), addr(), 'orange-juice', 'comedy'), houses)))
    while ((yield l) && (m = exists(house(addr(), 'japan', addr(), addr(), 'action'), houses)))
    while ((yield m) && (n = nextTo(nation('norweigh'), color('blue'), houses)))
    while (yield n) if ((yield true) as boolean === false) return;
};

const zebra = function* (nation, houses) {
    for (const f = exists(list(addr(), nation, 'zebra', addr(), addr()), houses); yield f;)
    if ((yield true) as boolean === false) return;
};

const and = function* (f, g) {
    for (const a = f(); yield a;)
    for (const b = g(); yield b;)
    if ((yield true) as boolean === false) return;
};

const every = function* (f, ...p) {
    const q = () => and(f, p.reduceRight((carry, value) => (() => and(value, carry))));
    for (const a = q(); yield a;)
    if ((yield true) as boolean === false) return;
};

const answers = function* () {
    const h = addr();
    for (const p = puzzle(h); yield p;)
    console.log(formatAddress(h));
};

// (async () => {
//     ask(answers());
// })();

function* nth0<T>(v: T | UnboundAddress<T> | BoundAddress<T>, i: Ptr<number>, l: Ptr<Cons<T> | T[]>) {
    const l2 = deref(l);

    if (bound(l2) || value(l2)) {
        const lv = read(l2);

        const i2 = deref(i);
        if (unbound(v)) {
            if (unbound(i2)) {
                let j = 0;
                for (const value of lv)
                for (const b = bindUnbound(v, value); yield b;)
                for (const c = bindUnbound(i2, j++); yield c;)
                if ((yield true) as boolean === false) return;
            } else {
                const iv = read(i2);
                if (iv < lv.length)
                for (const b = bindUnbound(v, Array.isArray(lv) ? lv[iv] : lv.at(iv)); yield b;)
                if ((yield true) as boolean === false) return;
            }
        } else if (unbound(i2)) {
            const vv = read(v);
            let j = -1;
            for (const value of lv)
            if (vv === (Array.isArray(lv) ? lv[++j] : lv.at(++j)))
            for (const b = bindUnbound(i2, j); yield b;)
            if ((yield true) as boolean === false) return;
        } else {
            const iv = read(i2);
            if (iv < lv.length && read(v) === (Array.isArray(lv) ? lv[iv] : lv.at(iv)))
            if ((yield true) as boolean === false) return;
        }
    }
}

// const answers = f([a`zebraOwner`, a`waterDrinker`], [every,
//     [puzzle, a`h`],
//     [exists, list(_, a`zebraOwner`, 'zebra', _, _), a`h`],
//     [exists, list(_, a`waterDrinker`, _, 'water', _), a`h`],
// ])
// const answers = f([a`zebraOwner`, a`waterDrinker`], [
//     [puzzle, a`h`],
//     [exists, list(_, a`zebraOwner`, 'zebra', _, _), a`h`],
//     [exists, list(_, a`waterDrinker`, _, 'water', _), a`h`],
// ])

// const exists = fs()
// .add(f([a`v`, list(a`v`, _, _, _, _)]))
// .add(f`v, l`(match, (v, l) => list(v, _, _, _, _), l))
// .add(f`v, l`(match, (v, l) => list(_, v, _, _, _), l))
// .add(f`v, l`(match, (v, l) => list(_, _, v, _, _), l))
// .add(f`v, l`(match, (v, l) => list(_, _, _, v, _), l))
// .add(f`v, l`(match, (v, l) => list(_, _, _, _, v), l));

class AddressName {
    name: string;
    constructor(name: string) {
        this.name = name;
    }
}

function n([name]: TemplateStringsArray) {
    return new AddressName(name);
}

function clone(fact) {
    if (fact instanceof AddressName) {
        if (!fact.name) return addr();
        if (this[fact.name]) return this[fact.name];
        return this[fact.name] = addr();
    } else if (fact instanceof Address) {
        return fact;
    } else if (typeof fact === 'object') {
        if (Array.isArray(fact)) {
            const copy = fact.map(clone, this);
            if (typeof fact[0] === 'function' && fact.length <= 2) {
                return () => copy[0](...(copy[1] || []));
            } else if (copy.length > 1 && copy.every(c => typeof c === 'function')) {
                const slice = copy.slice(1);
                return () => every(copy[0], ...slice);
            }
            return copy;
        } else {
            const o = {};
            for (const key in fact) {
                o[key] = clone.call(this, fact[key]);
            }
            return o;
        }
    } else {
        return fact;
    }
}

function* call(fact, args) {
    const scope = {};
    const head = clone.call(scope, fact[0]);
    for (const mh = match(head, args); yield mh;) {
        if (fact.length === 1) {
            if ((yield true) === false) return;
        }
        else {
            for (const b = (clone.call(scope, fact[1]))(); yield b;)
            if ((yield true) === false) return;
        }
    }
}

function* findall(p: UnboundAddress<any>, q: () => SyncPredicate | Predicate, l: UnboundAddress<Cons<any>>) {
    let _l = Cons.empty;

    for (const b = q(); yield b;)
    if (bound(deref(p))) _l = _l.prepend(formatAddress(deref(p)));

    for (const b = bindUnbound(l, _l); yield b;)
    if ((yield true) as boolean === false) return;
}

function* member<T>(item: Ptr<T>, list: Ptr<Cons<T> | T[]>) {
    const item2 = deref(item);
    const list2 = deref(list);

    if (unbound(list2)) {
        return;
    }

    const listv = read(list2);
    let listc: Cons<T>;
    if (Array.isArray(listv)) listc = Cons.from(listv);
    else listc = listv;

    if (unbound(item2)) {
        for (const value of listc)
        for (const b = bindUnbound(item2, value); yield b;)
        if ((yield true) as boolean === false) return;
    } else {
        const itemv = read(item2);
        yield Boolean(listc.find(value => value === itemv));
    }
}

function fs(...initialFacts) {
    let s = initialFacts.slice();
    function* facts(...args) {
        const t = s;
        for (let i = 0; i < t.length; i++)
        for (const b = call(t[i], args); yield b;)
        if ((yield true) === false) return;
    }
    facts.add = fact => {
        s = [...s, fact];
        return this;
    };
    // facts.remove = args => {
    //     const a = addr();
    //     const b = addr();
    //     const list = addr();
    //     list.set(Cons.empty);
    //     // const resul = ask(clone([
    //     //     [findall, [a, [
    //     //         [member, [a, s]],
    //     //         [nth0, [b, 0, a]],
    //     //         [match, [b, args]],
    //     //     ], list]],
    //     // ]));
    //     const result = ask(
    //         findall(a, () => every(
    //             () => member(a, s),
    //             () => nth0(b, 0, a),
    //             () => match(b, args),
    //         ), list)
    //     );
    //     if (result.success) {
    //         result.teardown();
    //     }
    // };
    facts.removeAll = () => {
        s = [];
        return this;
    };
    return facts;
}

const _ = n``;

const v = n`v`;

const exist = fs(
    [[v, [v, _, _, _, _]]],
    [[v, [_, v, _, _, _]]],
    [[v, [_, _, v, _, _]]],
    [[v, [_, _, _, v, _]]],
    [[v, [_, _, _, _, v]]],
);

const [h, zebraOwner, waterDrinker] = [n`h`, n`zebraOwner`, n`waterDrinker`];

const question = fs(
    [[zebraOwner, waterDrinker], [
        [puzzle, [h]],
        [exist, [[_, zebraOwner, 'zebra', _, _], h]],
        [exist, [[_, waterDrinker, _, 'water', _], h]],
    ]],
);

const [minHigh, minLow, xt] = [n`minHigh`, n`minLow`, n`xt`];

const time = fs(
    [["time", [1, minHigh, minLow], [1, 3, minHigh, minLow]]],
    [["time", xt, xt]],
);

const tapTime = (tapSequence: number[]) => {
    const tapReplaced = addr<number[]>();
    return demand({tapReplaced}, time("time", tapSequence, tapReplaced) as SyncPredicate).tapReplaced;
};

(async () => {
    const h = addr<List>();
    const zebraOwner = addr<string>();
    const waterDrinker = addr();
    // const result = ask(every(
    //     // () => puzzle(h),
    //     clone([puzzle, [h]]),
    //     // () => exist(list(addr(), zebraOwner, 'zebra', addr(), addr()), h),
    //     clone([exist, [[_, zebraOwner, 'zebra', _, _], h]]),
    //     // () => exists(list(addr(), waterDrinker, addr(), 'water', addr()), h),
    //     clone([exist, [[_, waterDrinker, _, 'water', _], h]]),
    // ));
    // console.log(clone(
    //     [puzzle, [h]],
    // ));
    // return;
    // const result = ask(clone([
    //     [puzzle, [h]],
    //     [exist, [[_, zebraOwner, 'zebra', _, _], h]],
    //     [exist, [[_, waterDrinker, _, 'water', _], h]],
    // ]));
    console.log(demand([zebraOwner, waterDrinker], question(zebraOwner, waterDrinker) as SyncPredicate));
    const result = ask(question(zebraOwner, waterDrinker));
    if (result.success) {
        console.log(...formatAddress([zebraOwner, waterDrinker]));
        result.teardown();
    }
    console.log(formatAddress(zebraOwner), formatAddress(waterDrinker));
    // if (ask(and(
    //     () => puzzle(h),
    //     () => and(
    //         () => exists(list(addr(), zebraOwner, 'zebra', addr(), addr()), h as any),
    //         () => exists(list(addr(), waterDrinker, addr(), 'water', addr()), h as any)
    //     )
    // ))) {
    //     console.log(formatAddress(zebraOwner), formatAddress(waterDrinker));
    // } else {
    //     console.log('no answer');
    // }
})();

// (() => {
//     const answer = addr();
//     function* puzzle(answer) {
//         let a, b, c;
//         a = exists(['a', addr(), addr()], answer);
//         while ((yield a) && ((console.log('a', JSON.stringify((answer)))), b = first([addr(), 'c', addr()], answer))) {
//             while ((yield b) && ((console.log('b', JSON.stringify((answer)))), c = first(['b', addr(), addr()], answer))) {
//                 while (yield c) {
//                     if ((console.log('c', JSON.stringify((answer))), yield true) === false) return;
//                 }
//             }
//         }
//     };
//     console.log(ask(puzzle(answer)), JSON.stringify(answer, null, "  "));
// })();
