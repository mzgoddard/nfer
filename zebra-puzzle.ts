// house(color, nation, pet, drink, movie genre)

import {Ptr, bind, bound, unbound, value, ref, read, UnboundAddress, BoundAddress, bind2, bindUnbound} from '.';

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
const list = function(a, b, c, d, e): List {
    return [a, b, c, d, e];
};

const match = function* <T>(a: Ptr<T>, b: Ptr<T>) {
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

const exists = function* (v, l: List) {
    let b = match(v, l[0]);
    while (yield b) if ((yield true) === false) return;
    b = match(v, l[1]);
    while (yield b) if ((yield true) === false) return;
    b = match(v, l[2]);
    while (yield b) if ((yield true) === false) return;
    b = match(v, l[3]);
    while (yield b) if ((yield true) === false) return;
    b = match(v, l[4]);
    while (yield b) if ((yield true) === false) return;
};

const rightOf = function* (a, b, l) {
    let r = match(list(b, a, null, null, null), l);
    while (yield r) if ((yield true) === false) return;
    r = match(list(null, b, a, null, null), l);
    while (yield r) if ((yield true) === false) return;
    r = match(list(null, null, b, a, null), l);
    while (yield r) if ((yield true) === false) return;
    r = match(list(null, null, null, b, a), l);
    while (yield r) if ((yield true) === false) return;
};

const nextTo = function* (a, b, l) {
    let r = match(list(b, a, null, null, null), l);
    while (yield r) if ((yield true) === false) return;
    r = match(list(null, b, a, null, null), l);
    while (yield r) if ((yield true) === false) return;
    r = match(list(null, null, b, a, null), l);
    while (yield r) if ((yield true) === false) return;
    r = match(list(null, null, null, b, a), l);
    while (yield r) if ((yield true) === false) return;
    r = match(list(a, b, null, null, null), l);
    while (yield r) if ((yield true) === false) return;
    r = match(list(null, a, b, null, null), l);
    while (yield r) if ((yield true) === false) return;
    r = match(list(null, null, a, b, null), l);
    while (yield r) if ((yield true) === false) return;
    r = match(list(null, null, null, a, b), l);
    while (yield r) if ((yield true) === false) return;
};

const middle = function* (a, l) {
    const r = match(list(null, null, a, null, null), l);
    while (yield r) if ((yield true) === false) return;
};

const first = function* (a, l) {
    const r = match(list(a, null, null, null, null), l);
    while (yield r) if ((yield true) === false) return;
};

const puzzle = function* (houses) {
    let a, b, c, d, e, f, g, h, i, j, k, l, m, n;
    a = exists(house('red', 'england', null, null, null), houses);
    while ((yield a) && (b = exists(house(null, 'spain', 'dog', null, null), houses)))
    while ((yield b) && (c = exists(house('green', null, null, 'coffee', null), houses)))
    while ((yield c) && (d = exists(house(null, 'ukraine', null, 'tea', null), houses)))
    while ((yield d) && (e = rightOf(house('green', null, null, null, null), house('ivory', null, null, null, null), houses)))
    while ((yield e) && (f = exists(house(null, null, 'snails', null, 'fantasy'), houses)))
    while ((yield f) && (g = exists(house('yellow', null, null, null, 'sci-fi'), houses)))
    while ((yield g) && (h = middle(house(null, null, null, 'milk', null), houses)))
    while ((yield h) && (i = first(house(null, 'norweigh', null, null, null), houses)))
    while ((yield i) && (j = nextTo(house(null, null, null, null, 'romance'), house(null, null, 'fox', null, null), houses)))
    while ((yield j) && (k = nextTo(house(null, null, null, null, 'sci-fi'), house(null, null, 'horses', null, null), houses)))
    while ((yield k) && (l = exists(house(null, null, null, 'orange-juice', 'comedy'), houses)))
    while ((yield l) && (m = exists(house(null, 'japan', null, null, 'action'), houses)))
    while ((yield m) && (n = nextTo(house(null, 'norweigh', null, null, null), house('blue', null, null, null, null), houses)))
    while (yield n) if ((yield true) as boolean === false) return;
};
