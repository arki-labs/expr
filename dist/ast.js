/** The direct children of a node, left to right. */
export function children(node) {
    switch (node.kind) {
        case 'number':
        case 'name': {
            return [];
        }
        case 'unary':
        case 'factorial': {
            return [node.arg];
        }
        case 'binary': {
            return [node.left, node.right];
        }
        case 'call': {
            return [...node.args];
        }
        case 'group': {
            return [node.inner];
        }
    }
}
/**
 * Visits `node` and its descendants in pre-order (parents first, children left
 * to right). Return `false` from `visit` to skip a node's children. Iterative,
 * so it never overflows the stack, whatever the depth.
 */
export function walk(node, visit) {
    const stack = [[node, undefined]];
    for (let item = stack.pop(); item !== undefined; item = stack.pop()) {
        const [current, parent] = item;
        if (visit(current, parent) === false)
            continue;
        const kids = children(current);
        for (let index = kids.length - 1; index >= 0; index--) {
            const kid = kids[index];
            if (kid !== undefined)
                stack.push([kid, current]);
        }
    }
}
//# sourceMappingURL=ast.js.map