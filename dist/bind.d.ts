import type { BinaryNode, NameNode, Node, Warning } from './ast.js';
import type { Span } from './errors.js';
/** A multi-letter name that `compile` read as a product of single letters. */
export type Reading = {
    readonly span: Span;
    /** The name as typed, e.g. `'xy'`. */
    readonly name: string;
    /** The letters it was read as, e.g. `['x', 'y']`. */
    readonly letters: readonly string[];
};
export type Part = {
    readonly kind: 'variable';
    readonly name: string;
    readonly slot: number;
} | {
    readonly kind: 'constant';
    readonly name: string;
};
export type Resolution = Part | {
    readonly kind: 'split';
    readonly parts: readonly Part[];
};
export type BinderOptions = {
    readonly variables: readonly string[];
    readonly isConstant: (name: string) => boolean;
    readonly isFunction: (name: string) => boolean;
    /**
     * A constant of the language that this domain has no value for (`i` in
     * float). It still resolves as a constant, so a use reports `not-in-domain`,
     * but a host may declare it as a variable: the name is free here.
     */
    readonly isOutsideDomain: (name: string) => boolean;
    /** The trees being compiled, to point a `name-conflict` at a use of the name. */
    readonly roots: readonly Node[];
    readonly source: string;
};
export declare class Binder {
    readonly readings: Reading[];
    readonly warnings: Warning[];
    private readonly slots;
    private readonly isConstant;
    private readonly isFunction;
    private readonly source;
    constructor(options: BinderOptions);
    /** Slots in declaration order: the variable at index `i` lives in slot `i`. */
    get slotCount(): number;
    private isValue;
    private part;
    /** The letters `name` splits into, or `undefined` when it resolves exactly or cannot split. */
    private split;
    resolve(node: NameNode): Resolution;
    /**
     * `a/bc` with `bc` split reads as `a/(b·c)`, while `a/b c` reads as
     * `(a/b)·c`: flag the split so a UI can show the reading.
     */
    checkDivision(node: BinaryNode): void;
}
//# sourceMappingURL=bind.d.ts.map