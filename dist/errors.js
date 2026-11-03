import { defineFailure } from '@arki/failure';
import { MathError, ResourceLimitError } from '@arki/math/errors';
/** The input text (or a stored AST) is not an expression this language accepts. */
export class ParseError extends MathError {
    code;
    remediation = 'Fix the text at `span`; `expected` lists what fits there.';
    span;
    /** Same as `span.start`: where to put the caret. */
    position;
    /** What the parser would have accepted at `span`, e.g. `['(']` or `['number', 'name']`. */
    expected;
    /** The text found at `span`, or `'end of input'`. */
    found;
    constructor(message, details) {
        super(message);
        this.code = details.code;
        this.span = { start: details.span.start, end: details.span.end };
        this.position = details.span.start;
        this.expected = Object.freeze([...(details.expected ?? [])]);
        this.found = details.found;
    }
}
/**
 * The text given to `parse`, `parseEquation` or `evaluate`, or the stored JSON given to `fromJSON`, is not an expression the language accepts. `cause` is the `ParseError`, with `span`, `expected` and `found` for the caret.
 *
 * @fix Show the user the span from `cause` and ask for the expression again; do not retry the same text.
 * @verify cd packages/expr && bun run vitest run src/complex.test.ts src/grammar.test.ts src/json.test.ts
 */
export const InvalidExpression = /* @__PURE__ */ defineFailure('expr.invalid_text', {
    status: 400,
    message: 'The text is not an expression this language accepts.',
    remediation: 'Fix the text at the span of the cause, then evaluate again.',
});
/**
 * The text given to `parse`, `parseEquation` or `evaluate`, or the JSON given to `fromJSON`, went over a length, token, depth, node, step or digit budget. `cause` is the `ExprLimitError`.
 *
 * @fix Reject the input as too large, or raise `options.limits` on purpose.
 * @verify cd packages/expr && bun run vitest run src/complex.test.ts src/hostile.test.ts
 */
export const ExpressionOverBudget = /* @__PURE__ */ defineFailure('expr.over_budget', {
    status: 400,
    message: 'The expression is over its budget.',
    remediation: 'Shorten the expression, or raise the budget in options.limits on purpose.',
});
/**
 * The expression has no value in its domain: `x/0`, `0^i`, `sqrt(-1)` in a real domain, an overflow, or an exact result that needs a rounding mode. `cause` is the `@arki/math` error.
 *
 * @fix Show the user that the expression has no value; read `cause.code` for which rule, or pass a rounding mode for an exact domain.
 * @verify cd packages/expr && bun run vitest run src/complex.test.ts src/rational.test.ts src/decimal.test.ts
 */
export const NoValue = /* @__PURE__ */ defineFailure('expr.no_value', {
    status: 400,
    message: 'The expression has no value in this domain.',
    remediation: 'Change the expression, or for Decimal and Rational pass a rounding mode.',
});
/**
 * `syntaxFor` got a locale tag the runtime's `Intl` rejects.
 *
 * @fix Pass a BCP 47 tag such as `'de-DE'`, or a syntax preset (`canonical`, `decimalComma`).
 * @verify cd packages/expr && bun run vitest run src/language.test.ts
 */
export const InvalidLocale = /* @__PURE__ */ defineFailure('expr.invalid_locale', {
    status: 400,
    message: 'The locale is not a valid BCP 47 tag.',
    remediation: 'Pass a BCP 47 locale tag such as de-DE, or a syntax preset.',
});
/**
 * `parseSyntax` got a stored value that is not a syntax: an unknown mark, or a decimal comma with the `,` separator.
 *
 * @fix Store `canonical` or `decimalComma`, or `{ decimal: '.', separator: ',' | ';' }` or `{ decimal: ',', separator: ';' }`.
 * @verify cd packages/expr && bun run vitest run src/language.test.ts
 */
export const InvalidSyntax = /* @__PURE__ */ defineFailure('expr.invalid_syntax', {
    status: 400,
    message: 'The stored value is not a syntax.',
    remediation: 'Store a decimal mark of "." or "," and a separator of "," or ";", never "," for both.',
});
/** What `parse`, `parseEquation` and `fromJSON` return instead of a tree. The one list; {@link ParseFailure} is derived from it. */
export const PARSE_FAILURES = [InvalidExpression, ExpressionOverBudget];
/** What `evaluate(text)` returns instead of a value: the parse failures, then {@link NoValue}. {@link EvaluateFailure} is derived from it. */
// A spread is not side-effect free to a bundler, so the pure call lets entries that never parse drop these lists.
export const EVALUATE_FAILURES = /* @__PURE__ */ (() => [...PARSE_FAILURES, NoValue])();
/** Every failure this package returns. */
export const EXPR_FAILURES = /* @__PURE__ */ (() => [...EVALUATE_FAILURES, InvalidLocale, InvalidSyntax])();
/**
 * `parse`, `parseEquation` and `fromJSON` read outside text: a thrown
 * `ParseError` or `ExprLimitError` becomes its returned failure, with the error
 * as `cause`. Anything else (a non-string argument, a language that is not
 * built by `defineLanguage`: a bug) is thrown on.
 */
export function parseFailure(error) {
    if (error instanceof ParseError)
        return InvalidExpression({ cause: error });
    if (error instanceof ExprLimitError)
        return ExpressionOverBudget({ cause: error });
    throw error;
}
/**
 * `evaluate` reads outside text: a thrown `ParseError`, `ExprLimitError` or
 * `@arki/math` error becomes its returned failure, with the error as `cause`.
 * Anything else (an aborted signal's reason, a bug) is thrown on.
 */
export function evaluationFailure(error) {
    if (error instanceof ParseError)
        return InvalidExpression({ cause: error });
    if (error instanceof ExprLimitError)
        return ExpressionOverBudget({ cause: error });
    if (error instanceof MathError)
        return NoValue({ cause: error });
    throw error;
}
/** An input went over one of its budgets. Thrown before the expensive work, never after. */
export class ExprLimitError extends ResourceLimitError {
    budget;
    limit;
    /** The size seen when the budget broke; for streaming checks this is `limit + 1`. */
    actual;
    constructor(budget, limit, actual) {
        super(`Expression ${budget} budget exceeded: ${actual} > ${limit}`);
        this.budget = budget;
        this.limit = limit;
        this.actual = actual;
    }
}
//# sourceMappingURL=errors.js.map