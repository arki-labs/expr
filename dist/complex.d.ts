import { Complex } from '@arki/math/complex';
import type { Equation, Expr } from './ast.js';
import type { CallOptions, ExactEquation, ExactFunction, HostTables, Scientific } from './exact.js';
import type { Angle } from './float-builtins.js';
import type { Language } from './language.js';
import type { ExactLimits, Limits } from './limits.js';
import type { Syntax } from './syntax.js';
export type { Complex } from '@arki/math/complex';
export type { Reading } from './bind.js';
export type { CallOptions, Detailed } from './exact.js';
export type { AbortSignalLike } from './float.js';
export type { Angle } from './float-builtins.js';
export type { ExactLimits } from './limits.js';
/**
 * A value for a variable or a host constant: a `Complex`, a finite number
 * (a real), or finite `{ re, im }` parts. Text is not a value: parse it.
 */
export type ComplexLike = Complex | number | {
    readonly re: number;
    readonly im: number;
};
/** A host function in this domain: Complexes in, a Complex out. */
export type ComplexFunction = (...args: Complex[]) => Complex;
/** Values for the declared variables. Extra keys are ignored. */
export type Scope<V extends string = string> = Readonly<Record<V, ComplexLike>>;
export type CompiledFunction<V extends string = string> = ExactFunction<Complex, ComplexLike, V>;
export type CompiledEquation<V extends string = string> = ExactEquation<Complex, ComplexLike, V>;
export type CompileOptions<L extends Language = Scientific, V extends string = string> = {
    /** The language the expression was parsed with. Default `scientific`. */
    readonly language?: L;
    /** The variables, in slot order. `i` cannot be one: it is a constant here. */
    readonly variables?: readonly V[];
    /** The unit of trigonometric arguments and inverse-trigonometric results. Default `'rad'`. */
    readonly angle?: Angle;
    readonly limits?: ExactLimits;
} & HostTables<L, ComplexFunction, ComplexLike>;
export type EvaluateOptions<L extends Language = Scientific> = CallOptions & {
    readonly language?: L;
    readonly syntax?: Syntax;
    readonly angle?: Angle;
    /** Parse budgets plus the compile budgets. */
    readonly limits?: Limits & ExactLimits;
} & HostTables<L, ComplexFunction, ComplexLike>;
/**
 * Compiles an expression to a function of its declared variables, on
 * Complexes. Throws `ParseError` (`unknown-name`, `name-conflict` — `i` is a
 * constant here —, `not-in-domain` for `cbrt nthRoot sign ceil floor round fix
 * mod factorial gamma`, `arity`) and `ExprLimitError` here, before any
 * evaluation. Constant subtrees are folded.
 *
 * ```ts
 * compile(parse('sqrt(x)'), { variables: ['x'] })({ x: -4 }).toString(); // '2i'
 * ```
 */
export declare function compile<const V extends string = never, L extends Language = Scientific>(expr: Expr, options?: CompileOptions<L, V>): CompiledFunction<V>;
/** Compiles both sides of `lhs = rhs` and their difference, on one set of slots. */
export declare function compileEquation<const V extends string = never, L extends Language = Scientific>(equation: Equation, options?: CompileOptions<L, V>): CompiledEquation<V>;
/** Parses, compiles and evaluates an expression with no variables: `evaluate('sqrt(-4)')` is `2i`. Reads outside text, so it returns the value or a failure from `EVALUATE_FAILURES` (`expr.invalid_text`, `expr.over_budget`, `expr.no_value`, each with the thrown error as `cause`) and never throws for bad text. */
export declare function evaluate<L extends Language = Scientific>(text: string, options?: EvaluateOptions<L>): Complex | import("@arki/failure").Failure<"expr.invalid_text", undefined> | import("@arki/failure").Failure<"expr.no_value", undefined> | import("@arki/failure").Failure<"expr.over_budget", undefined>;
//# sourceMappingURL=complex.d.ts.map