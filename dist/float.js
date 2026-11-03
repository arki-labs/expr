/**
 * `@arki/expr/float`: the float domain (RFC §8, §10). Values are `number`s.
 * `compile` resolves every name once, then turns each node into a closure
 * specialised by operator and arity — no `eval`, no `new Function`.
 *
 * Two closure trees: the checked tree serves `f(scope)` and `f.at(x)` and
 * throws `@arki/math`'s typed errors instead of returning `NaN` or
 * ±Infinity; the unchecked IEEE tree serves `f.sample`, where `NaN` marks a
 * gap, and is built on its first call. A constant subtree is folded only
 * when the checked tree evaluates it to a finite number, which both trees
 * would return at every call anyway.
 */
import { attempt } from '@arki/failure';
import { DivisionByZeroError, InvalidArgumentError, NumericRangeError } from '@arki/math/errors';
import { Binder } from './bind.js';
import { evaluationFailure, ExprLimitError, ParseError } from './errors.js';
import { builtins, FLOAT_CONSTANTS, powChecked } from './float-builtins.js';
import { isLanguage, scientific } from './language.js';
import { resolveCompileLimits } from './limits.js';
import { parseText } from './parser.js';
const NO_VALUES = new Float64Array(0);
function overflow(op) {
    return new NumericRangeError(`The result of ${op} is too large for a number`);
}
function hostResult(name, result) {
    if (typeof result === 'number') {
        if (result - result === 0)
            return result;
        if (!Number.isNaN(result))
            throw new NumericRangeError(`${name}(…) returned ${result}`);
    }
    throw new InvalidArgumentError(`${name}(…) returned ${typeof result === 'number' ? 'NaN' : 'a non-number'}`);
}
function checkedBinary(op, left, right, rightIr) {
    switch (op) {
        case '+': {
            return v => {
                const r = left(v) + right(v);
                if (r - r === 0)
                    return r;
                throw overflow('+');
            };
        }
        case '-': {
            return v => {
                const r = left(v) - right(v);
                if (r - r === 0)
                    return r;
                throw overflow('-');
            };
        }
        case '*': {
            return v => {
                const r = left(v) * right(v);
                if (r - r === 0)
                    return r;
                throw overflow('*');
            };
        }
        case '/': {
            return v => {
                const n = left(v);
                const d = right(v);
                if (d === 0)
                    throw new DivisionByZeroError(`Division by zero: ${n} / 0`);
                const r = n / d;
                if (r - r === 0)
                    return r;
                throw overflow('/');
            };
        }
        case '^': {
            if (rightIr.k === 'num') {
                const exponent = rightIr.value;
                return v => powChecked(left(v), exponent);
            }
            return v => powChecked(left(v), right(v));
        }
    }
}
function uncheckedBinary(op, left, right, rightIr) {
    switch (op) {
        case '+': {
            return v => left(v) + right(v);
        }
        case '-': {
            return v => left(v) - right(v);
        }
        case '*': {
            return v => left(v) * right(v);
        }
        case '/': {
            return v => left(v) / right(v);
        }
        case '^': {
            if (rightIr.k === 'num') {
                const exponent = rightIr.value;
                return v => left(v) ** exponent;
            }
            return v => left(v) ** right(v);
        }
    }
}
function hostClosure(name, fn, args, checked) {
    const [a, b] = args;
    if (checked) {
        if (args.length === 0)
            return () => hostResult(name, fn());
        if (args.length === 1 && a !== undefined)
            return v => hostResult(name, fn(a(v)));
        if (args.length === 2 && a !== undefined && b !== undefined)
            return v => hostResult(name, fn(a(v), b(v)));
        return v => hostResult(name, fn(...args.map(arg => arg(v))));
    }
    if (args.length === 0)
        return () => fn();
    if (args.length === 1 && a !== undefined)
        return v => fn(a(v));
    if (args.length === 2 && a !== undefined && b !== undefined)
        return v => fn(a(v), b(v));
    return v => fn(...args.map(arg => arg(v)));
}
/** Builds a closure tree. Recursion follows the IR, whose depth is bounded by the `depth` budget. */
function closure(ir, checked) {
    switch (ir.k) {
        case 'num': {
            const { value } = ir;
            return () => value;
        }
        case 'var': {
            const { slot } = ir;
            return v => v[slot] ?? Number.NaN;
        }
        case 'neg': {
            const arg = closure(ir.arg, checked);
            return v => -arg(v);
        }
        case 'prod': {
            const factors = ir.factors.map(factor => closure(factor, checked));
            return v => {
                let product = 1;
                for (const factor of factors)
                    product *= factor(v);
                if (!checked || product - product === 0)
                    return product;
                throw overflow('*');
            };
        }
        case 'bin': {
            const left = closure(ir.left, checked);
            const right = closure(ir.right, checked);
            return checked ? checkedBinary(ir.op, left, right, ir.right) : uncheckedBinary(ir.op, left, right, ir.right);
        }
        case 'unary': {
            const arg = closure(ir.arg, checked);
            const f = checked ? ir.impl.checked : ir.impl.raw;
            return v => f(arg(v));
        }
        case 'binary': {
            const left = closure(ir.left, checked);
            const right = closure(ir.right, checked);
            const f = checked ? ir.impl.checked : ir.impl.raw;
            return v => f(left(v), right(v));
        }
        case 'host': {
            return hostClosure(ir.name, ir.fn, ir.args.map(arg => closure(arg, checked)), checked);
        }
    }
}
function isNum(ir) {
    return ir.k === 'num';
}
/** Replaces a pure node whose operands are numbers by its value, when the checked tree gives a finite one. */
function fold(ir) {
    const constant = ir.k === 'neg' || ir.k === 'unary'
        ? isNum(ir.arg)
        : ir.k === 'bin' || ir.k === 'binary'
            ? isNum(ir.left) && isNum(ir.right)
            : ir.k === 'prod' && ir.factors.every(factor => isNum(factor));
    if (!constant)
        return ir;
    try {
        return { k: 'num', value: closure(ir, true)(NO_VALUES) };
    }
    catch {
        return ir; // the error belongs to the call, not to compile
    }
}
function own(table, name) {
    return table !== undefined && Object.hasOwn(table, name) ? table[name] : undefined;
}
function checkTable(table, what) {
    if (table === undefined)
        return;
    if (typeof table !== 'object' || table === null)
        throw new InvalidArgumentError(`options.${what} must be an object`);
    for (const name of Object.keys(table)) {
        const value = Reflect.get(table, name);
        if (what === 'functions' ? typeof value !== 'function' : typeof value !== 'number' || !Number.isFinite(value)) {
            throw new InvalidArgumentError(`options.${what}.${name} must be ${what === 'functions' ? 'a function' : 'a finite number'}`);
        }
    }
}
class IrBuilder {
    /** Steps one evaluation costs: one per node plus each host function's extra cost. */
    cost = 0;
    /** Whether any host function is called: only a host function can call back into a compiled function. */
    hosts = false;
    binder;
    table;
    language;
    functions;
    constants;
    maxDepth;
    constructor(binder, table, language, options, maxDepth) {
        this.binder = binder;
        this.table = table;
        this.language = language;
        this.functions = options.functions;
        this.constants = options.constants;
        this.maxDepth = maxDepth;
    }
    build(node, depth) {
        if (depth > this.maxDepth)
            throw new ExprLimitError('depth', this.maxDepth, depth);
        this.cost++;
        const next = depth + 1;
        switch (node.kind) {
            case 'number': {
                const value = Number(node.raw);
                if (Number.isNaN(value)) {
                    throw new ParseError(`"${node.raw}" is not a number`, {
                        code: 'bad-number',
                        span: node.span,
                        found: node.raw,
                    });
                }
                if (!Number.isFinite(value))
                    throw new NumericRangeError(`The literal ${node.raw} is too large for a number`);
                return { k: 'num', value };
            }
            case 'name': {
                const resolution = this.binder.resolve(node);
                if (resolution.kind !== 'split')
                    return this.part(resolution, node);
                const factors = resolution.parts.map(part => this.part(part, node));
                return fold({ k: 'prod', factors });
            }
            case 'group': {
                return this.build(node.inner, next);
            }
            case 'unary': {
                const arg = this.build(node.arg, next);
                return node.op === '+' ? arg : fold({ k: 'neg', arg });
            }
            case 'factorial': {
                const impl = this.table.get('factorial')?.unary;
                if (impl === undefined)
                    throw new InvalidArgumentError('factorial is missing from the float built-ins');
                return fold({ k: 'unary', impl, arg: this.build(node.arg, next) });
            }
            case 'binary': {
                if (node.op === '/')
                    this.binder.checkDivision(node);
                const left = this.build(node.left, next);
                const right = this.build(node.right, next);
                return fold({ k: 'bin', op: node.op, left, right });
            }
            case 'call': {
                return this.call(node.fn, node.args, node, next);
            }
        }
    }
    part(part, node) {
        return part.kind === 'variable' ? { k: 'var', slot: part.slot } : this.constant(part.name, node);
    }
    constant(name, node) {
        const builtin = FLOAT_CONSTANTS.get(name);
        if (builtin !== undefined)
            return { k: 'num', value: builtin };
        const host = own(this.constants, name);
        if (host !== undefined)
            return { k: 'num', value: host };
        if (scientific.constantSpec(name) !== undefined) {
            throw new ParseError(`"${name}" is not a real number: the float domain has no "${name}"`, {
                code: 'not-in-domain',
                span: node.span,
                found: name,
            });
        }
        throw new InvalidArgumentError(`Constant "${name}" has no value: pass it in options.constants`);
    }
    call(name, args, node, depth) {
        const span = { start: node.span.start, end: Math.min(node.span.end, node.span.start + name.length) };
        const builtin = this.table.get(name);
        const [first, second] = args;
        if (builtin !== undefined) {
            if (args.length === 1 && first !== undefined && builtin.unary !== undefined) {
                return fold({ k: 'unary', impl: builtin.unary, arg: this.build(first, depth) });
            }
            if (args.length === 2 && first !== undefined && second !== undefined && builtin.binary !== undefined) {
                const left = this.build(first, depth);
                const right = this.build(second, depth);
                if (name === 'pow')
                    return fold({ k: 'bin', op: '^', left, right });
                // log(x, 10) and log(x, 2) use the exact-at-powers log10/log2: log(1000, 10) is 3, not 2.9999999999999996.
                const base = name === 'log' && right.k === 'num' ? right.value : undefined;
                const impl = base === 10 || base === 2 ? this.table.get(base === 10 ? 'log10' : 'log2')?.unary : undefined;
                if (impl !== undefined)
                    return fold({ k: 'unary', impl, arg: left });
                return fold({ k: 'binary', impl: builtin.binary, left, right });
            }
            throw new ParseError(`${name} does not take ${args.length} argument${args.length === 1 ? '' : 's'}`, {
                code: 'arity',
                span,
                found: name,
            });
        }
        const fn = own(this.functions, name);
        const spec = this.language.functionSpec(name);
        if (fn === undefined) {
            if (spec !== undefined) {
                throw new InvalidArgumentError(`Function "${name}" has no implementation: pass it in options.functions`);
            }
            throw new ParseError(`"${name}" is not a function`, { code: 'not-a-function', span, found: name });
        }
        if (spec !== undefined && (args.length < spec.arity[0] || args.length > spec.arity[1])) {
            throw new ParseError(`${name} does not take ${args.length} arguments`, { code: 'arity', span, found: name });
        }
        this.cost += (spec?.cost ?? 1) - 1;
        this.hosts = true;
        return { k: 'host', name, fn, args: args.map(arg => this.build(arg, depth)) };
    }
}
function core(roots, source, parsed, variables, options) {
    const language = options.language ?? scientific;
    if (!isLanguage(language))
        throw new InvalidArgumentError('options.language must be a language from defineLanguage');
    const angle = options.angle ?? 'rad';
    if (angle !== 'rad' && angle !== 'deg')
        throw new InvalidArgumentError(`options.angle must be 'rad' or 'deg'`);
    checkTable(options.functions, 'functions');
    checkTable(options.constants, 'constants');
    const limits = resolveCompileLimits(options.limits);
    const table = builtins(angle);
    const { functions, constants } = options;
    const binder = new Binder({
        variables,
        isConstant: name => FLOAT_CONSTANTS.has(name) || language.constantSpec(name) !== undefined || own(constants, name) !== undefined,
        isFunction: name => table.has(name) || language.functionSpec(name) !== undefined || own(functions, name) !== undefined,
        isOutsideDomain: name => !FLOAT_CONSTANTS.has(name) && own(constants, name) === undefined && scientific.constantSpec(name) !== undefined,
        roots,
        source,
    });
    const builder = new IrBuilder(binder, table, language, options, limits.depth);
    const built = roots.map(root => {
        const before = builder.cost;
        const ir = builder.build(root, 1);
        const cost = builder.cost - before;
        if (cost > limits.steps)
            throw new ExprLimitError('steps', limits.steps, cost);
        return { ir, cost };
    });
    return {
        roots: built,
        readings: Object.freeze([...binder.readings]),
        warnings: Object.freeze([...parsed, ...binder.warnings]),
        steps: limits.steps,
        reentrant: builder.hosts,
    };
}
function scopeValue(scope, name) {
    const value = typeof scope === 'object' && scope !== null && Object.hasOwn(scope, name) ? Reflect.get(scope, name) : undefined;
    if (typeof value === 'number' && value - value === 0)
        return value;
    throw new InvalidArgumentError(value === undefined
        ? `Missing value for variable "${name}"`
        : `Variable "${name}" must be a finite number, got ${typeof value === 'number' ? value : typeof value}`);
}
function aborted(signal) {
    return signal.reason instanceof Error ? signal.reason : new Error('sample() was aborted');
}
function assemble(variables, ir, cost, shared) {
    const checked = closure(ir, true);
    let unchecked;
    const count = variables.length;
    const names = Object.freeze([...variables]);
    // One buffer per compiled function: no allocation per call. A host
    // function that calls back into this function gets a fresh buffer.
    const buffer = new Float64Array(count);
    let busy = false;
    const run = (values) => {
        if (!shared.reentrant || values !== buffer)
            return checked(values);
        busy = true;
        try {
            return checked(values);
        }
        finally {
            busy = false;
        }
    };
    const slots = () => (busy ? new Float64Array(count) : buffer);
    const single = () => {
        if (count !== 1) {
            throw new InvalidArgumentError(`This needs exactly one declared variable; the function has ${count}`);
        }
    };
    const call = (scope) => {
        const values = slots();
        for (let slot = 0; slot < count; slot++)
            values[slot] = scopeValue(scope, names[slot] ?? '');
        return run(values);
    };
    const at = (x) => {
        single();
        if (x - x !== 0)
            throw new InvalidArgumentError(`at() needs a finite number, got ${x}`);
        const values = slots();
        values[0] = x;
        return run(values);
    };
    const sample = (xs, out, options) => {
        single();
        if (!(xs instanceof Float64Array) || !(out instanceof Float64Array)) {
            throw new InvalidArgumentError('sample() takes two Float64Arrays');
        }
        const points = xs.length;
        if (out.length !== points) {
            throw new InvalidArgumentError(`sample(): out has length ${out.length}, xs has ${points}`);
        }
        if (cost * points > shared.steps)
            throw new ExprLimitError('steps', shared.steps, cost * points);
        unchecked ??= closure(ir, false);
        const f = unchecked;
        const signal = options?.signal;
        const values = new Float64Array(1);
        for (let index = 0; index < points; index++) {
            if ((index & 1023) === 0 && signal?.aborted === true)
                throw aborted(signal);
            values[0] = xs[index] ?? Number.NaN;
            const y = f(values);
            out[index] = y - y === 0 ? y : Number.NaN;
        }
        return out;
    };
    const compiled = Object.assign(call, {
        at,
        sample,
        variables: Object.freeze([...variables]),
        readings: shared.readings,
        warnings: shared.warnings,
    });
    Object.freeze(compiled);
    return compiled;
}
function rootOf(core, index) {
    const root = core.roots[index];
    if (root === undefined)
        throw new InvalidArgumentError('compile produced no tree');
    return root;
}
/**
 * Compiles an expression to a function of its declared variables. Throws
 * `ParseError` (`unknown-name`, `name-conflict`, `not-in-domain`, `arity`)
 * and `ExprLimitError` here, before any point is evaluated.
 *
 * ```ts
 * const f = compile(parse('2x^2 + sin(x)'), { variables: ['x'] });
 * f({ x: 1.5 }); f.at(1.5); f.sample(xs, out);
 * ```
 */
export function compile(expr, options) {
    const variables = [...(options?.variables ?? [])];
    const built = core([expr.root], expr.source, expr.warnings, variables, options ?? {});
    const root = rootOf(built, 0);
    return assemble(variables, root.ir, root.cost, built);
}
/** Compiles both sides of `lhs = rhs` and their difference, on one set of slots (C-14, C-17). */
export function compileEquation(equation, options) {
    const variables = [...(options?.variables ?? [])];
    const built = core([equation.left, equation.right], equation.source, equation.warnings, variables, options ?? {});
    const left = rootOf(built, 0);
    const right = rootOf(built, 1);
    const cost = left.cost + right.cost + 1;
    if (cost > built.steps)
        throw new ExprLimitError('steps', built.steps, cost);
    const difference = fold({ k: 'bin', op: '-', left: left.ir, right: right.ir });
    return Object.freeze({
        left: assemble(variables, left.ir, left.cost, built),
        right: assemble(variables, right.ir, right.cost, built),
        difference: assemble(variables, difference, cost, built),
    });
}
/** Parses, compiles and evaluates an expression with no variables: the keypad's one-shot call (C-15). Reads outside text, so it returns the value or a failure from `EVALUATE_FAILURES` (`expr.invalid_text`, `expr.over_budget`, `expr.no_value`, each with the thrown error as `cause`) and never throws for bad text. */
export function evaluate(text, options) {
    const settings = options;
    return attempt(() => {
        const expr = parseText(text, { language: settings?.language, syntax: settings?.syntax, limits: settings?.limits });
        const built = core([expr.root], expr.source, expr.warnings, [], settings ?? {});
        const root = rootOf(built, 0);
        return closure(root.ir, true)(NO_VALUES);
    }, evaluationFailure);
}
//# sourceMappingURL=float.js.map