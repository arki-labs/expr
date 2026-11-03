import type { Decimal, DecimalInput, RoundingMode } from '@arki/math/decimal';
import type { Equation, Expr } from './ast.js';
import type { CallOptions, ExactEquation, ExactFunction, HostTables, Scientific } from './exact.js';
import type { Language } from './language.js';
import type { ExactLimits, Limits } from './limits.js';
import type { Syntax } from './syntax.js';
export type { Decimal, DecimalInput, RoundingMode } from '@arki/math/decimal';
export type { Reading } from './bind.js';
export type { CallOptions, Detailed } from './exact.js';
export type { AbortSignalLike } from './float.js';
export type { ExactLimits } from './limits.js';
/** Where an inexact step rounds to. */
export type DecimalContext = {
    /** Fraction digits of a rounded quotient and of every function result. Default 20. */
    readonly scale?: number;
    /** How a step that cannot be exact rounds. Default `'unnecessary'`: such a step throws `RoundingNecessaryError`. */
    readonly rounding?: RoundingMode;
};
/** A host function in this domain: Decimals in, a Decimal out. */
export type DecimalFunction = (...args: Decimal[]) => Decimal;
/** Values for the declared variables: anything `decimal()` accepts. Extra keys are ignored. */
export type Scope<V extends string = string> = Readonly<Record<V, DecimalInput>>;
export type CompiledFunction<V extends string = string> = ExactFunction<Decimal, DecimalInput, V>;
export type CompiledEquation<V extends string = string> = ExactEquation<Decimal, DecimalInput, V>;
export type CompileOptions<L extends Language = Scientific, V extends string = string> = DecimalContext & {
    /** The language the expression was parsed with. Default `scientific`. */
    readonly language?: L;
    /** The variables, in slot order. Any other name must be a constant or split into declared letters. */
    readonly variables?: readonly V[];
    readonly limits?: ExactLimits;
} & HostTables<L, DecimalFunction, DecimalInput>;
export type EvaluateOptions<L extends Language = Scientific> = DecimalContext & CallOptions & {
    readonly language?: L;
    readonly syntax?: Syntax;
    /** Parse budgets plus the compile budgets. */
    readonly limits?: Limits & ExactLimits;
} & HostTables<L, DecimalFunction, DecimalInput>;
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
export declare function compile<const V extends string = never, L extends Language = Scientific>(expr: Expr, options?: CompileOptions<L, V>): CompiledFunction<V>;
/** Compiles both sides of `lhs = rhs` and their difference, on one set of slots. */
export declare function compileEquation<const V extends string = never, L extends Language = Scientific>(equation: Equation, options?: CompileOptions<L, V>): CompiledEquation<V>;
/** Parses, compiles and evaluates an expression with no variables: `evaluate('0.1 + 0.2')` is `0.3`. Reads outside text, so it returns the value or a failure from `EVALUATE_FAILURES` (`expr.invalid_text`, `expr.over_budget`, `expr.no_value`, each with the thrown error as `cause`) and never throws for bad text. */
export declare function evaluate<L extends Language = Scientific>(text: string, options?: EvaluateOptions<L>): Decimal | import("@arki/failure").Failure<"expr.invalid_text", undefined> | import("@arki/failure").Failure<"expr.no_value", undefined> | import("@arki/failure").Failure<"expr.over_budget", undefined>;
//# sourceMappingURL=decimal.d.ts.map