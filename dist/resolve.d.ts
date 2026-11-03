/**
 * Name resolution shared by `parse` and the domain compilers (RFC §4.3
 * "Multi-letter names"). The AST keeps every identifier as typed; only the
 * reader that knows the declared variables decides how to read it.
 */
/**
 * Rule 2 of the multi-letter reading: the single letters of `name` when it has
 * more than one and every letter is a declared variable or constant (`xy` →
 * `['x', 'y']`), otherwise `undefined`. `xpi` never splits, because `pi` is not
 * a single letter. Rule 1 (an exact declared name wins) is the caller's check.
 */
export declare function splitLetters(name: string, isValue: (letter: string) => boolean): string[] | undefined;
//# sourceMappingURL=resolve.d.ts.map