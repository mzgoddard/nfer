// house(color, nation, pet, drink, movie genre)

import {Ptr, bind, bound, unbound, value, ref, read, UnboundAddress, BoundAddress, bind2, bindUnbound, ask, addr, formatValue, formatAddress} from '.';

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
    // console.log(1, JSON.stringify(l, null, "  "));
    {
        const b = match(list(v, addr(), addr(), addr(), addr()), l);
        while ((yield b)) {if ((yield true) === false) return;}
    }
    // console.log(2, JSON.stringify(l, null, "  "));
    {
        const b = match(list(addr(), v, addr(), addr(), addr()), l);
        while ((yield b)) {if ((yield true) === false) return;}
    }
    // console.log(3, JSON.stringify(l, null, "  "));
    {
    const b = match(list(addr(), addr(), v, addr(), addr()), l);
    while (yield b) {if ((yield true) === false) return;}
    }
    {const b = match(list(addr(), addr(), addr(), v, addr()), l);
    while (yield b) {if ((yield true) === false) return;}
    }
    {
        const b = match(list(addr(), addr(), addr(), addr(), v), l);
        while (yield b) {if ((yield true) === false) return;}
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

const puzzle = function* (houses) {
    let a, b, c, d, e, f, g, h, i, j, k, l, m, n;
    a = exists(house('red', 'england', addr(), addr(), addr()), houses);
    while ((yield a) && (b = exists(house(addr(), 'spain', 'dog', addr(), addr()), houses)))
    while ((yield b) && (c = exists(house('green', addr(), addr(), 'coffee', addr()), houses)))
    while ((yield c) && (d = exists(house(addr(), 'ukraine', addr(), 'tea', addr()), houses)))
    while ((yield d) && (e = rightOf(house('green', addr(), addr(), addr(), addr()), house('ivory', addr(), addr(), addr(), addr()), houses)))
    while ((yield e) && (f = exists(house(addr(), addr(), 'snails', addr(), 'fantasy'), houses)))
    while ((yield f) && (g = exists(house('yellow', addr(), addr(), addr(), 'sci-fi'), houses)))
    while ((yield g) && (h = middle(house(addr(), addr(), addr(), 'milk', addr()), houses)))
    while ((yield h) && (i = first(house(addr(), 'norweigh', addr(), addr(), addr()), houses)))
    while ((yield i) && (j = nextTo(house(addr(), addr(), addr(), addr(), 'romance'), house(addr(), addr(), 'fox', addr(), addr()), houses)))
    while ((yield j) && (k = nextTo(house(addr(), addr(), addr(), addr(), 'sci-fi'), house(addr(), addr(), 'horses', addr(), addr()), houses)))
    while ((yield k) && (l = exists(house(addr(), addr(), addr(), 'orange-juice', 'comedy'), houses)))
    while ((yield l) && (m = exists(house(addr(), 'japan', addr(), addr(), 'action'), houses)))
    while ((yield m) && (n = nextTo(house(addr(), 'norweigh', addr(), addr(), addr()), house('blue', addr(), addr(), addr(), addr()), houses)))
    while (yield n) if ((yield true) as boolean === false) return;
};

(async () => {
    const h = addr();
    if (ask(puzzle(h))) {
        console.log(JSON.stringify(formatAddress(h), null, "  "));
    } else {
        console.log('no answer');
    }
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
