export type FunctionSpec = {
    /** Inclusive bounds on the argument count. */
    readonly arity: readonly [min: number, max: number];
    /** LaTeX command for the function name (e.g. `\\sin`); `undefined` means `\\operatorname{name}`. */
    readonly latex: string | undefined;
    /** Steps one call counts against the `steps` budget (RFC §11). 1 unless the host declared more. */
    readonly cost: number;
};
export type ConstantSpec = {
    readonly latex: string | undefined;
};
export type FunctionDefinition = {
    /** An exact count, or inclusive `[min, max]`. */
    readonly arity: number | readonly [number, number];
    readonly latex?: string;
    /** Steps one call counts against the `steps` budget: a positive integer, default 1. */
    readonly cost?: number;
};
export type ConstantDefinition = {
    readonly latex?: string;
};
type FunctionTable = Readonly<Record<string, FunctionDefinition>>;
type ConstantTable = Readonly<Record<string, ConstantDefinition>>;
export type LanguageDefinition<Functions extends FunctionTable = FunctionTable, Constants extends ConstantTable = ConstantTable, BaseFunction extends string = string, BaseConstant extends string = string> = {
    /** Start from this language. Redefining one of its names is a conflict. */
    readonly extends?: Language<BaseFunction, BaseConstant>;
    readonly functions?: Functions;
    readonly constants?: Constants;
};
/**
 * A language. The type parameters carry its function and constant names, so
 * a domain's `compile` can require an implementation for each host name.
 */
export type Language<FunctionName extends string = string, ConstantName extends string = string> = {
    readonly functionSpec: (name: string) => FunctionSpec | undefined;
    readonly constantSpec: (name: string) => ConstantSpec | undefined;
    /** Registered function names, sorted. */
    readonly functionNames: () => FunctionName[];
    /** Registered constant names, sorted. */
    readonly constantNames: () => ConstantName[];
};
/** The function names a language registers. */
export type FunctionNameOf<L> = L extends Language<infer Name, string> ? Name : never;
/** The constant names a language registers. */
export type ConstantNameOf<L> = L extends Language<string, infer Name> ? Name : never;
/** True when `value` was built by `defineLanguage`. */
export declare function isLanguage(value: unknown): value is Language;
/**
 * Builds a language. Names must match the expression `name` grammar (a
 * letter, then letters, digits or `_`); a name defined twice — as a function
 * and a constant, or again on top of `extends` — throws `InvalidArgumentError`.
 */
export declare function defineLanguage<const Functions extends FunctionTable = Readonly<Record<never, FunctionDefinition>>, const Constants extends ConstantTable = Readonly<Record<never, ConstantDefinition>>, BaseFunction extends string = never, BaseConstant extends string = never>(definition: LanguageDefinition<Functions, Constants, BaseFunction, BaseConstant>): Language<Extract<keyof Functions, string> | BaseFunction, Extract<keyof Constants, string> | BaseConstant>;
/**
 * The built-in language: trigonometric, inverse, hyperbolic and inverse
 * hyperbolic functions (with the `sec csc cot` families), `exp ln log log10
 * log2 sqrt cbrt nthRoot pow abs sign ceil floor round fix factorial gamma mod`,
 * and the constants `pi`, `e` and `i`. `log(x)` is the natural log;
 * `log(x, b)` takes a base.
 */
export declare const scientific: Language<"abs" | "acos" | "acosh" | "acot" | "acoth" | "acsc" | "acsch" | "asec" | "asech" | "asin" | "asinh" | "atan" | "atanh" | "cbrt" | "ceil" | "cos" | "cosh" | "cot" | "coth" | "csc" | "csch" | "exp" | "factorial" | "fix" | "floor" | "gamma" | "ln" | "log" | "log10" | "log2" | "mod" | "nthRoot" | "pow" | "round" | "sec" | "sech" | "sign" | "sin" | "sinh" | "sqrt" | "tan" | "tanh", "e" | "i" | "pi">;
/** The functions of `scientific`; every domain implements them (or rejects them as `not-in-domain`). */
export type ScientificFunction = FunctionNameOf<typeof scientific>;
/** The constants of `scientific`. */
export type ScientificConstant = ConstantNameOf<typeof scientific>;
export {};
//# sourceMappingURL=language.d.ts.map