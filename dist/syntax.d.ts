/** A valid syntax. A decimal comma always pairs with the `;` separator, so `f(1,5; 2)` is unambiguous. */
export type Syntax = {
    readonly decimal: '.';
    readonly separator: ',' | ';';
} | {
    readonly decimal: ',';
    readonly separator: ';';
};
/** What `defineSyntax` accepts; it rejects `{ decimal: ',', separator: ',' }`. */
export type SyntaxDefinition = {
    readonly decimal: '.' | ',';
    readonly separator: ',' | ';';
};
/** `.` decimals, `,` between arguments. The default, and the only storage syntax. */
export declare const canonical: Syntax;
/** `,` decimals, `;` between arguments (the spreadsheet convention of de, fr, ro, …). */
export declare const decimalComma: Syntax;
/**
 * Reads a syntax from a stored or untyped value (a user setting, JSON). Returns
 * the frozen syntax, or `InvalidSyntax` for an unknown mark or a decimal comma
 * with a `,` separator.
 */
export declare function parseSyntax(value: unknown): import("@arki/failure").Failure<"expr.invalid_syntax", undefined> | {
    readonly decimal: '.';
    readonly separator: ',' | ';';
} | {
    readonly decimal: ',';
    readonly separator: ';';
};
/**
 * Validates a syntax written in code and returns it frozen. The builder: it
 * throws `InvalidArgumentError` for a decimal comma with a `,` separator, or
 * for an unknown mark from an untyped caller. Stored settings go through
 * {@link parseSyntax}, which returns a failure instead.
 */
export declare function defineSyntax(definition: SyntaxDefinition): Syntax;
/**
 * The preset for a locale: `decimalComma` where the locale writes `1,5`,
 * `canonical` otherwise. Calls `Intl` only when invoked, never at module load.
 * Returns `InvalidLocale` for a tag `Intl` rejects. Reads the mark from
 * `format`, which every runtime has, so React Native's Hermes on iOS (no
 * `formatToParts`) gets the same answer.
 */
export declare function syntaxFor(locale?: string | readonly string[]): import("@arki/failure").Failure<"expr.invalid_locale", undefined> | Syntax;
//# sourceMappingURL=syntax.d.ts.map