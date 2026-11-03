import type { Equation, Expr } from './ast.js';
import type { Language } from './language.js';
import type { Limits } from './limits.js';
import type { Syntax } from './syntax.js';
export type ParseOptions = {
    /** The registered functions and constants. Default `scientific`. */
    readonly language?: Language;
    /** Decimal mark and argument separator. Default `canonical`. */
    readonly syntax?: Syntax;
    readonly limits?: Limits;
    /**
     * Names the host will declare as variables at compile. Only needed to read
     * a variable directly before `(` as a product (`x(y+1)`): without it, a name
     * that is neither a function nor a constant followed by `(` is a
     * `not-a-function` error, never a guess.
     */
    readonly variables?: readonly string[];
};
/**
 * Parses an expression, or returns `InvalidExpression` (`expr.invalid_text`; the
 * `ParseError` with its span is the `cause`) for text the grammar rejects and
 * `ExpressionOverBudget` (`expr.over_budget`) when a budget breaks. Warnings
 * flag legal but easily misread inputs such as `1/2x`. A non-string `text` or a
 * language not built by `defineLanguage` is a bug and still throws.
 */
export declare function parse(text: string, options?: ParseOptions): Expr | import("@arki/failure").Failure<"expr.invalid_text", undefined> | import("@arki/failure").Failure<"expr.over_budget", undefined>;
/** `parse` for text that is a bug if it fails (the engine's own text): throws the `ParseError` or `ExprLimitError`. */
export declare function parseText(text: string, options?: ParseOptions): Expr;
/** Parses `lhs = rhs`, with exactly one `=`. Returns the same failures as {@link parse}. */
export declare function parseEquation(text: string, options?: ParseOptions): Equation | import("@arki/failure").Failure<"expr.invalid_text", undefined> | import("@arki/failure").Failure<"expr.over_budget", undefined>;
/** `parseEquation` for text that is a bug if it fails: throws the `ParseError` or `ExprLimitError`. */
export declare function parseEquationText(text: string, options?: ParseOptions): Equation;
//# sourceMappingURL=parser.d.ts.map