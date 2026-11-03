/**
 * Printing (RFC §12). The `canonical` style is the storage form: ASCII, an
 * explicit `*` for every product (so `2e` the product prints as `2 * e`, never
 * as the literal-looking `2e`), single spaces around binary operators, `sqrt(…)`
 * for `√`, groups as written and literals as `raw`. The `display` style keeps
 * what the user typed: juxtaposition for implicit products, `·` for explicit
 * ones, `−`, `√` and `π`.
 *
 * Both styles parse back to the same tree apart from spans; the canonical
 * style also normalises the `implicit` flag and the radical notation.
 * Parentheses are added only where a hand-built tree needs them to keep its
 * meaning; trees from `parse` never need them.
 */
import type { Equation, Expr, Node } from './ast.js';
import type { Syntax } from './syntax.js';
export type PrintStyle = 'canonical' | 'display';
export type PrintOptions = {
    /** Decimal mark and argument separator. Default `canonical` (`.` and `,`). */
    readonly syntax?: Syntax;
    /** Default `'canonical'`, the form to store. */
    readonly style?: PrintStyle;
    /** Bounds the recursion over hand-built trees. Default 256, as in `parse`. */
    readonly limits?: {
        readonly depth?: number;
    };
};
/**
 * Prints an expression, equation or node. The default (canonical style and
 * syntax) is the form to store: `parse(print(expr))` gives the same tree back.
 */
export declare function print(value: Expr | Equation | Node, options?: PrintOptions): string;
//# sourceMappingURL=print.d.ts.map