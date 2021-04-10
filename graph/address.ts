import {ListResource, Resource, StackedResource} from './resource';

export interface AddressHistoryMarker {}

export interface AddressHistory {
    assign(address: DataAddress<any>, value: any): void;
    markStart(): AddressHistoryMarker;
    markEnd(): AddressHistoryMarker;
    revert(start: AddressHistoryMarker, stop?: AddressHistoryMarker): void;
}

class AssignmentHistoryNull implements AddressHistory {
    assign(address: DataAddress<any>, value: any): void {
        address.value = value;
    }
    markStart(): AddressHistoryMarker {
        return null;
    }
    markEnd(): AddressHistoryMarker {
        return null;
    }
    revert(start: AddressHistoryMarker, stop?: AddressHistoryMarker): void {}
}

// class Resource<T extends {next: T}> {
//     constructor(public next: T = null) {}

//     static push<T extends {next: T}>(free: Resource<T>, item: T): T {
//         if (!free) return null;
//         const next = item.next;
//         item.next = free.next;
//         free.next = item;
//         return next;
//     }

//     static pop<T extends {next: T}>(free: Resource<T>): T {
//         if (!free) return null;

//         const item = free.next;
//         free.next = free.next.next;
//         item.next = null;
//         return item;
//     }
// }

class AHItem {
    address: DataAddress<any>;
    lastValue: any;

    set(address: DataAddress<any>, lastValue: any) {
        this.address = address;
        this.lastValue = lastValue;
        return this;
    }
}

class AHLItem {
    address: DataAddress<any>;
    lastValue: any;
    next: AHLItem = null;

    constructor() {}

    set(address: DataAddress<any>, lastValue: any, next: AHLItem) {
        this.address = address;
        this.lastValue = lastValue;
        this.next = next;
        return this;
    }

    setHead(next: AHLItem) {
        this.next = next;
        return this;
    }

    clear() {
        this.address = null;
        this.lastValue = null;
        this.next = null;
        return this;
    }
}

export class AddressHistoryList implements AddressHistory {
    head: AHLItem;

    constructor(public resource: Resource<AHLItem> = new ListResource(() => new AHLItem())) {
        this.head = resource.create();
    }

    assign(address: DataAddress<any>, value: any) {
        this.head = this.resource.create().setHead(this.head.set(address, address.value, this.head.next));
        address.value = value;
    }
    markStart(): AddressHistoryMarker {
        return this.head.next;
    }
    markEnd(): AddressHistoryMarker {
        return this.head;
    }
    revert(_start: AddressHistoryMarker, _end: AddressHistoryMarker = this.head) {
        const start = _start as AHLItem;
        let end = _end as AHLItem;
        while (end.next !== start) {
            const {next} = end;
            this.resource.destroy(end.next.clear());
            end.next = next;
        }
    }
}

const isDataAddressSymbol = Symbol.for('address');
const dataAddressDataSymbol = Symbol.for('data');

export type Data<T> = DataAddress<T> | T;

export interface DataAddress<T> {
    readonly [dataAddressDataSymbol]: any;
    value: T;
    bind(data: any): DataAddress<T>;
    cloneValue(data: any, cycleMap?: Map<any, any>): T;
    readonly [isDataAddressSymbol]: true;
}

export function isDataAddress<T>(addr: any): addr is DataAddress<T> {
    return addr && addr[isDataAddressSymbol];
}

function getBinding<T>(addr: DataAddress<T>, data: any) {
    return addr ? addr[dataAddressDataSymbol] ?? data : data;
}

export function cloneValue(value: any, data: any, cycleMap = new Map()) {
    if (isDataAddress(value)) {
        return value.cloneValue(data, cycleMap);
    } else if (Array.isArray(value)) {
        return value.map(item => cloneValue(item, data, cycleMap));
    } else if (typeof value === 'object' && value) {
        const clone = {};
        for (const key of Object.keys(value)) {
            clone[key] = cloneValue(value[key], data, cycleMap);
        }
        return clone;
    }
    return value;
}

let nextAnonymousId = 0;

class DataAnonymousAddress<T> implements DataAddress<T> {
    uniqueId: string = `_${nextAnonymousId++}`;

    get [dataAddressDataSymbol]() {
        return null;
    }
    get [isDataAddressSymbol](): true {
        return true;
    }

    get value() {
        return null;
    }
    set value(value: T) {
        throw new Error('unbound');
    }

    bind(data: any): DataAddress<T> {
        throw new Error('unbindable');
    }

    cloneValue(data: any, cycles = new Map()) {
        return this as DataAddress<T>;
    }
}

class DataNullNameAddress<T> implements DataAddress<T> {
    constructor(public member: string) {}

    get [dataAddressDataSymbol]() {
        return null;
    }

    get value(): T {
        return undefined;
    }
    set value(value: T) {
        throw new Error('unbound');
    }

    bind(data: any) {
        return new DataNameAddress<T>(this.member, data);
    }

    cloneValue(data: any, cycles = new Map()) {
        let cycleData = cycles.get(data);
        if (!cycleData) {
            cycleData = {};
            cycles.set(data, cycleData);
        }
        if (this.member in cycleData) {
            return cycleData[this.member];
        } else if (this.member in data) {
            let source = data[this.member];
            if (!source || typeof source !== 'object') {
                cycleData[this.member] = source;
            } else {
                cycleData[this.member] = cloneValue(source, data, cycles);
            }
            return cycleData[this.member];
        } else {
            cycleData[this.member] = new DataAnonymousAddress();
            return cycleData[this.member];
        }
    }

    get [isDataAddressSymbol](): true {
        return true;
    }
}

class DataNameAddress<T> implements DataAddress<T> {
    constructor(public member: string, public data: object) {}

    get [dataAddressDataSymbol]() {
        return this.data;
    }
    get [isDataAddressSymbol](): true {
        return true;
    }

    get value(): any {
        return this.data[this.member];
    }
    set value(value: any) {
        this.data[this.member] = value;
    }

    bind(data: any) {
        return this;
    }

    cloneValue(_data: any, cycles = new Map()) {
        const {data} = this;
        let cycleData = cycles.get(data);
        if (!cycleData) {
            cycleData = {};
            cycles.set(data, cycleData);
        }
        if (this.member in cycleData) {
            return cycleData[this.member];
        } else if (this.member in data) {
            let source = data[this.member];
            if (!source || typeof source !== 'object') {
                cycleData[this.member] = source;
            } else {
                cycleData[this.member] = cloneValue(source, data, cycles);
            }
            return cycleData[this.member];
        } else {
            cycleData[this.member] = new DataAnonymousAddress();
            return cycleData[this.member];
        }
    }
}

// class Slice<T> {
//     data: T[];
//     offset: number;
//     length: number;
// }

// class DataArrayAddress implements DataAddress<number, any[]> {
//     member: number;
//     data: any[];
// }

// class Data

export function a<T>(strings: TemplateStringsArray): DataAddress<T> {
    return new DataNullNameAddress<T>(strings[0]);
}

const a1 = a`a`;

export function match<T1, T2>(scope: {addressHistory: AddressHistory}, a: DataAddress<T1> | T1, ad: any, b: DataAddress<T2> | T2, bd: any): boolean {
    const {addressHistory: assignments} = scope;

    let aClose: DataAddress<T1>;
    while (isDataAddress(a)) aClose = a.bind(ad), a = aClose.value;
    const aData = getBinding(aClose, ad);

    let bClose: DataAddress<T2>;
    while (isDataAddress(b)) bClose = b.bind(bd), b = bClose.value;
    const bData = getBinding(bClose, bd);

    if (typeof a !== 'undefined' && typeof b !== 'undefined' && a as any === b as any) {
        return true;
    }
    if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
        if (Array.isArray(a) && Array.isArray(b)) {
            if (a.length !== b.length) return false;
            const l = a.length;
            for (let i = 0; i < l; i++) {
                if (!match(scope, a[i], aData, b[i], bData)) return false;
            }
            return true;
        } else {
            for (const key of Object.keys(a)) {
                if (!b.hasOwnProperty(key)) return false;
                if (!match(scope, a[key], aData, b[key], bData)) return false;
            }
            for (const key of Object.keys(b)) {
                if (!a.hasOwnProperty(key)) return false;
            }
            return true;
        }
    }
    if (aClose && typeof a === 'undefined') {
        if (bClose) {
            assignments.assign(aClose.bind(aData), bClose.bind(bData));
            return true;
        } else if (typeof b !== 'undefined') {
            assignments.assign(aClose.bind(aData), b);
            return true;
        }
        return false;
    }
    if (bClose && typeof b === 'undefined') {
        if (typeof a !== 'undefined') {
            assignments.assign(bClose.bind(bData), a);
            return true;
        }
        return false;
    }
}

// function cloneAddressed(obj: any, data: any, cycle = new Map()): any {
//     if (!obj || typeof obj !== 'object') return obj;
//     if (isDataAddress(obj)) {
//         if (cycle.has(data)) {
//             if (obj.cloneValue() cycle.get(data)[obj.name])
//         }
//         const value = obj.value;
//     }

//     let stack = [[
//         obj,
//         Array.isArray(obj) ? [] : {},
//         Array.isArray(obj) ? null : Object.keys(obj),
//         Array.isArray(obj) ? obj.length : 0,
//     ]];
//     let cycleMap = new Map();
//     while (stack.length) {
//         const [source, dest, keys, index] = stack[stack.length - 1];
//         const key = keys !== null ? keys[index] : index;
//         stack[stack.length - 1][3] = index + 1;

//         const value = source[key];
//         if (typeof value === 'object') {
//             if (isDataAddress(value)) {
//                 if (!cycleMap.has(value)) {
//                     cycleMap.set(value, {});
//                 }
//             }
//         }
//     }
// }

if (process.mainModule === module) {
    main();
}

function main() {
    const scope = {
        addressHistory: new AssignmentHistoryNull(),
    };

    function expect(cond, message): asserts cond {
        if (!cond) {
            throw new Error(message);
        }
        process.stdout.write('.');
    }

    expect(match(scope, {}, null, {}, null), 'empty objects must match');
    expect(match(scope, {a: 1}, null, {a: 1}, null), 'simple object must match');
    expect(!match(scope, {a: 1}, null, {a: 1, b: 2}, null), 'object with extra key in b must not match');
    expect(match(scope, {a: {b: 1}}, null, {a: {b: 1}}, null), 'nested objects must match');
    expect(!match(scope, {a: {b: 1}}, null, {a: {}}, null), 'nested object missing key must not match');

    expect(match(scope, [], null, [], null), 'empty arrays must match');
    expect(match(scope, [1], null, [1], null), 'simple array must match');
    expect(!match(scope, [1], null, [1, 2], null), 'array with extra key in b must not match');
    expect(match(scope, [[1]], null, [[1]], null), 'nested arrays must match');
    expect(!match(scope, [[1]], null, [[]], null), 'nested array missing key must not match');

    let d;

    d = {};
    expect(match(scope, a`a`, d, 1, null), 'address must be assigned');
    expect(match(scope, a`a`, d, 1, null), 'address compares stored value');
    expect(!match(scope, a`a`, d, 2, null), 'address stored value must not match');
    expect(match(scope, a`a`, {a: a`b`.bind({b: 1})}, 1, null), 'bound address in data must be compared');
    expect(match(scope, [a`b`, a`b`], d, [1, 1], null), 'repeated address assigns and compares stored value');
    expect(match(scope, a`a`, {a: {b: 1}}, {b: 1}, null), 'address to stored object must compare to literal');
    expect(match(scope, {b: 1}, null, a`a`, {a: {b: 1}}), 'literal compares to address to stored object');
    expect(match(scope, a`a`, {a: {a: a`b`.bind({b: 1})}}, {a: 1}, null), 'address to object with nested address compares to literal');
    expect(match(scope, {a: 1}, null, a`a`, {a: {a: a`b`.bind({b: 1})}}), 'literal compares to address to object with nested address');
    expect(match(scope, {a: a`a`}, {a: 1}, a`b`, {b: {a: a`c`.bind({c: 1})}}), 'object with address can compare with address to nested address in data');

    expect(match(scope, [a`a`, a`a`], {}, [a`b`, 1], {}), '[a, a] = [b, 1]');
    expect(match(scope, [a`a`, 1], {}, [a`b`, a`b`], {}), '[a, 1] = [b, b]');

    process.stdout.write('\n');
}
