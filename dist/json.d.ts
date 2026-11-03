import type { Equation, Expr } from './ast.js';
import type { Language } from './language.js';
import type { Limits } from './limits.js';
export type FromJSONOptions = {
    /** The language the tree must belong to. Default `scientific`. */
    readonly language?: Language;
    readonly limits?: Limits;
};
/**
 * Rebuilds an expression or equation from AST JSON (the value, not the
 * text: pass `JSON.parse(text)`). Returns `InvalidExpression` (the
 * `ParseError` is the `cause`) for anything that is not a valid version-1 tree
 * in `options.language`, and `ExpressionOverBudget` when it is over budget.
 * Pre-1.0 there is no migration: only version 1 is accepted. A language not
 * built by `defineLanguage` is a bug and still throws.
 */
export declare function fromJSON(value: unknown, options?: FromJSONOptions): Equation | Expr | import("@arki/failure").Failure<"expr.invalid_text", undefined> | import("@arki/failure").Failure<"expr.over_budget", undefined>;
//# sourceMappingURL=json.d.ts.map