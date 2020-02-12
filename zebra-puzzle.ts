// house(color, nation, pet, drink, movie genre)

import {Ptr, bind, bound, unbound, value, ref, read, UnboundAddress, BoundAddress, bind2, bindUnbound} from '.';

enum Color {Red}
enum Nation {Japan}
enum Pet {Dog}
enum Drink {OrangeJuice}
enum MovieGenre {SciFi}

type House = [Ptr<Color>, Ptr<Nation>, Ptr<Pet>, Ptr<Drink>, Ptr<MovieGenre>];
type List = [Ptr<House>, Ptr<House>, Ptr<House>, Ptr<House>, Ptr<House>];

const list = function(a, b, c, d, e): List {
    return [a, b, c, d, e];
}

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
    let b = bind(v, l[0]);
    while (yield b) if ((yield true) === false) return;
    b = bind(v, l[1]);
    while (yield b) if ((yield true) === false) return;
    b = bind(v, l[2]);
    while (yield b) if ((yield true) === false) return;
    b = bind(v, l[3]);
    while (yield b) if ((yield true) === false) return;
    b = bind(v, l[4]);
    while (yield b) if ((yield true) === false) return;
}

exists(a, list(a, _, _, _, _))
exists(a, list(_, a, _, _, _))
exists(a, list(_, _, a, _, _))
exists(a, list(_, _, _, a, _))
exists(a, list(_, _, _, _, a))

rightOf(a, b, list(b, a, _, _, _))
rightOf(a, b, list(_, b, a, _, _))
rightOf(a, b, list(_, _, b, a, _))
rightOf(a, b, list(_, _, _, b, a))

nextTo(a, b, list(b, a, _, _, _))
nextTo(a, b, list(_, b, a, _, _))
nextTo(a, b, list(_, _, b, a, _))
nextTo(a, b, list(_, _, _, b, a))
nextTo(a, b, list(a, b, _, _, _))
nextTo(a, b, list(_, a, b, _, _))
nextTo(a, b, list(_, _, a, b, _))
nextTo(a, b, list(_, _, _, a, b))

middle(a, list(_, _, a, _, _))

first(a, list(a, _, _, _, _))

puzzle(houses)
    exists(house(red, england, _, _, _), houses)
    exists(house(_, spain, dog, _, _), houses)
    exists(house(green, _, _, coffee, _), houses)
    exists(house(_, ukraine, _, tea, _), houses)
    rightOf(house(green, _, _, _, _), house(ivory, _, _, _, _), houses)
    exists(house(_, _, snails, _, fantasy), houses)
    exists(house(yellow, _, _, _, sci-fi), houses)
    middle(house(_, _, _, milk, _), houses)
    first(house(_, norweigh, _, _, _), houses)
    nextTo(house(_, _, _, _, romance), house(_, _, fox, _, _), houses)
    nextTo(house(_, _, _, _, sci-fi), house(_, _, horses, _, _), houses)
    exists(house(_, _, _, orange juice, comedy), houses)
    exists(house(_, japan, _, _, action), houses)
    exists(house(_, norweigh, _, _, _), houses)
