import { sep } from "path";

export type Syntax = RootSyntax | AndSyntax | OrSyntax | CallSyntax;

export class RootSyntax {
    type = 'root' as const;
    constructor(public node: Syntax) {}
}

export class AndSyntax {
    type = 'and' as const;
    constructor(public left: Syntax, public right: Syntax) {}
}

export class OrSyntax {
    type = 'or' as const;
    constructor(public left: Syntax, public right: Syntax) {}
}

export class CallSyntax {
    type = 'call' as const;
    constructor(public func: string | FuncSyntax, public args: any[]) {}
}

export function isSyntax(syntax: any): syntax is Syntax {
    return syntax && ['and', 'or', 'call'].includes(syntax.type);
}

export class FuncSyntax {
    type = 'func' as const;
    constructor(public args: any[], public code: Syntax, public next: FuncSyntax) {}
}

export type CodeBuilder<Code, Plugins> = {
    readonly code: Code;
    readonly plugins: Plugins;
    func(args: any[], code?: Code | CodeBuilder<any, any>): FuncSyntax;
    register<N extends string, CP extends CodePlugin>(name: N, plugin: CP): CodeBuilder<Code, Plugins & NewPlugin<N, CP>>;
} & Plugins;

type NewPlugin<N extends string, CP extends CodePlugin> = {[name in N]: (...args: CodePluginArgs<CP>) => CodeBuilder<ReturnType<CP>, NewPlugin<N, CP>>};

interface CodePlugin<Args extends any[] = any[]> {
    (...args: Args): Syntax;
}

type CodePluginArgs<CP> = CP extends CodePlugin<infer Args> ? Args : never;

export function getCode(code: {code: Syntax} | Syntax): Syntax {
    if ('code' in code) {
        return code.code;
    }
    return code as Syntax;
}

type Builder<P extends {[key: string]: CodePlugin}> = {
    readonly code: Syntax;

    create(code: {code: Syntax} | Syntax): Builder<P>;
    and(code: {code: Syntax} | Syntax): Builder<P>;
    or(code: {code: Syntax} | Syntax): Builder<P>;
    register<N extends string, CP extends CodePlugin>(name: N, plugin: CP): Builder<P & {[key in N]: CP}>;
} & {
    [key in Exclude<keyof P, 'code' | 'create' | 'and' | 'or' | 'register'>]: (...args: CodePluginArgs<P[key]>) => Builder<P>;
};

export function createBuilder(): Builder<{}> {
    function extendBuilder<P extends {[key: string]: CodePlugin}, N extends string, CP extends CodePlugin>(B: Builder<P>, name: N, plugin: CP): Builder<P & {[key in N]: CP}> {
        const B_ = class extends (B as any) {
            [name](...args: CodePluginArgs<CP>) {
                if (this.code === null) {
                    return this.create(plugin.call(this, ...args));
                }
                return this.and(plugin.call(this, ...args));
            }
            register<NN extends string, CPCP extends CodePlugin>(name: N, plugin: CP): Builder<P & {[key in N]: CP} & {[key in NN]: CPCP}> {
                return extendBuilder(B_, name, plugin);
            }
        } as any;
        return new B_(null) as any;
    }
    const B = class {
        constructor(public readonly code: Syntax) {}
        create(code: {code: Syntax} | Syntax) {
            return new (this.constructor as any)(getCode(code));
        }
        and(right: {code: Syntax} | Syntax) {
            return this.create({type: 'and', left: this.code, right: getCode(right)});
        }
        or(right: {code: Syntax} | Syntax) {
            return this.create({type: 'or', left: this.code, right: getCode(right)});
        }
        register<N extends string, CP extends CodePlugin>(name: N, plugin: CP): Builder<{} & {[key in N]: CP}> {
            return extendBuilder(B as any, name, plugin);
        }
    };
    return new B(null) as any;
}

// function extendBuilder<Plugins extends {[key: string]: CodePlugin}, N extends string, CP extends CodePlugin>(Builder: new (code: Syntax) => BaseBuilder & Plugins, name: N, plugin: CP) {
//     return class ExtendedBuilder extends Builder {
//         [name](...args: CodePluginArgs<CP>) {
//             return new (this.constructor as any)({})
//         }
//         register<N extends string, CP extends CodePlugin>(name: N, plugin: CP) {
//             return extendBuilder(ExtendedBuilder, name, plugin);
//         }
//     }
// }

// class BaseBuilder {
//     constructor(public readonly code: Syntax) {}

//     func(args: any[], code = null) {
//         return new Func(args, code);
//     }

//     register<N extends string, CP extends CodePlugin>(name: N, plugin: CP) {
//         class ExtendedBuilder extends BaseBuilder {
//             [name](...args: CodePluginArgs<CP>) {
//                 return new (this.constructor as any)({type: 'and', left: this.code, right: plugin.call(this, ...args)});
//             }
//         }
//         return new ExtendedBuilder(this.code);
//     }
// }

// const BaseBuilder = createBuilder();

export function isCodeBuilder<Code>(builder: any): builder is CodeBuilder<Code, {}> {
    return builder && builder.code && builder.plugins;
}

// function codeBuilder<C extends Code, P extends NewPlugin<string, CodePlugin>>(code: C = null, plugins: P = null): CodeBuilder<C, P> {
//     return {
//         get code() {
//             return code;
//         },
//         get plugins() {
//             return plugins;
//         },
//         register<N extends string, CP extends CodePlugin>(name: N, plugin: CP) {
//             return codeBuilder(code, {...plugins, [name]: (...args: CodePluginArgs<CP>) => codeBuilder({type: 'and', left: code, right: plugin(...args)})});
//         },
//         ...plugins,
//     };
// }

function assign<O, P extends string, V>(o: O, p: P, v: V) {
    return {...o, [p]: v} as O & {[key in P]: V};
}

const a = assign({}, 'a', 1);

// const b1 = new BaseBuilder(null) as CodeBuilder<Syntax, {}>;
// const b2 = b1.register('call', (func: string | Func, ...args: any[]) => ({type: 'call', func, args}));
// const b3 = b2.call('get', 'a', 'key', 'value');
// const f1 = b2.func([], b3);
// const b4 = b3.call(f1);
// const b5 = b2.register('get', function(obj, key, value) {return this.call('get', obj, key, value);});
// const b6 = b5.get('a', 'key', 'value');

// export type AndShortSyntax = ShortSyntax[];
// export type OrShortSyntax = [ShortSyntax][];
// export type CallShortSyntax = [method: string | FactShortSyntax | FuncShortSyntax, args: any[]];

// export type FactShortSyntax = [fact: [methodName: string, args: any[]]];
// export type FuncShortSyntax = [func: [methodName: string, args: any[]], block: ShortSyntax];

// export type ShortSyntax = AndShortSyntax | OrShortSyntax | CallShortSyntax;

// export type DatabaseShortSyntax = (FactShortSyntax | FuncShortSyntax)[];

// function parseShort(value: ShortSyntax) {

// }

// function toShort(value: Syntax) {

// }

const PARAM_OPEN_TERM = '(' as const;
const PARAM_CLOSE_TERM = ')' as const;
const CURLY_OPEN_TERM = '{' as const;
const CURLY_CLOSE_TERM = '}' as const;
const SQUARE_OPEN_TERM = '[' as const;
const SQUARE_CLOSE_TERM = ']' as const;
const DOT_TERM = '.' as const;
const COMMA_TERM = ',' as const;
const COLON_TERM = ':' as const;
const SEMICOLON_TERM = ';' as const;
const COLON_DASH_TERM = ':-' as const;
const SINGLE_QUOTE_TERM = '\'' as const;
const BACKSLASH_TERM = '\\' as const;
const SPREAD_TERM = '...' as const;
const SINGLE_LINE_COMMENT_TERM = '//' as const;
const MULTI_LINE_OPEN_TERM = '/*' as const;
const MULTI_LINE_CLOSE_TERM = '*/' as const;
const TERMS = [PARAM_OPEN_TERM, PARAM_CLOSE_TERM, CURLY_OPEN_TERM, CURLY_CLOSE_TERM, SQUARE_OPEN_TERM, SQUARE_CLOSE_TERM, DOT_TERM, COMMA_TERM, COLON_TERM, SEMICOLON_TERM, COLON_DASH_TERM, SINGLE_QUOTE_TERM, BACKSLASH_TERM, SPREAD_TERM];
interface TokenLocation {
    line: number;
    column: number;
    index: number;
    length: number;
}
interface TermToken<T extends typeof TERMS[number] = typeof TERMS[number]> {
    token: 'term';
    term: T;
    loc: TokenLocation;
}
interface WordToken {
    token: 'word';
    word: string;
    loc: TokenLocation;
}
interface NumberToken {
    token: 'number';
    word: string;
    loc: TokenLocation;
}
interface StringToken {
    token: 'string';
    word: string;
    loc: TokenLocation;
}
interface CommentToken {
    token: 'comment';
    kind: 'singleLine' | 'multiLine';
    body: string;
    loc: TokenLocation;
}
interface EndOfFileToken {
    token: 'endOfFile';
    loc: TokenLocation;
}
type Token = TermToken | WordToken | NumberToken | StringToken | CommentToken | EndOfFileToken;
function* tokenize(source: string): Generator<Token> {
    let line = 0;
    let column = 0;
    let index = 0;

    while (index < source.length) {
        let lineDiff = 0;
        let columnDiff = 0;
        let length = 1;

        const char = source[index];
        switch (char) {
        case DOT_TERM:
            if (source[index + 1] === '.' && source[index + 2] === '.') {
                length = 3;
                yield {
                    token: 'term',
                    term: SPREAD_TERM,
                    loc: {line, column, index, length},
                };
                break;
            }
        case COLON_TERM:
            if (source[index + 1] === '-') {
                length = 2;
                yield {token: 'term', term: COLON_DASH_TERM, loc: {line, column, index, length}};
                break;
            }
        case PARAM_OPEN_TERM:
        case PARAM_CLOSE_TERM:
        case CURLY_OPEN_TERM:
        case CURLY_CLOSE_TERM:
        case SQUARE_OPEN_TERM:
        case SQUARE_CLOSE_TERM:
        case COMMA_TERM:
        case SEMICOLON_TERM:
            yield {token: 'term', term: char, loc: {line, column, index, length}};
            break;

        case SINGLE_QUOTE_TERM:
            let isString = true;
            while (index + length < source.length && isString) {
                switch (source[index + length]) {
                case SINGLE_QUOTE_TERM:
                    length += 1;
                    isString = false;
                    break;
                case BACKSLASH_TERM:
                    if (source[index + length + 1] === SINGLE_QUOTE_TERM) {
                        length += 1;
                    }
                default:
                    length += 1;
                    break;
                }
            }

            yield {
                token: 'string',
                word: source.substring(index, index + length),
                loc: {line, column, index, length},
            };
            break;

        // skip whitespace
        case '\n':
            lineDiff = 1;
            columnDiff = -column - length;
        case ' ':
        case '\r':
        case '\t':
            break;

        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
            let isNumber = true;
            while (index + length < source.length && isNumber) {
                switch (source[index + length]) {
                case '0':
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                case '6':
                case '7':
                case '8':
                case '9':
                    length += 1;
                    break;
                default:
                    isNumber = false;
                    break;
                }
            }
            yield {
                token: 'number',
                word: source.substring(index, index + length),
                loc: {line, column, index, length},
            };
            break;

        case 'A':
        case 'B':
        case 'C':
        case 'D':
        case 'E':
        case 'F':
        case 'G':
        case 'H':
        case 'I':
        case 'J':
        case 'K':
        case 'L':
        case 'M':
        case 'N':
        case 'O':
        case 'P':
        case 'Q':
        case 'R':
        case 'S':
        case 'T':
        case 'U':
        case 'V':
        case 'W':
        case 'X':
        case 'Y':
        case 'Z':
        case 'a':
        case 'b':
        case 'c':
        case 'd':
        case 'e':
        case 'f':
        case 'g':
        case 'h':
        case 'i':
        case 'j':
        case 'k':
        case 'l':
        case 'm':
        case 'm':
        case 'o':
        case 'p':
        case 'q':
        case 'r':
        case 's':
        case 't':
        case 'u':
        case 'v':
        case 'w':
        case 'x':
        case 'y':
        case 'z':
            let isWord = true;
            while (index + length < source.length && isWord) {
                switch (source[index + length]) {
                case '0':
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                case '6':
                case '7':
                case '8':
                case '9':
                case 'A':
                case 'B':
                case 'C':
                case 'D':
                case 'E':
                case 'F':
                case 'G':
                case 'H':
                case 'I':
                case 'J':
                case 'K':
                case 'L':
                case 'M':
                case 'N':
                case 'O':
                case 'P':
                case 'Q':
                case 'R':
                case 'S':
                case 'T':
                case 'U':
                case 'V':
                case 'W':
                case 'X':
                case 'Y':
                case 'Z':
                case 'a':
                case 'b':
                case 'c':
                case 'd':
                case 'e':
                case 'f':
                case 'g':
                case 'h':
                case 'i':
                case 'j':
                case 'k':
                case 'l':
                case 'm':
                case 'm':
                case 'o':
                case 'p':
                case 'q':
                case 'r':
                case 's':
                case 't':
                case 'u':
                case 'v':
                case 'w':
                case 'x':
                case 'y':
                case 'z':
                    length += 1;
                    break;
                default:
                    isWord = false;
                    break;
                }
            }

            yield {
                token: 'word',
                word: source.substring(index, index + length),
                loc: {line, column, index, length},
            };
            break;
        }

        line += lineDiff;
        column += columnDiff + length;
        index += length;
    }

    yield {
        token: 'endOfFile',
        loc: {line, column, index, length: 0},
    };
}

console.log(Array.from(tokenize('[\n\tabc,\n\tdef,\n\t(ghi)\n].')));


interface CommentedNode {
    comments?: CommentToken[];
}

interface ParamNode extends CommentedNode {
    openParam?: TermToken<typeof PARAM_OPEN_TERM>;
    closeParam?: TermToken<typeof PARAM_CLOSE_TERM>;
}

interface TextNode extends CommentedNode {
    type: 'text';
    text: WordToken;
}

interface KeyValueNode extends CommentedNode {
    type: 'keyValue';
    key: TextNode | LiteralNode<StringToken>;
    value: ValueNode;
    colon: TermToken<typeof COLON_TERM>;
    seperator: TermToken<typeof COMMA_TERM>;
}
interface ObjectNode extends ParamNode {
    type: 'object';
    openBrace: TermToken<typeof CURLY_OPEN_TERM>;
    closeBrace: TermToken<typeof CURLY_CLOSE_TERM>;
    elements: KeyValueNode[];
}
interface ArrayNode extends ParamNode {
    type: 'array';
    openBrace: TermToken<typeof SQUARE_OPEN_TERM>;
    closeBrace: TermToken<typeof SQUARE_CLOSE_TERM>;
    elements: ValueNode[];
}
interface SpreadNode extends CommentedNode {
    type: 'spread';
    spread: TermToken<typeof SPREAD_TERM>;
    value: WordToken;
}
interface PredicateNode extends CommentedNode {
    type: 'predicate';
    id: WordToken;
    args?: AtomArgumentsNode;
    seperator?: TermToken<typeof COLON_DASH_TERM>;
    statements?: AtomNode | BinaryNode;
    end: TermToken<typeof DOT_TERM>;
}
interface BinaryNode<T extends typeof COMMA_TERM | typeof SEMICOLON_TERM = any> extends CommentedNode {
    type: 'binary';
    left: ValueNode;
    right: ValueNode;
    operator: T;
}
interface ArgumentNode extends ParamNode {
    type: 'argument';
    argument: ValueNode;
    seperator: TermToken<typeof COMMA_TERM>;
}
interface AtomArgumentsNode extends ParamNode {
    type: 'atomArguments';
    elements: ArgumentNode[];
}
interface AtomNode extends ParamNode {
    type: 'atom';
    id: WordToken | TermToken<typeof COMMA_TERM | typeof SEMICOLON_TERM>;
    args?: AtomArgumentsNode;
}
interface LiteralNode<T extends StringToken | NumberToken = any> extends ParamNode {
    type: 'literal';
    value: T;
}

type ValueNode = ObjectNode | ArrayNode | LiteralNode | AtomNode | BinaryNode;

interface ModuleNode extends CommentedNode {
    type: 'module';
    predicates: PredicateNode[];
}

class TokenWindow {
    source?: string;
    rawTokens: Iterator<Token>;
    tokens: Token[] = [];
    index: number = 0;

    constructor(source: string, rawTokens?: Iterator<Token>);
    constructor(source: undefined, rawTokens: Iterator<Token>);
    constructor(source: string | undefined, rawTokens: Iterator<Token> | undefined) {
        this.source = source;
        this.rawTokens = rawTokens ? rawTokens : tokenize(this.source); 
    }

    peek(): Token {
        if (this.index >= this.tokens.length) {
            this.read();
        }
        return this.tokens[this.index];
    }

    back(): Token {
        if (this.index > 0) {
            this.index -= 1;
        }
        return this.peek();
    }

    next(): Token {
        if (this.peek().token !== 'endOfFile') {
            this.index += 1;
        }
        return this.peek();
    }

    read() {
        const token = this.rawTokens.next();
        if (!token.done) {
            this.tokens.push(token.value);
        }
    }
}

function parseComments(tokens: TokenWindow, comments?: CommentToken[]): CommentToken[] | undefined {
    let token = tokens.peek();
    while (token.token === 'comment') {
        if (comments === undefined) {
            comments = [];
        }
        comments.push(token);
        token = tokens.next();
    }
    return comments;
}

function parseArgument(tokens: TokenWindow): ArgumentNode {
    const argument = parseValue(tokens);
    const seperator = tokens.peek();
    if (seperator.token !== 'term' || seperator.term !== COMMA_TERM) {
        throw new Error();
    }
    return {
        type: 'argument',
        argument,
        seperator: seperator as TermToken<typeof COMMA_TERM>,
    };
}

function parseAtomArguments(tokens: TokenWindow): AtomArgumentsNode | undefined {
    const openParam = tokens.peek();
    if (openParam.token !== 'term' || openParam.term !== PARAM_OPEN_TERM) {
        return;
    }

    let elements: ArgumentNode[] | undefined;
    let closeParam = tokens.next();
    while (closeParam.token !== 'term' || closeParam.term !== PARAM_CLOSE_TERM) {
        elements = [];
        elements.push(parseArgument(tokens));
        closeParam = tokens.peek();
    }
    tokens.next();

    return {
        type: 'atomArguments',
        elements,
        openParam: openParam as TermToken<typeof PARAM_OPEN_TERM>,
        closeParam: closeParam as TermToken<typeof PARAM_CLOSE_TERM>,
    };
}

function parseParamOpen(tokens: TokenWindow): TermToken<typeof PARAM_OPEN_TERM> | undefined {
    const openParam = tokens.peek();
    if (openParam.token === 'term' && openParam.term === PARAM_OPEN_TERM) {
        return openParam as TermToken<typeof PARAM_OPEN_TERM>;
    }
    return;
}

function parseParamClose(tokens: TokenWindow): TermToken<typeof PARAM_CLOSE_TERM> | undefined {
    const closeParam = tokens.peek();
    if (closeParam.token === 'term' && closeParam.term === PARAM_CLOSE_TERM) {
        return closeParam as TermToken<typeof PARAM_CLOSE_TERM>;
    }
    return;
}

function parseKeyValue(tokens: TokenWindow): KeyValueNode {
    let comments = parseComments(tokens);

    const keyToken = tokens.peek();
    let key : TextNode | LiteralNode<StringToken>;
    if (keyToken.token === 'word') {
        key = {
            type: 'text',
            text: keyToken,
        };
    } else if (keyToken.token === 'string') {
        key = {
            type: 'literal',
            value: keyToken,
        };
    } else {
        throw new Error();
    }

    comments = parseComments(tokens, comments);
    const colon = tokens.next();
    if (colon.token !== 'term' || colon.term !== COLON_TERM) {
        throw new Error();
    }

    tokens.next();
    const value = parseValue(tokens);

    comments = parseComments(tokens, comments);
    const seperator = tokens.peek();
    if (seperator.token !== 'term' || seperator.term !== COMMA_TERM) {
        throw new Error();
    }

    return {
        type: 'keyValue',
        key,
        value,
        colon: colon as TermToken<typeof COLON_TERM>,
        seperator: seperator as TermToken<typeof COMMA_TERM>,
        comments,
    }
}

function parseObject(tokens: TokenWindow): ObjectNode {
    let comments = parseComments(tokens);

    const openParam = parseParamOpen(tokens);

    comments = parseComments(tokens, comments);

    const openBrace = tokens.peek();
    if (openBrace.token !== 'term' || openBrace.term !== CURLY_OPEN_TERM) {
        throw new Error();
    }

    comments = parseComments(tokens, comments);
    let closeBrace = tokens.next();
    const elements = [];
    while (closeBrace.token !== 'term' || closeBrace.term !== CURLY_CLOSE_TERM) {
        elements.push(parseKeyValue(tokens));

        comments = parseComments(tokens, comments);
        closeBrace = tokens.peek();
    }
    tokens.next();

    comments = parseComments(tokens, comments);
    const closeParam = parseParamClose(tokens);

    return {
        type: 'object',
        elements,
        openBrace: openBrace as TermToken<typeof CURLY_OPEN_TERM>,
        closeBrace: closeBrace as TermToken<typeof CURLY_CLOSE_TERM>,
        openParam,
        closeParam,
    }
}

function parseArray(tokens: TokenWindow): ArrayNode {

}

function parseAtoms(tokens: TokenWindow): AtomNode {

}

function parseValue(tokens: TokenWindow): ValueNode {
    const start = tokens.index;

    let comments = parseComments(tokens);
    const openParam = parseParamOpen(tokens);
    comments = parseComments(tokens, comments);

    const token = tokens.peek();
    if (token.token === 'number' || token.token === 'string') {
        tokens.next();
        const closeParam = parseParamClose(tokens);
        return {
            type: 'literal',
            value: token,
            comments,
            openParam,
            closeParam,
        };
    } else if (token.token === 'term' && token.term === CURLY_OPEN_TERM) {
        tokens.index = start;
        return parseObject(tokens);
    } else if (token.token === 'term' && token.term === SQUARE_OPEN_TERM) {
        tokens.index = start;
        return parseArray(tokens);
    } else {
        tokens.index = start;
        return parseAtoms(tokens);
    }
}

function parsePredicate(tokens: TokenWindow): PredicateNode {
    let comments = parseComments(tokens);
    const id = tokens.peek();
    if (id.token !== 'word') {
        throw new Error(`Unexpected token: '${id.loc.line}:${id.loc.column}'`);
    }
    tokens.next();
    const args = parseAtomArguments(tokens);
    const seperator = tokens.peek();
    if (seperator.token !== 'term' || (seperator.term !== COLON_DASH_TERM && seperator.term !== DOT_TERM)) {
        throw new Error(`Unexpected token: '${id.loc.line}:${id.loc.column}'`);
    } else if (seperator.term === DOT_TERM) {
        return {
            type: 'predicate',
            id,
            args,
            seperator: undefined,
            statements: undefined,
            end: seperator as TermToken<typeof DOT_TERM>,
        };
    } else {
        const statements = parseAtoms(tokens);
        const end = tokens.peek();
        if (end.token !== 'term' || end.term !== DOT_TERM) {
            throw new Error();
        }
        tokens.next();

        return {
            type: 'predicate',
            id,
            args,
            seperator: seperator as TermToken<typeof COLON_DASH_TERM>,
            statements,
            comments,
            end: end as TermToken<typeof DOT_TERM>,
        };
    }
}

function parseModule(tokens: TokenWindow): ModuleNode {
    let comments;
    const predicates = [];
    while (tokens.peek().token !== 'endOfFile') {
        const start = tokens.index;
        const newComments = parseComments(tokens);
        
        predicates.push(parsePredicate);
    }
    const comments = parseComments(tokens);
    return {
        type: 'module',
        predicates,
        comments,
    };
}

type ParseNode = ModuleNode | PredicateNode | ValueNode;
interface Grammar<T extends ParseNode['type'] = any, K extends string = keyof (ParseNode & {type: T})> {
    node: T;
    elements: ({key?: K, item: Grammar, times: 'one' | 'zeroOrOne' | 'zeroOrMany'})[];
}

const commentGrammar: Grammar<CommentToken> = {
    node: ''
};
const objectGrammar: Grammar = {
    node: 'object',
    elements: [
        {key: 'comments', item: commentGrammar, times: 'zeroOrMany'},
    ]
};

const NodeGrammar = [];
