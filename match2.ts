// enum ReferenceType {
//     Object,
//     Array,
//     Local,
//     Anonymous,
// }

// // type ReferenceTarget<T extends ReferenceType> = (
// //     T extends ReferenceType.Key ? {} :
// //     T extends ReferenceType.Index ? [] :
// //     T extends ReferenceType.Rest ? [] :
// //     T extends ReferenceType.Local ? {} :
// //     T extends ReferenceType.Anonymous ? any :
// //     never
// // );

// type ReferenceProperty<T extends ReferenceType> = (
//     T extends ReferenceType.Object ? object :
//     T extends ReferenceType.Array ? any[] :
//     T extends ReferenceType.Local ? Local :
//     any
// );

// class Reference<T extends ReferenceType = any, P extends ReferenceProperty<T> = ReferenceProperty<T>> {
//     type: T;
//     scope;
//     property: P;

//     constructor(type: T) {
//         this.type = type;
//     }

//     static newLocalReference(scope, local: Local) {
//         return new LocalReference(scope, local);
//     }

//     static newArrayReference(scope, array: any[]) {
//         const ref = new Reference(ReferenceType.Array);
//         ref.scope = scope;
//         ref.property = array;
//         return ref;
//     }

//     static newObjectReference(scope, object: object) {
//         const ref = new Reference(ReferenceType.Object);
//         ref.scope = scope;
//         ref.property = object;
//         return ref;
//     }

//     static newReference(scope, value): DynamicReference {
//         if (isLocal(value)) return Reference.newLocalReference(scope, value);
//         if (isArray(value)) return Reference.newArrayReference(scope, value);
//         if (isObject(value)) return Reference.newObjectReference(scope, value);
//         return value;
//     }

//     static isReference(value: any): value is Reference {
//         return value instanceof Reference;
//     }

//     static dereference(value: DynamicReference): Value {
//         if (Reference.isReference(value)) {
//             if (value.isLocalReference()) {
//                 return value.scope[value.property.name];
//             } else {
//                 return value.property;
//             }
//         }
//         return value;
//     }

//     static isObjectReference(value: any): value is Reference<ReferenceType.Object> {
//         return Reference.isReference(value) && value.isObjectReference();
//     }

//     isObjectReference(): this is Reference<ReferenceType.Object> {
//         return this.type === ReferenceType.Object;
//     }

//     isArrayReference(): this is Reference<ReferenceType.Array> {
//         return this.type === ReferenceType.Array;
//     }

//     isLocalReference(): this is Reference<ReferenceType.Local> {
//         return this.type === ReferenceType.Local;
//     }

//     isAnonymousReference(): this is Reference<ReferenceType.Anonymous> {
//         return this.type === ReferenceType.Anonymous;
//     }

//     read(): Reference {
//         if (this.isLocalReference()) {
//             const nextRef = this.property.read(this.scope);
//             if (isReference(nextRef)) return nextRef.read();
//         }
//         return this;
//     }
// }

// class ObjectReference extends Reference<ReferenceType.Object> {
//     read(): Reference {
//         return this;
//     }
// }

// class LocalReference extends Reference<ReferenceType.Local> {
//     constructor(scope, local: Local) {
//         super(ReferenceType.Local);
//         this.scope = scope;
//         this.property = local;
//     }

//     isObjectReference(): this is Reference<ReferenceType.Object> {
//         return false;
//     }

//     isArrayReference(): this is Reference<ReferenceType.Array> {
//         return false;
//     }

//     isLocalReference(): this is Reference<ReferenceType.Local> {
//         return true;
//     }

//     read(): Reference {
//         const nextRef = this.property.read(this.scope);
//         if (isReference(nextRef)) return nextRef.read();
//         return this;
//     }
// }

// class Local {
//     name: string;

//     constructor(name: string) {
//         this.name = name;
//     }

//     static isLocal(value: any): value is Local {
//         return this instanceof Local;
//     }

//     read(scope) {
//         return scope[this.name];
//     }

//     writeScoped(scope, valueScope, value) {
//         if (isArray(value)) {}
//     }

//     newReference(scope) {
//         return Reference.newLocalReference(scope, this);
//     }
// }

// function local(name: string) {
//     return new Local(name);
// }

// class Op {
//     code: string;

//     constructor(code: string) {
//         this.code = code;
//     }

//     static get noop() {
//         return new Op('noop');
//     }
// }

// class OpPath {
//     readonly parent: OpPath;
//     readonly op: Op;
//     readonly property: string | number;

//     constructor(parent: OpPath, op: Op, property: string | number) {
//         this.parent = parent;
//         this.op = op;
//         this.property = property;
//     }

//     get code() {
//         return this.op.code;
//     }

//     get(property: string) {
//         return new OpPath(this, this.op[property], property);
//     }

//     replaceWith(op: Op) {
//         this.parent.op[this.property] = op;
//         return new OpPath(this.parent, op, this.property);
//     }
// }

// function compile(path: OpPath, [caller, args]: [(args: any[], segment: OpPath) => OpPath, any[]]) {
//     return caller(args, path);
// }

// class BlockTest extends Op {
//     test: Op;
//     nextBlock: Op;

//     constructor(test: Op, nextBlock: Op) {
//         super('block-test');
//         this.test = test;
//         this.nextBlock = nextBlock;
//     }
// }

// function block(args: any[], path: OpPath) {
//     let nextBlock = new Op('noop');
//     args.reverse().forEach(([caller, callArgs]) => {
//         path = caller(callArgs, path);
//         path = path.replaceWith(new BlockTest(path.op, nextBlock));
//         nextBlock = path.op;
//     });
//     return path;
// }

// [block, [

// ]];

// class BranchTrue extends Op {
//     test: Op;

//     constructor(test: Op) {
//         super('branch-true');
//         this.test = test;
//     }
// }

// class BranchFalse extends Op {
//     test: Op;
//     nextBranch: Op;

//     constructor(test: Op, nextBranch: Op) {
//         super('branch-false');
//         this.test = test;
//         this.nextBranch = nextBranch;
//     }
// }

// type OpFactory<Args extends any[] = any[]> = (args: Args, path: OpPath) => OpPath;

// function branch(args: [OpFactory, any[]][], path: OpPath) {
//     let nextBranch = new Op('noop');
//     args.reverse().forEach(([caller, callArgs]) => {
//         path = caller(callArgs, path);
//         path = path.replaceWith(new BranchFalse(path.op, nextBranch));
//         nextBranch = path.op;
//     });
//     path = path.replaceWith(new BranchTrue(path.op));
//     return path;
// }

// function op_matchRefRef(r1, r2) {

// }

// function op_matchValueRef(v1, r2) {

// }

// function op_matchRefValue(r1, v2) {

// }

// function op_matchLocalLocal(scope, [l1, l2]) {

// }

// function op_matchValueLocal(scope, args) {

// }

// function op_matchLocalValue(scope, args) {

// }

// function op_matchArrayLocal(scope, [a1, l2]) {

// }

// function op_matchLocalArray(scope, [l1, a2]) {
    
// }

// type Primitive = boolean | string | number | symbol | undefined | null;

// type Value = Primitive | {} | [];

// type DynamicReference = Value | Reference;

// type StaticReference = Value | Local;

// type AnyReference = Value | Reference | Local;

// type Scope = {};

// class Thread {
//     scope;

//     dereference(local: AnyReference): DynamicReference {
//         if (!this.scope[local.scopeName]) {
//             const ref = this.scope[local.scopeName] = new Reference(ReferenceType.Local);
//             ref.target = this.scope;
//             ref.property = local.scopeName;
//         }
//         const scopeItem = this.scope[local.scopeName];
//         return this.scope[local.scopeName];
//     }
// }

// // Local | Reference | object | any[] | string | number | boolean | symbol | null

// function op_match(thread: Thread, [left, right]: [AnyReference, AnyReference]) {
//     left = thread.dereference(left);
//     right = thread.dereference(right);
//     const leftValue = Reference.dereference(left);
//     const rightValue = Reference.dereference(right);
// }

// function composeTests<Args extends any[]>(...fns: ((thread, args: Args) => boolean)[]) {
//     return function(thread, args: Args) {
//         for (let i = 0; i < fns.length; i++) {
//             if (fns[i](thread, args)) {
//                 return true;
//             }
//         }
//         return false;
//     };
// }

// type Test<Result extends boolean = boolean, Args extends any[] = any[]> = (...args: Args) => Result;

// function someTest<Args extends any[]>(...tests: ((...args: Args) => boolean)[]): (...args: Args) => boolean {
//     return function(...args: Args) {
//         return tests.some(test => test(...args));
//     };
// }

// type EveryTest<Result> = Result;

// function everyTest<Result extends Test, Args extends any[] = Parameters<Result>>(...tests: Test[]): EveryTest<Result> {
//     return function(...args: Args) {
//         return tests.every(test => test(...args));
//     } as Result;
// }

// // const isMatch = composeTests(
// //     (t, [left, right]) => 
// // );

// const {isArray} = Array;
// const {isReference} = Reference;
// const {isLocal} = Local;

// function isObject(value): value is object {
//     return typeof value === 'object' && value !== null && !isArray(value);
// }

// function isArrayMatch(leftScope: Scope, left: [], leftOffset, rightScope: Scope, right: [], rightOffset) {
// }

// function isObjectMatch(scopeLeft, left, scopeRight, right) {
// }

// const arg = (fn: Test) => (index: number) => ((thread, args) => fn(thread, args[index])) as Test;

// const isUndefined = value => typeof value === 'undefined';
// const isDefined = value => typeof value !== 'undefined';
// const isDefinedLocal = everyTest((thread, local) => isLocal(local), (thread, local: Local) => isDefined(local.read(thread)));

// const isMatch = someTest(
//     everyTest(
//         (t, a, b) => isDefined(a),
//         (t, a, b) => isDefined(b),
//         (t, a, b) => a === b,
//     ),
//     everyTest(
//         (t, a, b) => isLocal(a),
//         (t, a, b) => isMatch(t, a.read(t), b),
//     ),
//     everyTest(
//         (t, a, b) => isLocal(b),
//         (t, a, b) => isMatch(t, a, b.read(t)),
//     ),
//     everyTest(
//         (t, a, b) => isReference(a),
//         (t, a, b) => isMatch(t, a.read().property, b),
//     ),
//     everyTest(
//         (t, a, b) => isReference(b),
//         (t, a, b) => isMatch(t, a, b.read().property),
//     ),
//     everyTest(
//         (t, a, b) => isLocal(b),
//         (t, a, b) => isDefined(a.read(t)),
//     ),
//     everyTest(
//         (t, [a, b]) => isLocal(a),
//         (t, [a, b]) => isDefined(a.read(t)),
//         (t, [a, b]) => isLocal(b),
//         (t, [a, b]) => isDefined(b.read(t)),
//         (t, [a, b]) => isMatch(t, a.read(t), b.read(t)),
//     ),
// );

// // function isMatch(thread, [left, right]) {
// //     let leftScope = thread.scope;
// //     let leftValue;
// //     let rightScope = thread.scope;
// //     let rightValue;
// //     if (isLocal(left)) leftValue = left.read(leftScope);
// //     if (isLocal(right)) rightValue = right.read(rightScope);
// //     if (isReference(left)) 
// //     if (isLocal(left) && isLocal(right)) 
// //     else if (isReference(left) && isReference(right)) 
// // }

// class MatchError extends Op {
//     message: string;

//     constructor(message: string) {
//         super('match-error');
//         this.message = message;
//     }
// }

// type MatchPair<T> = [T, T] | [T, Local] | [Local, T];

// class MatchBase<T, P extends MatchPair<T> = MatchPair<T>> extends Op {
//     left: P[0];
//     right: P[1];

//     constructor(code: string, pair: P) {
//         super(code);
//         this.left = pair[0];
//         this.right = pair[1];
//     }
// }

// class MatchValue<P extends MatchPair<Primitive>> extends MatchBase<Primitive, P> {
//     constructor(pair: P) {
//         super('match-value', pair);
//     }
// }

// class MatchLocal<P extends [Local, Local]> extends MatchBase<Local, P> {
//     constructor(pair: P) {
//         super('match-local', pair);
//     }
// }

// class MatchObject<P extends MatchPair<{}>> extends MatchBase<{}, P> {
//     constructor(pair: P) {
//         super('match-object', pair);
//     }
// }

// class MatchKey<P extends MatchPair<string>> extends MatchBase<string, P> {
//     constructor(pair: P) {
//         super('match-key', pair);
//     }
// }

// class MatchArray<P extends MatchPair<any[]>> extends MatchBase<any[], P> {
//     constructor(pair: P) {
//         super('match-array', pair);
//     }
// }

// class MatchIndex<P extends MatchPair<number>> extends MatchBase<number, P> {
//     constructor(pair: P) {
//         super('match-index', pair);
//     }
// }

// class MatchRest extends Op {}

// function match([a, b]: [any, any], path: OpPath) {
//     if (Local.isLocal(a) || Local.isLocal(b)) {
//         if (Local.isLocal(a) && Local.isLocal(b)) {
//             path = path.replaceWith(new MatchLocal([a, b]));
//         } else if (Local.isLocal(a) && Array.isArray(b)) {
//             path = path.replaceWith(new MatchArray([a, b]));
//         } else if (Array.isArray(a) && Local.isLocal(b)) {
//             path = path.replaceWith(new MatchArray([a, b]));
//         } else if (Local.isLocal(a) && typeof b === 'object') {
//         } else if (typeof a === 'object' && Local.isLocal(b)) {
//         } else if (Local.isLocal(a)) {
//             path = path.replaceWith(new MatchValue([a, b]));
//         } else if (Local.isLocal(b)) {
//             path = path.replaceWith(new MatchValue([a, b]));
//         }
//     } else if (Array.isArray(a) || Array.isArray(b)) {
//         if (Array.isArray(a) && Array.isArray(b)) {
//             path = path.replaceWith(new MatchArray([a, b]));
//         } else {
//             path = path.replaceWith(new MatchError('can match arrays, array and reference or local'));
//         }
//     } else if (typeof a === 'object' || typeof b === 'object') {
//         if (typeof a === 'object' && typeof b === 'object') {

//         } else {

//         }
//     }
// }

// [match, [1, 1]];
// [match, [{a: 1}, {a: 1}]];
// [match, [{a: 1, b: local('a')}, {a: local('a'), b: 1}]];
