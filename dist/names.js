import { walk } from './ast.js';
import { scientific } from './language.js';
function sorted(set) {
    return [...set].sort();
}
/**
 * The names `expr` uses. Identifiers are reported as typed: `xy` is one
 * variable here even if `compile` later reads it as `x·y`.
 */
export function names(expr, options = {}) {
    const language = options.language ?? scientific;
    const variables = new Set();
    const constants = new Set();
    const functions = new Set();
    const roots = 'root' in expr ? [expr.root] : [expr.left, expr.right];
    for (const root of roots) {
        walk(root, node => {
            if (node.kind === 'call')
                functions.add(node.fn);
            else if (node.kind === 'name') {
                (language.constantSpec(node.name) === undefined ? variables : constants).add(node.name);
            }
        });
    }
    return { variables: sorted(variables), constants: sorted(constants), functions: sorted(functions) };
}
//# sourceMappingURL=names.js.map