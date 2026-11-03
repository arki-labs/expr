import type { Equation, Expr, Node } from './ast.js';
import type { Language } from './language.js';
export type LatexOptions = {
    /** Supplies function commands and constant symbols. Default `scientific`. */
    readonly language?: Language;
    /** Bounds the recursion over hand-built trees. Default 256, as in `parse`. */
    readonly limits?: {
        readonly depth?: number;
    };
};
/**
 * LaTeX for an expression, equation or node: `toLatex(parse('sqrt(x)/2'))` is
 * `'\\frac{\\sqrt{x}}{2}'`. Pass the language the expression was parsed with
 * so host functions use their `latex` command.
 */
export declare function toLatex(value: Expr | Equation | Node, options?: LatexOptions): string;
//# sourceMappingURL=latex.d.ts.map