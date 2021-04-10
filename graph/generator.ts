import {RootSyntax, AndSyntax, OrSyntax, CallSyntax, Syntax, FuncSyntax, createBuilder} from './syntax';
import {AddressHistory, DataAddress, match, a, cloneValue} from './address';

class AddressHistoryOne implements AddressHistory {
    assignments?: [DataAddress<any>, any][];
    assign(address: DataAddress<any>, value: any) {
        this.assignments = this.assignments ?? [];
        this.assignments.push([address, address.value]);
        address.value = value;
    }
    markEnd() {return null;}
    markStart() {return null;}
    revert() {
        if (this.assignments === undefined) {
            return;
        }
        for (let i = this.assignments.length - 1; i >= 0; i--) {
            const [address, value] = this.assignments[i];
            address.value = value;
        }
    }
}

function* run(syntax: Syntax, frame = {}) {
    switch (syntax.type) {
    case 'root':
        yield* run(syntax.node, frame);
        break;
    case 'and':
        for (const left of run(syntax.left, frame)) {
            yield* run(syntax.right, frame);
        }
        break;
    case 'or':
        yield* run(syntax.left, frame);
        yield* run(syntax.right, frame);
        break;
    case 'call':
        switch (syntax.func) {
        case 'match':
            const history = new AddressHistoryOne();
            try {
                if (match({addressHistory: history}, syntax.args[0], frame, syntax.args[1], frame)) {
                    yield frame;
                }
            } finally {
                history.revert();
            }
            break;
        case 'not':
            let goalMet = false;
            for (const goal of run(syntax.args[0])) {
                goalMet = true;
                break;
            }
            if (!goalMet) {
                yield frame;
            }
            break;
        case 'forall':
            yield* run({
                type: 'call',
                func: 'not',
                args: [{
                    type: 'and',
                    left: syntax.args[0],
                    right: {
                        type: 'call',
                        func: 'not',
                        args: [syntax.args[1]]
                    },
                }],
            }, frame);
            // forall: for (const goal of run(syntax.args[0])) {
            //     for (const action of run(syntax.args[1])) {
            //         break forall;
            //     }
            // }
            break;
        default:
            if (typeof syntax.func === 'object') {
                const history = new AddressHistoryOne();
                const newFrame = {};
                try {
                    if (match({addressHistory: history}, syntax.args, frame, syntax.func.args, newFrame)) {
                        for (const goal of run(syntax.func.code, newFrame)) {
                            yield frame;
                        }
                    }
                } finally {
                    history.revert();
                }
                break;
            }
            throw new Error('unknown func');
        }
        break;
    default:
        throw new Error('unknown type');
    }
}

if (process.mainModule === module) {
    main();
}

function main() {
    const coder = createBuilder()
    .register('call', function<F extends string | FuncSyntax, Args extends any[]>(func: F, ...args: Args) {return {type: 'call', func, args};})
    .register('match', function(left, right) {return this.call('match', left, right) as {type: 'call', func: 'match', args: [any, any]};});

    function expect(cond, message): asserts cond {
        if (!cond) {
            throw new Error(message);
        }
        process.stdout.write('.');
    }
    // function expectSet(iter, set) {
    //     let i = 0;
    //     for (const answer of iter) {
    //         expect()
    //     }
    // }

    function runMatch(a, b) {
        return run(coder.match(a, b).code);
        return run({type: 'call', func: 'match', args: [a, b]});
    }

    for (const answer of run(coder.match(a`a`, 1).code)) {
        expect(answer.a === 1, 'a = 1');
    }
    for (const answer of runMatch([a`a`, 1], [a`b`, a`b`])) {
        // console.log(cloneValue(answer, answer));
        expect(cloneValue(answer.a, answer) === 1, '[a, 1] = [b, b]');
    }
    for (const answer of run(coder.match(a`a`, 1).or(coder.match(a`a`, 2)).code)) {
        expect(true, '');
    }
    for (const answer of run())

    process.stdout.write('\n');
}
