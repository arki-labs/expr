export type Angle = 'rad' | 'deg';
export type Unary = (a: number) => number;
export type Binary = (a: number, b: number) => number;
export type Impl<F> = {
    readonly raw: F;
    readonly checked: F;
};
/** A built-in function: its one-argument and two-argument forms (`log(x)`, `log(x, b)`). */
export type Builtin = {
    readonly unary?: Impl<Unary>;
    readonly binary?: Impl<Binary>;
};
/** `a ^ b`, shared by the operator and `pow`. `0 ^ -1` divides by zero. */
export declare function powChecked(a: number, b: number): number;
export declare const pow: Impl<Binary>;
export declare function trig(angle: Angle): [string, Builtin][];
/** The built-in functions for an angle unit, built on first use (no work at module load). */
export declare function builtins(angle: Angle): ReadonlyMap<string, Builtin>;
/** `pi` and `e` as doubles. `i` is a constant of `scientific` but not of this domain. */
export declare const FLOAT_CONSTANTS: ReadonlyMap<string, number>;
//# sourceMappingURL=float-builtins.d.ts.map