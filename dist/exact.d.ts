/**
 * The evaluator shared by the exact domains, `@arki/expr/decimal` and
 * `@arki/expr/rational` (RFC §8, §10, §11), and reused by
 * `@arki/expr/complex`, whose values are float64 and never exact. A domain supplies its value
 * type's operations; this module resolves names, builds the closure tree,
 * folds constant subtrees, checks the budgets and the abort signal, and
 * tracks whether any step rounded.
 *
 * Closures take the slot values and a per-call environment: the `exact`
 * flag (cleared by a step that rounds), the signal and the settings. No
 * `eval`, no `new Function`.
 */
import type { Rational } from '@arki/math/rational';
import type { Equation, Expr, Warning } from './ast.js';
import type { Reading } from './bind.js';
import type { AbortSignalLike } from './float.js';
import type { ConstantNameOf, FunctionNameOf, Language, ScientificConstant, ScientificFunction } from './language.js';
import type { ExactLimits, Limits } from './limits.js';
import type { Syntax } from './syntax.js';
/** Per-call state. `settings` is the domain's own context (Decimal: `{ scale, rounding }`). */
export type Env<S> = {
    /** True until a step rounds. */
    exact: boolean;
    readonly signal: AbortSignalLike | undefined;
    /** The `digits` budget. */
    readonly digits: number;
    readonly settings: S;
};
export type Unary<T, S> = (a: T, env: Env<S>) => T;
export type Binary<T, S> = (a: T, b: T, env: Env<S>) => T;
export type Builtin<T, S> = {
    readonly unary?: Unary<T, S>;
    readonly binary?: Binary<T, S>;
};
export type BinaryOp = '+' | '-' | '*' | '/' | '^';
/** What a value type brings to the evaluator. */
export type Domain<T, S> = {
    /** For messages: `'decimal'`, `'rational'`. */
    readonly name: string;
    /** Reads a literal's `raw` text exactly (`0.1` is 1/10). */
    readonly literal: (raw: string) => T;
    /** Converts a scope or host-constant value, or returns `undefined` for a type it does not accept. */
    readonly input: (value: unknown) => T | undefined;
    readonly is: (value: unknown) => value is T;
    /** More than 100 digits: the signal is checked before an operation on such a value. */
    readonly large: (value: T) => boolean;
    readonly negate: Unary<T, S>;
    readonly ops: Readonly<Record<BinaryOp, Binary<T, S>>>;
    readonly functions: ReadonlyMap<string, Builtin<T, S>>;
    readonly constants: ReadonlyMap<string, (env: Env<S>) => T>;
    /** Float-valued (Complex): `detailed` always reports `exact: false`. */
    readonly approximate?: boolean;
};
/** Options of a single call. */
export type CallOptions = {
    /** Checked before each operation on a value above 100 digits; an aborted signal throws its `reason`. */
    readonly signal?: AbortSignalLike;
};
/** A value and whether it is exact: `false` once any step rounded. */
export type Detailed<T> = {
    readonly value: T;
    readonly exact: boolean;
};
export type ExactFunction<T, I, V extends string> = {
    /** Evaluates at `scope`. Throws typed `@arki/math` errors. */
    (scope?: Readonly<Record<V, I>>, options?: CallOptions): T;
    /** Evaluates at `scope` and reports whether any step rounded, so a UI can show `≈`. */
    detailed(scope?: Readonly<Record<V, I>>, options?: CallOptions): Detailed<T>;
    /** The declared variables, in slot order. */
    readonly variables: readonly V[];
    /** Each multi-letter name read as a product of letters (`xy` → `x·y`). */
    readonly readings: readonly Reading[];
    /** The parse warnings plus `split-after-division` for `a/bc` read as `a/(b·c)`. */
    readonly warnings: readonly Warning[];
};
/** The three sides of a compiled equation; all share the same slots. */
export type ExactEquation<T, I, V extends string> = {
    readonly left: ExactFunction<T, I, V>;
    readonly right: ExactFunction<T, I, V>;
    /** `left - right`. */
    readonly difference: ExactFunction<T, I, V>;
};
export type Scientific = Language<ScientificFunction, ScientificConstant>;
type HostFunctionName<L> = Exclude<FunctionNameOf<L>, ScientificFunction>;
type HostConstantName<L> = Exclude<ConstantNameOf<L>, ScientificConstant>;
/** Implementations for the host names of `L`, required by the types when the language declares names `scientific` lacks. */
export type HostTables<L, F, C> = ([HostFunctionName<L>] extends [never] ? {
    readonly functions?: Readonly<Record<string, F>>;
} : {
    readonly functions: Readonly<Record<HostFunctionName<L>, F>>;
}) & ([HostConstantName<L>] extends [never] ? {
    readonly constants?: Readonly<Record<string, C>>;
} : {
    readonly constants: Readonly<Record<HostConstantName<L>, C>>;
});
type HostFunction<T> = (...args: T[]) => T;
/** The options every exact domain's `compile` reads, untyped by language. */
export type ExactOptions<T> = {
    readonly language?: Language;
    readonly limits?: ExactLimits;
    readonly functions?: Readonly<Record<string, HostFunction<T>>>;
    readonly constants?: Readonly<Record<string, unknown>>;
};
export type ExactEvaluateOptions<T> = Omit<ExactOptions<T>, 'limits'> & CallOptions & {
    readonly syntax?: Syntax;
    readonly limits?: Limits & ExactLimits;
};
/** 10^100: an operand at or above it (or with more than 100 fraction digits) is "above 100 digits". */
export declare const LARGE: bigint;
/** log10 |x|, from the digit count and the leading 17 digits; 0 for 0. */
export declare function log10Abs(x: bigint): number;
/** max(log10 |numerator|, log10 denominator): the digits of the larger part. */
export declare function rationalSize(value: Rational): number;
/**
 * Throws `ExprLimitError` when `base^exponent`, with `size` ≈ log10 of the
 * base's larger part, would have more than `limit` digits (≈ |exponent| ×
 * size). A base of size 0 (0, ±1) never grows.
 */
export declare function powerBudget(size: number, exponent: number, limit: number): void;
/** `base^n` for a base of 0, 1 or -1 (given as its sign) and an integer `n` of any size. */
export declare function unitPower(sign: -1 | 0 | 1, n: bigint): -1 | 0 | 1;
/** `n!` for an integer `n >= 0`, after a Stirling estimate of its digits against `limit`. */
export declare function factorialOf(n: bigint, limit: number, shown: string): bigint;
/**
 * Whether a^m = b^n exactly (m >= 1). Equal powers have equal sizes, so a
 * size mismatch answers without any bigint work; past 10 000 digits (math's
 * own cap) it answers `false`, which only ever under-reports exactness.
 */
export declare function powersEqual(a: Rational, m: bigint, b: Rational, n: bigint): boolean;
export declare function compileExact<T, S, V extends string>(domain: Domain<T, S>, settings: S, expr: Expr, variables: readonly V[], options: ExactOptions<T>): ExactFunction<T, unknown, V>;
export declare function compileEquationExact<T, S, V extends string>(domain: Domain<T, S>, settings: S, equation: Equation, variables: readonly V[], options: ExactOptions<T>): ExactEquation<T, unknown, V>;
export declare function evaluateExact<T, S>(domain: Domain<T, S>, settings: S, text: string, options: ExactEvaluateOptions<T>): T;
export {};
//# sourceMappingURL=exact.d.ts.map