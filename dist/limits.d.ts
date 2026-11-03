/** Budgets checked while parsing and in `fromJSON` (RFC §11). Each is a positive integer. */
export type Limits = {
    /** Characters of source text, checked before lexing. Default 10 000. */
    readonly length?: number;
    /** Tokens, checked while lexing. Default 5 000. */
    readonly tokens?: number;
    /** Nesting depth of the tree (a leaf is 1), checked while parsing. Also bounds every recursion over the tree. Default 256. */
    readonly depth?: number;
    /** Nodes in the tree, checked while parsing. Default 5 000. */
    readonly nodes?: number;
};
export type ResolvedLimits = {
    readonly length: number;
    readonly tokens: number;
    readonly depth: number;
    readonly nodes: number;
};
export declare const DEFAULT_LIMITS: ResolvedLimits;
export declare function resolveLimits(limits: Limits | undefined): ResolvedLimits;
/** Budgets a domain's `compile` checks (RFC §11). Each is a positive integer. */
export type CompileLimits = {
    /** Bounds the recursion over the tree, as in `parse`. Default 256. */
    readonly depth?: number;
    /**
     * Steps per call, checked statically: one per node plus each host
     * function's extra `cost`, times the number of points for `sample`.
     * Default 10 000 000.
     */
    readonly steps?: number;
};
export type ResolvedCompileLimits = {
    readonly depth: number;
    readonly steps: number;
};
export declare const DEFAULT_STEPS = 10000000;
export declare function resolveCompileLimits(limits: CompileLimits | undefined): ResolvedCompileLimits;
/** The budgets of an exact domain's `compile` (`@arki/expr/decimal`, `@arki/expr/rational`). */
export type ExactLimits = CompileLimits & {
    /**
     * Digits: of each literal, checked at compile, and of a power or factorial
     * result, estimated before computing it (`9^9^9`, `10000!`). Default 1 000.
     */
    readonly digits?: number;
};
export declare const DEFAULT_DIGITS = 1000;
export declare function resolveDigits(limits: ExactLimits | undefined): number;
//# sourceMappingURL=limits.d.ts.map