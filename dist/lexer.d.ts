/**
 * A hand-written, single-pass lexer (RFC §4.1, §15: no regular expressions
 * anywhere on the parse path). Aliases are folded here: `×` and `·` read as
 * `*`, `÷` as `/`, `−` (U+2212) as `-`, `π` as the name `pi`, and `√` becomes
 * the radical token.
 */
import type { Syntax } from './syntax.js';
export type TokenKind = 'number' | 'name' | '+' | '-' | '*' | '/' | '^' | '!' | '(' | ')' | '|' | '=' | 'sep' | 'radical' | 'end';
export type Token = {
    readonly kind: TokenKind;
    readonly start: number;
    readonly end: number;
    /** The canonical value of a `number` (raw text with a `.` mark) or `name` token; the source text otherwise. */
    readonly text: string;
};
export declare const DOT = 46;
export declare const LOWER_E = 101;
export declare const UPPER_E = 69;
/** `letter` of the RFC grammar: A–Z, a–z, `_`, Greek α–ω and Α–Ω. `π` is excluded: it is always the alias for `pi`. */
export declare function isLetter(code: number): boolean;
/** The code point at `index`, or -1 past the end. */
export declare function codeAt(text: string, index: number): number;
export declare function isDigit(code: number): boolean;
/** True when `text` matches `name = letter { letter | digit | "_" }`. */
export declare function isName(text: string): boolean;
/**
 * Scans `number = ( digits [ dot digits ] | dot digits ) [ ( "e" | "E" ) [ "+" | "-" ] digits ]`
 * from `start`. Returns the end offset, or the negated end of a malformed
 * literal (`2.` or `1.2.3`) as `-(end + 1)`. An `e` not followed by digits is
 * left alone, so `2e` lexes as `2` then the name `e`.
 */
export declare function scanNumber(text: string, start: number, dot: number): number;
/** True when `raw` is a whole number literal in canonical (`.`) syntax. */
export declare function isNumberLiteral(raw: string): boolean;
export declare function tokenize(source: string, syntax: Syntax, maxTokens: number): Token[];
//# sourceMappingURL=lexer.d.ts.map