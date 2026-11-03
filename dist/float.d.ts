import type { Equation, Expr, Warning } from './ast.js';
import type { Reading } from './bind.js';
import type { Angle } from './float-builtins.js';
import type { ConstantNameOf, FunctionNameOf, Language, ScientificConstant, ScientificFunction } from './language.js';
import type { CompileLimits, Limits } from './limits.js';
import type { Syntax } from './syntax.js';
export type { Angle } from './float-builtins.js';
export type { Reading } from './bind.js';
/** A host function in this domain: numbers in, a number out. It never sees the AST or the scope. */
export type FloatFunction = (...args: number[]) => number;
/** Values for the declared variables. Extra keys are ignored. */
export type Scope<V extends string = string> = Readonly<Record<V, number>>;
/** The part of `AbortSignal` that `sample` reads. */
export type AbortSignalLike = {
    readonly aborted: boolean;
    readonly reason?: unknown;
};
export type SampleOptions = {
    /** Checked every 1 024 points; an aborted signal throws its `reason`. */
    readonly signal?: AbortSignalLike;
};
export type CompiledFunction<V extends string = string> = {
    /** Evaluates at `scope`. Throws a typed error instead of returning `NaN` or ±Infinity. */
    (scope?: Scope<V>): number;
    /** The single-variable fast path: no scope object. Throws unless exactly one variable is declared. */
    at(x: number): number;
    /**
     * Evaluates at every `xs[i]` into `out[i]` and returns `out`. A point
     * with no finite value is `NaN` — a gap in a plot (C-22). This is the
     * only call in the package that returns `NaN`.
     */
    sample(xs: Float64Array, out: Float64Array, options?: SampleOptions): Float64Array;
    /** The declared variables, in slot order. */
    readonly variables: readonly V[];
    /** Each multi-letter name read as a product of letters (`xy` → `x·y`). */
    readonly readings: readonly Reading[];
    /** The parse warnings plus `split-after-division` for `a/bc` read as `a/(b·c)`. */
    readonly warnings: readonly Warning[];
};
/** The three sides of a compiled equation; all share the same slots. */
export type CompiledEquation<V extends string = string> = {
    readonly left: CompiledFunction<V>;
    readonly right: CompiledFunction<V>;
    /** `left - right`, for root finding and back-substitution. */
    readonly difference: CompiledFunction<V>;
};
type Scientific = Language<ScientificFunction, ScientificConstant>;
type HostFunctionName<L> = Exclude<FunctionNameOf<L>, ScientificFunction>;
type HostConstantName<L> = Exclude<ConstantNameOf<L>, ScientificConstant>;
/**
 * Implementations for the host names of `L`: required by the types when the
 * language declares a function or constant that `scientific` does not have.
 */
export type HostImplementations<L> = ([HostFunctionName<L>] extends [never] ? {
    readonly functions?: Readonly<Record<string, FloatFunction>>;
} : {
    readonly functions: Readonly<Record<HostFunctionName<L>, FloatFunction>>;
}) & ([HostConstantName<L>] extends [never] ? {
    readonly constants?: Readonly<Record<string, number>>;
} : {
    readonly constants: Readonly<Record<HostConstantName<L>, number>>;
});
type CommonOptions<L> = {
    /** The language the expression was parsed with. Default `scientific`. */
    readonly language?: L;
    /** Unit for trigonometry: forward-trig arguments and inverse-trig results. Default `'rad'`. */
    readonly angle?: Angle;
};
export type CompileOptions<L extends Language = Scientific, V extends string = string> = CommonOptions<L> & {
    /** The variables, in slot order. Any other name must be a constant or split into declared letters. */
    readonly variables?: readonly V[];
    readonly limits?: CompileLimits;
} & HostImplementations<L>;
export type EvaluateOptions<L extends Language = Scientific> = CommonOptions<L> & {
    readonly syntax?: Syntax;
    /** Parse budgets plus the compile budgets. */
    readonly limits?: Limits & CompileLimits;
} & HostImplementations<L>;
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
export declare function compile<const V extends string = never, L extends Language = Scientific>(expr: Expr, options?: CompileOptions<L, V>): CompiledFunction<V>;
/** Compiles both sides of `lhs = rhs` and their difference, on one set of slots (C-14, C-17). */
export declare function compileEquation<const V extends string = never, L extends Language = Scientific>(equation: Equation, options?: CompileOptions<L, V>): CompiledEquation<V>;
/** Parses, compiles and evaluates an expression with no variables: the keypad's one-shot call (C-15). Reads outside text, so it returns the value or a failure from `EVALUATE_FAILURES` (`expr.invalid_text`, `expr.over_budget`, `expr.no_value`, each with the thrown error as `cause`) and never throws for bad text. */
export declare function evaluate<L extends Language = Scientific>(text: string, options?: EvaluateOptions<L>): number | import("@arki/failure").Failure<"expr.invalid_text", undefined> | import("@arki/failure").Failure<"expr.no_value", undefined> | import("@arki/failure").Failure<"expr.over_budget", undefined>;
//# sourceMappingURL=float.d.ts.map