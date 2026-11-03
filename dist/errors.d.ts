/**
 * Parsers of outside values return, builders throw. `parse`, `parseEquation`,
 * `fromJSON`, `evaluate(text)`, `syntaxFor(locale)` and `parseSyntax(stored)`
 * return the failures below; the thrown `ParseError` or `ExprLimitError` is the
 * failure's `cause`, with the span for the caret. `compile`, `compileEquation`,
 * `defineLanguage`, `defineSyntax` and compiled functions take typed values the
 * caller built, so they throw: a `ParseError` for a name or arity the language
 * rejects, or one of math's own errors for the values, unchanged.
 */
import type { FailureOf } from '@arki/failure';
import { MathError, ResourceLimitError } from '@arki/math/errors';
/** A range of the source text, as UTF-16 offsets (`start` inclusive, `end` exclusive). */
export type Span = {
    readonly start: number;
    readonly end: number;
};
/** Why a text, AST or language was rejected. Apps translate messages by this code. */
export type ParseErrorCode = 'unexpected-token' | 'unexpected-end' | 'unbalanced-paren' | 'unbalanced-bar' | 'bad-number' | 'not-a-function' | 'unknown-name' | 'arity' | 'name-conflict' | 'not-in-domain';
/** The input text (or a stored AST) is not an expression this language accepts. */
export declare class ParseError extends MathError {
    readonly code: ParseErrorCode;
    readonly remediation = "Fix the text at `span`; `expected` lists what fits there.";
    readonly span: Span;
    /** Same as `span.start`: where to put the caret. */
    readonly position: number;
    /** What the parser would have accepted at `span`, e.g. `['(']` or `['number', 'name']`. */
    readonly expected: readonly string[];
    /** The text found at `span`, or `'end of input'`. */
    readonly found: string;
    constructor(message: string, details: {
        readonly code: ParseErrorCode;
        readonly span: Span;
        readonly expected?: readonly string[];
        readonly found: string;
    });
}
/** The budget a limit applies to (RFC §11). Parsing checks the first four. */
export type Budget = 'length' | 'tokens' | 'depth' | 'nodes' | 'steps' | 'digits';
/**
 * The text given to `parse`, `parseEquation` or `evaluate`, or the stored JSON given to `fromJSON`, is not an expression the language accepts. `cause` is the `ParseError`, with `span`, `expected` and `found` for the caret.
 *
 * @fix Show the user the span from `cause` and ask for the expression again; do not retry the same text.
 * @verify cd packages/expr && bun run vitest run src/complex.test.ts src/grammar.test.ts src/json.test.ts
 */
export declare const InvalidExpression: import("@arki/failure").FailureDefinition<"expr.invalid_text", undefined>;
/**
 * The text given to `parse`, `parseEquation` or `evaluate`, or the JSON given to `fromJSON`, went over a length, token, depth, node, step or digit budget. `cause` is the `ExprLimitError`.
 *
 * @fix Reject the input as too large, or raise `options.limits` on purpose.
 * @verify cd packages/expr && bun run vitest run src/complex.test.ts src/hostile.test.ts
 */
export declare const ExpressionOverBudget: import("@arki/failure").FailureDefinition<"expr.over_budget", undefined>;
/**
 * The expression has no value in its domain: `x/0`, `0^i`, `sqrt(-1)` in a real domain, an overflow, or an exact result that needs a rounding mode. `cause` is the `@arki/math` error.
 *
 * @fix Show the user that the expression has no value; read `cause.code` for which rule, or pass a rounding mode for an exact domain.
 * @verify cd packages/expr && bun run vitest run src/complex.test.ts src/rational.test.ts src/decimal.test.ts
 */
export declare const NoValue: import("@arki/failure").FailureDefinition<"expr.no_value", undefined>;
/**
 * `syntaxFor` got a locale tag the runtime's `Intl` rejects.
 *
 * @fix Pass a BCP 47 tag such as `'de-DE'`, or a syntax preset (`canonical`, `decimalComma`).
 * @verify cd packages/expr && bun run vitest run src/language.test.ts
 */
export declare const InvalidLocale: import("@arki/failure").FailureDefinition<"expr.invalid_locale", undefined>;
/**
 * `parseSyntax` got a stored value that is not a syntax: an unknown mark, or a decimal comma with the `,` separator.
 *
 * @fix Store `canonical` or `decimalComma`, or `{ decimal: '.', separator: ',' | ';' }` or `{ decimal: ',', separator: ';' }`.
 * @verify cd packages/expr && bun run vitest run src/language.test.ts
 */
export declare const InvalidSyntax: import("@arki/failure").FailureDefinition<"expr.invalid_syntax", undefined>;
/** What `parse`, `parseEquation` and `fromJSON` return instead of a tree. The one list; {@link ParseFailure} is derived from it. */
export declare const PARSE_FAILURES: readonly [import("@arki/failure").FailureDefinition<"expr.invalid_text", undefined>, import("@arki/failure").FailureDefinition<"expr.over_budget", undefined>];
/** What `evaluate(text)` returns instead of a value: the parse failures, then {@link NoValue}. {@link EvaluateFailure} is derived from it. */
export declare const EVALUATE_FAILURES: readonly [import("@arki/failure").FailureDefinition<"expr.invalid_text", undefined>, import("@arki/failure").FailureDefinition<"expr.over_budget", undefined>, import("@arki/failure").FailureDefinition<"expr.no_value", undefined>];
/** Every failure this package returns. */
export declare const EXPR_FAILURES: readonly [import("@arki/failure").FailureDefinition<"expr.invalid_text", undefined>, import("@arki/failure").FailureDefinition<"expr.over_budget", undefined>, import("@arki/failure").FailureDefinition<"expr.no_value", undefined>, import("@arki/failure").FailureDefinition<"expr.invalid_locale", undefined>, import("@arki/failure").FailureDefinition<"expr.invalid_syntax", undefined>];
/** A failure value returned by `parse`, `parseEquation` and `fromJSON`. */
export type ParseFailure = FailureOf<(typeof PARSE_FAILURES)[number]>;
/** A failure value returned by `evaluate(text)`. */
export type EvaluateFailure = FailureOf<(typeof EVALUATE_FAILURES)[number]>;
/**
 * `parse`, `parseEquation` and `fromJSON` read outside text: a thrown
 * `ParseError` or `ExprLimitError` becomes its returned failure, with the error
 * as `cause`. Anything else (a non-string argument, a language that is not
 * built by `defineLanguage`: a bug) is thrown on.
 */
export declare function parseFailure(error: unknown): import("@arki/failure").Failure<"expr.invalid_text", undefined> | import("@arki/failure").Failure<"expr.over_budget", undefined>;
/**
 * `evaluate` reads outside text: a thrown `ParseError`, `ExprLimitError` or
 * `@arki/math` error becomes its returned failure, with the error as `cause`.
 * Anything else (an aborted signal's reason, a bug) is thrown on.
 */
export declare function evaluationFailure(error: unknown): import("@arki/failure").Failure<"expr.invalid_text", undefined> | import("@arki/failure").Failure<"expr.no_value", undefined> | import("@arki/failure").Failure<"expr.over_budget", undefined>;
/** An input went over one of its budgets. Thrown before the expensive work, never after. */
export declare class ExprLimitError extends ResourceLimitError {
    readonly budget: Budget;
    readonly limit: number;
    /** The size seen when the budget broke; for streaming checks this is `limit + 1`. */
    readonly actual: number;
    constructor(budget: Budget, limit: number, actual: number);
}
//# sourceMappingURL=errors.d.ts.map