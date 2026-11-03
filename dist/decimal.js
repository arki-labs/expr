/**
 * `@arki/expr/decimal`: the Decimal domain (RFC §8). Values are `Decimal`s
 * from `@arki/math/decimal`; literals are read from their text, so `0.1` is
 * exactly one tenth.
 *
 * Exact or rounded where you said: `+ - *` and integer powers never round.
 * `/` is exact when the quotient terminates; otherwise it rounds to
 * `{ scale, rounding }`. Functions (`sqrt cbrt nthRoot exp ln log log10
 * log2`, non-integer powers) and the constants `pi`, `e` give their
 * correctly rounded value at `scale`. The default rounding is
 * `'unnecessary'`, so a step that would round throws
 * `RoundingNecessaryError` — the same default as `Decimal#dividedBy`.
 * Trigonometry has no exact result and is a compile-time `not-in-domain`.
 */
import { attempt } from '@arki/failure';
import { decimal, isDecimal } from '@arki/math/decimal';
import { E, exp, ln, log, log2, log10, nthRoot, PI, pow } from '@arki/math/decimal-math';
import { DivisionByZeroError, InvalidArgumentError, ResourceLimitError, RoundingNecessaryError, } from '@arki/math/errors';
import { gcd } from '@arki/math/integer';
import { isRoundingMode } from '@arki/math/rounding';
import { evaluationFailure } from './errors.js';
import { compileEquationExact, compileExact, evaluateExact, factorialOf, LARGE, log10Abs, powerBudget, powersEqual, unitPower, } from './exact.js';
const DEFAULT_SCALE = 20;
function contextOf(options) {
    const scale = options?.scale ?? DEFAULT_SCALE;
    const rounding = options?.rounding ?? 'unnecessary';
    if (typeof scale !== 'number' || !Number.isSafeInteger(scale) || scale < 0 || scale > 10_000) {
        throw new InvalidArgumentError(`options.scale must be an integer from 0 to 10000, got ${String(scale)}`);
    }
    if (!isRoundingMode(rounding))
        throw new InvalidArgumentError(`options.rounding is not a rounding mode: ${String(rounding)}`);
    return { scale, rounding };
}
/** Digits of the larger part: the coefficient or the fraction digits (`0.1^n` has n of them). */
function size(value) {
    return Math.max(log10Abs(value.coefficient), value.scale);
}
/** Whether 1/value terminates: its only prime factors are 2 and 5. */
function onlyTwosAndFives(value) {
    let rest = value < 0n ? -value : value;
    if (rest === 0n)
        return true;
    rest /= rest & -rest;
    while (rest % 5n === 0n)
        rest /= 5n;
    return rest === 1n;
}
/** A function result at `scale`. It is exact when rounding is `'unnecessary'` (math throws otherwise) or `isExact` says so. */
function atScale(env, compute, isExact) {
    const result = compute(env.settings);
    if (env.exact && env.settings.rounding !== 'unnecessary' && !isExact(result))
        env.exact = false;
    return result;
}
function divide(a, b, env) {
    if (b.isZero())
        throw new DivisionByZeroError(`Division by zero: ${a.toString()} / 0`);
    // a/b = (ca·10^sb) / (cb·10^sa): it terminates when cb / gcd(ca, cb) has no prime factor but 2 and 5.
    if (onlyTwosAndFives(b.coefficient / gcd(a.coefficient, b.coefficient)))
        return a.dividedBy(b);
    env.exact = false;
    return a.dividedBy(b, env.settings);
}
function power(a, b, env) {
    if (!b.isInteger()) {
        powerBudget(size(a), Number(b.toString()), env.digits);
        const exponent = b.toRational();
        return atScale(env, context => pow(a, b, context), result => powersEqual(result.toRational(), exponent.denominator, a.toRational(), exponent.numerator));
    }
    const n = b.toBigInt();
    const digits = size(a);
    if (digits === 0)
        return decimal(unitPower(a.sign(), n));
    powerBudget(digits, Number(n), env.digits);
    if (n >= 0n || onlyTwosAndFives(a.coefficient))
        return a.pow(Number(n));
    env.exact = false;
    return pow(a, b, env.settings);
}
function root(x, n, env) {
    return atScale(env, context => nthRoot(x, n, context), result => powersEqual(result.toRational(), BigInt(n), x.toRational(), 1n));
}
function degree(n) {
    const value = n.isInteger() && n.isPositive() ? Number(n.toBigInt()) : 0;
    if (Number.isSafeInteger(value) && value > 0)
        return value;
    throw new InvalidArgumentError(`nthRoot needs a positive integer degree, got ${n.toString()}`);
}
/** log_base(x) = r is exact when x^q = base^p, with r = p/q. */
function logIsExact(x, base, result) {
    const r = result.toRational();
    return powersEqual(x.toRational(), r.denominator, base.toRational(), r.numerator);
}
function logarithm(x, base, env) {
    return atScale(env, context => log(x, base, context), result => logIsExact(x, base, result));
}
/** Floored modulo, as in float: the result has the sign of the divisor. */
function mod(a, b) {
    if (b.isZero())
        throw new DivisionByZeroError(`mod(${a.toString()}, 0) divides by zero`);
    const r = a.mod(b);
    return !r.isZero() && r.isNegative() !== b.isNegative() ? r.plus(b) : r;
}
function factorial(x, env) {
    if (!x.isInteger()) {
        throw new InvalidArgumentError(`factorial(${x.toString()}) needs an integer: the decimal domain has no gamma function`);
    }
    return decimal(factorialOf(x.toBigInt(), env.digits, x.toString()));
}
/** π or e at `scale` in the caller's rounding mode, from a few guard digits more (Ziv's strategy). */
function irrational(name, digits) {
    return env => {
        const { scale, rounding } = env.settings;
        if (rounding === 'unnecessary') {
            throw new RoundingNecessaryError(`${name} has infinitely many digits: pass a rounding mode such as "halfEven"`);
        }
        env.exact = false;
        for (let guard = 4; guard <= 1024; guard *= 2) {
            // Within half a unit of its last digit, so the true value lies in [approximation ± unit].
            const approximation = digits(scale + guard);
            const unit = decimal(`1e-${scale + guard}`);
            const low = approximation.minus(unit).toScale(scale, rounding);
            if (low.eq(approximation.plus(unit).toScale(scale, rounding)))
                return low;
        }
        throw new ResourceLimitError(`${name} could not be rounded at scale ${scale}`);
    };
}
/** A function computed at `scale`; `isExact(x, result)` decides whether the result is the exact value. */
function scaled(compute, isExact) {
    return (x, env) => atScale(env, context => compute(x, context), result => isExact(x, result));
}
const sqrt = (x, env) => root(x, 2, env);
const naturalLog = scaled(ln, x => x.eq(1));
const FUNCTIONS = new Map([
    ['sqrt', { unary: sqrt }],
    ['cbrt', { unary: (x, env) => root(x, 3, env) }],
    ['nthRoot', { unary: sqrt, binary: (x, n, env) => root(x, degree(n), env) }],
    ['exp', { unary: scaled(exp, x => x.isZero()) }],
    ['ln', { unary: naturalLog }],
    ['log', { unary: naturalLog, binary: logarithm }],
    ['log10', { unary: scaled(log10, (x, result) => logIsExact(x, decimal(10), result)) }],
    ['log2', { unary: scaled(log2, (x, result) => logIsExact(x, decimal(2), result)) }],
    ['pow', { binary: power }],
    ['abs', { unary: x => x.abs() }],
    ['sign', { unary: x => decimal(x.sign()) }],
    ['ceil', { unary: x => x.toScale(0, 'ceiling') }],
    ['floor', { unary: x => x.toScale(0, 'floor') }],
    // Half away from zero, as calculators (and the float domain) round.
    ['round', { unary: x => x.toScale(0, 'halfUp') }],
    ['fix', { unary: x => x.toScale(0, 'down') }],
    ['factorial', { unary: factorial }],
    ['mod', { binary: mod }],
]);
const DOMAIN = {
    name: 'decimal',
    literal: raw => decimal(raw),
    input: value => isDecimal(value) || typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint'
        ? decimal(value)
        : undefined,
    is: isDecimal,
    large: value => value.scale > 100 || (value.coefficient < 0n ? -value.coefficient : value.coefficient) >= LARGE,
    negate: a => a.negated(),
    ops: {
        '+': (a, b) => a.plus(b),
        '-': (a, b) => a.minus(b),
        '*': (a, b) => a.times(b),
        '/': divide,
        '^': power,
    },
    functions: FUNCTIONS,
    constants: new Map([
        ['pi', irrational('pi', PI)],
        ['e', irrational('e', E)],
    ]),
};
/**
 * Compiles an expression to a function of its declared variables, on
 * Decimals. Throws `ParseError` (`unknown-name`, `name-conflict`,
 * `not-in-domain` for trigonometry and `i`, `arity`) and `ExprLimitError`
 * here, before any evaluation. Constant subtrees are folded.
 *
 * ```ts
 * const price = compile(parse('base * (1 + rate)'), { variables: ['base', 'rate'], scale: 2, rounding: 'halfEven' });
 * price({ base: '19.99', rate: '0.19' }).toString(); // '23.7881' — multiplication never rounds
 * ```
 */
export function compile(expr, options) {
    return compileExact(DOMAIN, contextOf(options), expr, [...(options?.variables ?? [])], options ?? {});
}
/** Compiles both sides of `lhs = rhs` and their difference, on one set of slots. */
export function compileEquation(equation, options) {
    return compileEquationExact(DOMAIN, contextOf(options), equation, [...(options?.variables ?? [])], options ?? {});
}
/** Parses, compiles and evaluates an expression with no variables: `evaluate('0.1 + 0.2')` is `0.3`. Reads outside text, so it returns the value or a failure from `EVALUATE_FAILURES` (`expr.invalid_text`, `expr.over_budget`, `expr.no_value`, each with the thrown error as `cause`) and never throws for bad text. */
export function evaluate(text, options) {
    return attempt(() => evaluateExact(DOMAIN, contextOf(options), text, options ?? {}), evaluationFailure);
}
//# sourceMappingURL=decimal.js.map