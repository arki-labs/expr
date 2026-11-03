/**
 * Free-name analysis (C-23): which names an expression uses, sorted and
 * de-duplicated. Replaces hand-kept "known function" filters at call sites.
 */
import type { Equation, Expr } from './ast.js';
import type { Language } from './language.js';
export type Names = {
    /** Names that are not constants of the language: what `compile` must be told about. */
    readonly variables: string[];
    /** Constants of the language that appear (`pi`, `e`, …). */
    readonly constants: string[];
    /** Functions called, including `abs` for `|x|` and `sqrt` for `√x`. */
    readonly functions: string[];
};
/**
 * The names `expr` uses. Identifiers are reported as typed: `xy` is one
 * variable here even if `compile` later reads it as `x·y`.
 */
export declare function names(expr: Expr | Equation, options?: {
    readonly language?: Language;
}): Names;
//# sourceMappingURL=names.d.ts.map