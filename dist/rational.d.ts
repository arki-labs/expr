import type { RationalInput } from '@arki/math/rational';
import { Rational } from '@arki/math/rational';
import type { Equation, Expr } from './ast.js';
import type { CallOptions, ExactEquation, ExactFunction, HostTables, Scientific } from './exact.js';
import type { Language } from './language.js';
import type { ExactLimits, Limits } from './limits.js';
import type { Syntax } from './syntax.js';
export type { Rational, RationalInput } from '@arki/math/rational';
export type { Reading } from './bind.js';
export type { CallOptions, Detailed } from './exact.js';
export type { AbortSignalLike } from './float.js';
export type { ExactLimits } from './limits.js';
/** A host function in this domain: Rationals in, a Rational out. */
export type RationalFunction = (...args: Rational[]) => Rational;
/** Values for the declared variables: anything `ratio()` accepts. Extra keys are ignored. */
export type Scope<V extends string = string> = Readonly<Record<V, RationalInput>>;
export type CompiledFunction<V extends string = string> = ExactFunction<Rational, RationalInput, V>;
export type CompiledEquation<V extends string = string> = ExactEquation<Rational, RationalInput, V>;
export type CompileOptions<L extends Language = Scientific, V extends string = string> = {
    /** The language the expression was parsed with. Default `scientific`. */
    readonly language?: L;
    /** The variables, in slot order. Any other name must be a constant or split into declared letters. */
    readonly variables?: readonly V[];
    readonly limits?: ExactLimits;
} & HostTables<L, RationalFunction, RationalInput>;
export type EvaluateOptions<L extends Language = Scientific> = CallOptions & {
    readonly language?: L;
    readonly syntax?: Syntax;
    /** Parse budgets plus the compile budgets. */
    readonly limits?: Limits & ExactLimits;
} & HostTables<L, RationalFunction, RationalInput>;
/**
 * Compiles an expression to a function of its declared variables, on
 * Rationals. Throws `ParseError` (`unknown-name`, `name-conflict`,
 * `not-in-domain` for `exp`, logarithms, trigonometry, `pi`, `e`, `i`,
 * `arity`) and `ExprLimitError` here, before any evaluation. Constant
 * subtrees are folded.
 *
 * ```ts
 * compile(parse('x/3 + 1/6'), { variables: ['x'] })({ x: '0.5' }).toString(); // '1/3'
 * ```
 */
export declare function compile<const V extends string = never, L extends Language = Scientific>(expr: Expr, options?: CompileOptions<L, V>): CompiledFunction<V>;
/** Compiles both sides of `lhs = rhs` and their difference, on one set of slots. */
export declare function compileEquation<const V extends string = never, L extends Language = Scientific>(equation: Equation, options?: CompileOptions<L, V>): CompiledEquation<V>;
/** Parses, compiles and evaluates an expression with no variables: `evaluate('8^(2/3)')` is 4. Reads outside text, so it returns the value or a failure from `EVALUATE_FAILURES` (`expr.invalid_text`, `expr.over_budget`, `expr.no_value`, each with the thrown error as `cause`) and never throws for bad text. */
export declare function evaluate<L extends Language = Scientific>(text: string, options?: EvaluateOptions<L>): import("@arki/failure").Failure<"expr.invalid_text", undefined> | import("@arki/failure").Failure<"expr.no_value", undefined> | import("@arki/failure").Failure<"expr.over_budget", undefined> | Rational;
//# sourceMappingURL=rational.d.ts.map