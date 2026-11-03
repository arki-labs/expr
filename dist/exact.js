import { DivisionByZeroError, InvalidArgumentError } from '@arki/math/errors';
import { factorial } from '@arki/math/integer';
import { Binder } from './bind.js';
import { ExprLimitError, ParseError } from './errors.js';
import { isLanguage, scientific } from './language.js';
import { resolveCompileLimits, resolveDigits } from './limits.js';
import { parseText } from './parser.js';
const NO_VALUES = [];
/** 10^100: an operand at or above it (or with more than 100 fraction digits) is "above 100 digits". */
export const LARGE = 10n ** 100n;
// ---------------------------------------------------------------------------
// Digit estimates (RFC §11): checked before the bigint work starts
// ---------------------------------------------------------------------------
/** log10 |x|, from the digit count and the leading 17 digits; 0 for 0. */
export function log10Abs(x) {
    const text = (x < 0n ? -x : x).toString();
    return text === '0' ? 0 : text.length + Math.log10(Number(`0.${text.slice(0, 17)}`));
}
/** max(log10 |numerator|, log10 denominator): the digits of the larger part. */
export function rationalSize(value) {
    return Math.max(log10Abs(value.numerator), log10Abs(value.denominator));
}
/**
 * Throws `ExprLimitError` when `base^exponent`, with `size` ≈ log10 of the
 * base's larger part, would have more than `limit` digits (≈ |exponent| ×
 * size). A base of size 0 (0, ±1) never grows.
 */
export function powerBudget(size, exponent, limit) {
    if (size === 0)
        return;
    const digits = Math.floor(Math.abs(exponent) * size) + 1;
    if (digits > limit)
        throw new ExprLimitError('digits', limit, digits);
}
/** `base^n` for a base of 0, 1 or -1 (given as its sign) and an integer `n` of any size. */
export function unitPower(sign, n) {
    if (sign !== 0)
        return sign === -1 && n % 2n !== 0n ? -1 : 1;
    if (n < 0n)
        throw new DivisionByZeroError('Zero cannot be raised to a negative power');
    return n === 0n ? 1 : 0;
}
/** `n!` for an integer `n >= 0`, after a Stirling estimate of its digits against `limit`. */
export function factorialOf(n, limit, shown) {
    if (n < 0n)
        throw new InvalidArgumentError(`factorial(${shown}) is not defined: it needs n >= 0`);
    const m = Number(n);
    const digits = m < 2 ? 1 : Math.floor((m * Math.log(m) - m + 0.5 * Math.log(2 * Math.PI * m)) / Math.LN10) + 1;
    if (digits > limit)
        throw new ExprLimitError('digits', limit, digits);
    return factorial(n);
}
/**
 * Whether a^m = b^n exactly (m >= 1). Equal powers have equal sizes, so a
 * size mismatch answers without any bigint work; past 10 000 digits (math's
 * own cap) it answers `false`, which only ever under-reports exactness.
 */
export function powersEqual(a, m, b, n) {
    const left = Number(m);
    const right = Number(n);
    if (!Number.isSafeInteger(left) || !Number.isSafeInteger(right))
        return false;
    const sizeA = left * rationalSize(a);
    const sizeB = Math.abs(right) * rationalSize(b);
    if (Math.abs(sizeA - sizeB) > 1e-9 * Math.max(sizeA, sizeB) + 1e-9 || sizeA > 10_000)
        return false;
    return a.pow(left).eq(b.pow(right));
}
/** The digits a literal spells, plus its exponent shift: `1e5000` counts 5 001. `undefined` if it is not a literal. */
function literalDigits(raw) {
    const match = /^(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(raw);
    if (match === null)
        return undefined;
    const [, whole = '', fraction = '', exponent = '0'] = match;
    if (whole.length + fraction.length === 0)
        return undefined;
    return whole.length + fraction.length + Math.abs(Number(exponent));
}
// ---------------------------------------------------------------------------
// Closures
// ---------------------------------------------------------------------------
function aborted(signal) {
    return signal.reason instanceof Error ? signal.reason : new Error('The evaluation was aborted');
}
function checkSignal(domain, env, a, b) {
    const { signal } = env;
    if (signal?.aborted === true && (domain.large(a) || (b !== undefined && domain.large(b))))
        throw aborted(signal);
}
function hostResult(domain, name, result) {
    if (domain.is(result))
        return result;
    throw new InvalidArgumentError(`${name}(…) returned a value that is not a ${domain.name}`);
}
/** Builds a closure tree. Recursion follows the IR, whose depth is bounded by the `depth` budget. */
function closure(ir, domain) {
    switch (ir.k) {
        case 'num': {
            const { value } = ir;
            if (ir.exact)
                return () => value;
            return (_, env) => {
                env.exact = false;
                return value;
            };
        }
        case 'var': {
            const { slot } = ir;
            return values => {
                const value = values[slot];
                if (value === undefined)
                    throw new InvalidArgumentError(`No value in slot ${slot}`);
                return value;
            };
        }
        case 'const': {
            const { f } = ir;
            return (_, env) => f(env);
        }
        case 'unary': {
            const arg = closure(ir.arg, domain);
            const { f } = ir;
            return (values, env) => {
                const a = arg(values, env);
                checkSignal(domain, env, a);
                return f(a, env);
            };
        }
        case 'binary': {
            const left = closure(ir.left, domain);
            const right = closure(ir.right, domain);
            const { f } = ir;
            return (values, env) => {
                const a = left(values, env);
                const b = right(values, env);
                checkSignal(domain, env, a, b);
                return f(a, b, env);
            };
        }
        case 'host': {
            const args = ir.args.map(arg => closure(arg, domain));
            const { name, fn } = ir;
            return (values, env) => {
                const inputs = args.map(arg => arg(values, env));
                for (const input of inputs)
                    checkSignal(domain, env, input);
                return hostResult(domain, name, fn(...inputs));
            };
        }
    }
}
function isNum(ir) {
    return ir.k === 'num';
}
// ---------------------------------------------------------------------------
// Compile
// ---------------------------------------------------------------------------
function own(table, name) {
    return table !== undefined && Object.hasOwn(table, name) ? table[name] : undefined;
}
function builder(domain, binder, options, constants, budgets) {
    const language = options.language ?? scientific;
    const { functions } = options;
    const { digits, settings, signal } = budgets;
    let cost = 0;
    function fold(ir) {
        const constant = ir.k === 'const' ||
            (ir.k === 'unary' && isNum(ir.arg)) ||
            (ir.k === 'binary' && isNum(ir.left) && isNum(ir.right));
        if (!constant)
            return ir;
        const env = { exact: true, signal, digits, settings };
        try {
            const value = closure(ir, domain)(NO_VALUES, env);
            return { k: 'num', value, exact: env.exact };
        }
        catch {
            return ir;
        }
    }
    function binary(f, left, right) {
        return fold({ k: 'binary', f, left, right });
    }
    function constant(name, node) {
        const builtin = domain.constants.get(name);
        if (builtin !== undefined)
            return fold({ k: 'const', f: builtin });
        const host = constants.get(name);
        if (host !== undefined)
            return { k: 'num', value: host, exact: true };
        if (scientific.constantSpec(name) !== undefined) {
            throw new ParseError(`The ${domain.name} domain has no "${name}"`, {
                code: 'not-in-domain',
                span: node.span,
                found: name,
            });
        }
        throw new InvalidArgumentError(`Constant "${name}" has no value: pass it in options.constants`);
    }
    function part(resolved, node) {
        return resolved.kind === 'variable' ? { k: 'var', slot: resolved.slot } : constant(resolved.name, node);
    }
    function call(name, args, node, depth) {
        const span = { start: node.span.start, end: Math.min(node.span.end, node.span.start + name.length) };
        const builtin = domain.functions.get(name);
        const [first, second] = args;
        if (builtin !== undefined) {
            if (args.length === 1 && first !== undefined && builtin.unary !== undefined) {
                return fold({ k: 'unary', f: builtin.unary, arg: build(first, depth) });
            }
            if (args.length === 2 && first !== undefined && second !== undefined && builtin.binary !== undefined) {
                return binary(builtin.binary, build(first, depth), build(second, depth));
            }
            throw new ParseError(`${name} does not take ${args.length} argument${args.length === 1 ? '' : 's'}`, {
                code: 'arity',
                span,
                found: name,
            });
        }
        const fn = own(functions, name);
        const spec = language.functionSpec(name);
        if (fn === undefined) {
            if (scientific.functionSpec(name) !== undefined) {
                throw new ParseError(`The ${domain.name} domain has no ${name}`, {
                    code: 'not-in-domain',
                    span,
                    found: name,
                });
            }
            if (spec !== undefined) {
                throw new InvalidArgumentError(`Function "${name}" has no implementation: pass it in options.functions`);
            }
            throw new ParseError(`"${name}" is not a function`, { code: 'not-a-function', span, found: name });
        }
        if (spec !== undefined && (args.length < spec.arity[0] || args.length > spec.arity[1])) {
            throw new ParseError(`${name} does not take ${args.length} arguments`, { code: 'arity', span, found: name });
        }
        cost += (spec?.cost ?? 1) - 1;
        return { k: 'host', name, fn, args: args.map(arg => build(arg, depth)) };
    }
    function build(node, depth) {
        if (depth > budgets.depth)
            throw new ExprLimitError('depth', budgets.depth, depth);
        cost++;
        const next = depth + 1;
        switch (node.kind) {
            case 'number': {
                const size = literalDigits(node.raw);
                if (size === undefined) {
                    throw new ParseError(`"${node.raw}" is not a number`, {
                        code: 'bad-number',
                        span: node.span,
                        found: node.raw,
                    });
                }
                if (size > digits)
                    throw new ExprLimitError('digits', digits, size);
                return { k: 'num', value: domain.literal(node.raw), exact: true };
            }
            case 'name': {
                const resolution = binder.resolve(node);
                if (resolution.kind !== 'split')
                    return part(resolution, node);
                // xy → x·y, multiplied left to right.
                const [head, ...rest] = resolution.parts.map(letter => part(letter, node));
                if (head === undefined)
                    throw new InvalidArgumentError(`"${node.name}" split into no letters`);
                return rest.reduce((product, factor) => binary(domain.ops['*'], product, factor), head);
            }
            case 'group': {
                return build(node.inner, next);
            }
            case 'unary': {
                const arg = build(node.arg, next);
                return node.op === '+' ? arg : fold({ k: 'unary', f: domain.negate, arg });
            }
            case 'factorial': {
                return call('factorial', [node.arg], node, next);
            }
            case 'binary': {
                if (node.op === '/')
                    binder.checkDivision(node);
                return binary(domain.ops[node.op], build(node.left, next), build(node.right, next));
            }
            case 'call': {
                // pow(a, b) is a ^ b.
                if (node.fn === 'pow' && node.args.length === 2) {
                    const [base, exponent] = node.args;
                    if (base !== undefined && exponent !== undefined) {
                        return binary(domain.ops['^'], build(base, next), build(exponent, next));
                    }
                }
                return call(node.fn, node.args, node, next);
            }
        }
    }
    return { build: node => build(node, 1), fold, cost: () => cost };
}
function hostConstants(domain, table) {
    const constants = new Map();
    if (table === undefined)
        return constants;
    if (typeof table !== 'object' || table === null)
        throw new InvalidArgumentError('options.constants must be an object');
    for (const name of Object.keys(table)) {
        const value = domain.input(Reflect.get(table, name));
        if (value === undefined)
            throw new InvalidArgumentError(`options.constants.${name} must be a ${domain.name} input`);
        constants.set(name, value);
    }
    return constants;
}
function checkFunctions(table) {
    if (table === undefined)
        return;
    if (typeof table !== 'object' || table === null)
        throw new InvalidArgumentError('options.functions must be an object');
    for (const name of Object.keys(table)) {
        if (typeof Reflect.get(table, name) !== 'function') {
            throw new InvalidArgumentError(`options.functions.${name} must be a function`);
        }
    }
}
function core(domain, settings, roots, source, parsed, variables, options, signal) {
    const language = options.language ?? scientific;
    if (!isLanguage(language))
        throw new InvalidArgumentError('options.language must be a language from defineLanguage');
    checkFunctions(options.functions);
    const constants = hostConstants(domain, options.constants);
    const limits = resolveCompileLimits(options.limits);
    const digits = resolveDigits(options.limits);
    const { functions } = options;
    const binder = new Binder({
        variables,
        isConstant: name => domain.constants.has(name) || language.constantSpec(name) !== undefined || constants.has(name),
        isFunction: name => domain.functions.has(name) || language.functionSpec(name) !== undefined || own(functions, name) !== undefined,
        isOutsideDomain: name => !domain.constants.has(name) && !constants.has(name) && scientific.constantSpec(name) !== undefined,
        roots,
        source,
    });
    const tree = builder(domain, binder, options, constants, { depth: limits.depth, digits, settings, signal });
    const built = roots.map(root => {
        const before = tree.cost();
        const ir = tree.build(root);
        const cost = tree.cost() - before;
        if (cost > limits.steps)
            throw new ExprLimitError('steps', limits.steps, cost);
        return { ir, cost };
    });
    return {
        domain,
        settings,
        digits,
        fold: tree.fold,
        roots: built,
        readings: Object.freeze([...binder.readings]),
        warnings: Object.freeze([...parsed, ...binder.warnings]),
        steps: limits.steps,
    };
}
function scopeValue(domain, scope, name) {
    const value = typeof scope === 'object' && scope !== null && Object.hasOwn(scope, name) ? Reflect.get(scope, name) : undefined;
    if (value === undefined)
        throw new InvalidArgumentError(`Missing value for variable "${name}"`);
    const converted = domain.input(value);
    if (converted === undefined) {
        throw new InvalidArgumentError(`Variable "${name}" must be a ${domain.name} input, got ${typeof value}`);
    }
    return converted;
}
function assemble(variables, ir, shared) {
    const run = closure(ir, shared.domain);
    const names = Object.freeze([...variables]);
    const execute = (scope, env) => run(names.map(name => scopeValue(shared.domain, scope, name)), env);
    const newEnv = (options) => ({
        exact: true,
        signal: options?.signal,
        digits: shared.digits,
        settings: shared.settings,
    });
    const call = (scope, options) => execute(scope, newEnv(options));
    const detailed = (scope, options) => {
        const env = newEnv(options);
        const value = execute(scope, env);
        return Object.freeze({ value, exact: env.exact && shared.domain.approximate !== true });
    };
    const compiled = Object.assign(call, {
        detailed,
        variables: Object.freeze([...variables]),
        readings: shared.readings,
        warnings: shared.warnings,
    });
    Object.freeze(compiled);
    return compiled;
}
function rootOf(built, index) {
    const root = built.roots[index];
    if (root === undefined)
        throw new InvalidArgumentError('compile produced no tree');
    return root;
}
export function compileExact(domain, settings, expr, variables, options) {
    const built = core(domain, settings, [expr.root], expr.source, expr.warnings, variables, options);
    return assemble(variables, rootOf(built, 0).ir, built);
}
export function compileEquationExact(domain, settings, equation, variables, options) {
    const built = core(domain, settings, [equation.left, equation.right], equation.source, equation.warnings, variables, options);
    const left = rootOf(built, 0);
    const right = rootOf(built, 1);
    const cost = left.cost + right.cost + 1;
    if (cost > built.steps)
        throw new ExprLimitError('steps', built.steps, cost);
    const difference = built.fold({ k: 'binary', f: domain.ops['-'], left: left.ir, right: right.ir });
    return Object.freeze({
        left: assemble(variables, left.ir, built),
        right: assemble(variables, right.ir, built),
        difference: assemble(variables, difference, built),
    });
}
export function evaluateExact(domain, settings, text, options) {
    const expr = parseText(text, { language: options.language, syntax: options.syntax, limits: options.limits });
    // Everything folds here, so the fold honours the signal; a fold it aborts runs again, and throws, below.
    const built = core(domain, settings, [expr.root], expr.source, expr.warnings, [], options, options.signal);
    const env = { exact: true, signal: options.signal, digits: built.digits, settings };
    return closure(rootOf(built, 0).ir, domain)(NO_VALUES, env);
}
//# sourceMappingURL=exact.js.map