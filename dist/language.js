/**
 * Languages (RFC §9): the whitelist of callable functions and named constants.
 * Nothing is callable unless the language passed to `parse` registers it. A
 * language holds only names, arities and LaTeX command names, never numeric
 * code; each domain's `compile` supplies the implementations.
 *
 * Tables live in private `Map`s behind frozen lookup functions, so a name like
 * `constructor`, `__proto__` or `toString` is just a name that is not there.
 */
import { InvalidArgumentError } from '@arki/math/errors';
import { isName } from './lexer.js';
const languages = new WeakSet();
/** True when `value` was built by `defineLanguage`. */
export function isLanguage(value) {
    return typeof value === 'object' && value !== null && languages.has(value);
}
/** Narrows a key from `Object.keys(table)` to the table's own key type; a real check, not a cast. */
function isOwnKey(table, key) {
    return Object.hasOwn(table, key);
}
function isCount(count) {
    return typeof count === 'number' && Number.isSafeInteger(count) && count >= 0;
}
function arityOf(name, arity) {
    if (isCount(arity))
        return Object.freeze([arity, arity]);
    if (Array.isArray(arity) && arity.length === 2) {
        const [min, max] = arity;
        if (isCount(min) && isCount(max) && min <= max)
            return Object.freeze([min, max]);
    }
    throw new InvalidArgumentError(`Function "${name}": arity must be a non-negative integer or [min, max] with min <= max`);
}
function latexOf(name, definition) {
    if (typeof definition !== 'object' || definition === null) {
        throw new InvalidArgumentError(`"${name}": the definition must be an object`);
    }
    const latex = 'latex' in definition ? definition.latex : undefined;
    if (latex !== undefined && typeof latex !== 'string') {
        throw new InvalidArgumentError(`"${name}": latex must be a string`);
    }
    return latex;
}
function functionSpecOf(name, entry) {
    const latex = latexOf(name, entry);
    const has = (key) => typeof entry === 'object' && entry !== null && key in entry ? Reflect.get(entry, key) : undefined;
    const arity = arityOf(name, has('arity'));
    const cost = has('cost') ?? 1;
    if (typeof cost !== 'number' || !Number.isSafeInteger(cost) || cost < 1) {
        throw new InvalidArgumentError(`Function "${name}": cost must be a positive integer`);
    }
    return Object.freeze({ arity, latex, cost });
}
/**
 * Builds a language. Names must match the expression `name` grammar (a
 * letter, then letters, digits or `_`); a name defined twice — as a function
 * and a constant, or again on top of `extends` — throws `InvalidArgumentError`.
 */
export function defineLanguage(definition) {
    const functions = new Map();
    const constants = new Map();
    const functionNames = [];
    const constantNames = [];
    const base = definition.extends;
    if (base !== undefined) {
        if (!isLanguage(base))
            throw new InvalidArgumentError('extends must be a language built by defineLanguage');
        for (const name of base.functionNames()) {
            const spec = base.functionSpec(name);
            if (spec !== undefined)
                functions.set(name, spec);
            functionNames.push(name);
        }
        for (const name of base.constantNames()) {
            const spec = base.constantSpec(name);
            if (spec !== undefined)
                constants.set(name, spec);
            constantNames.push(name);
        }
    }
    const claim = (name) => {
        if (!isName(name)) {
            throw new InvalidArgumentError(`"${name}" is not a valid name: use a letter, then letters, digits or _`);
        }
        if (functions.has(name) || constants.has(name)) {
            throw new InvalidArgumentError(`Name conflict: "${name}" is already defined in this language`);
        }
    };
    const functionTable = definition.functions;
    if (functionTable !== undefined) {
        for (const name of Object.keys(functionTable)) {
            if (!isOwnKey(functionTable, name))
                continue;
            claim(name);
            functions.set(name, functionSpecOf(name, functionTable[name]));
            functionNames.push(name);
        }
    }
    const constantTable = definition.constants;
    if (constantTable !== undefined) {
        for (const name of Object.keys(constantTable)) {
            if (!isOwnKey(constantTable, name))
                continue;
            claim(name);
            constants.set(name, Object.freeze({ latex: latexOf(name, constantTable[name]) }));
            constantNames.push(name);
        }
    }
    functionNames.sort();
    constantNames.sort();
    const language = Object.freeze({
        functionSpec: (name) => functions.get(name),
        constantSpec: (name) => constants.get(name),
        functionNames: () => [...functionNames],
        constantNames: () => [...constantNames],
    });
    languages.add(language);
    return language;
}
const unary = (latex) => (latex === undefined ? { arity: 1 } : { arity: 1, latex });
/**
 * The built-in language: trigonometric, inverse, hyperbolic and inverse
 * hyperbolic functions (with the `sec csc cot` families), `exp ln log log10
 * log2 sqrt cbrt nthRoot pow abs sign ceil floor round fix factorial gamma mod`,
 * and the constants `pi`, `e` and `i`. `log(x)` is the natural log;
 * `log(x, b)` takes a base.
 */
export const scientific = defineLanguage({
    functions: {
        sin: unary('\\sin'),
        cos: unary('\\cos'),
        tan: unary('\\tan'),
        sec: unary('\\sec'),
        csc: unary('\\csc'),
        cot: unary('\\cot'),
        asin: unary('\\arcsin'),
        acos: unary('\\arccos'),
        atan: unary('\\arctan'),
        asec: unary(),
        acsc: unary(),
        acot: unary(),
        sinh: unary('\\sinh'),
        cosh: unary('\\cosh'),
        tanh: unary('\\tanh'),
        sech: unary(),
        csch: unary(),
        coth: unary('\\coth'),
        asinh: unary(),
        acosh: unary(),
        atanh: unary(),
        asech: unary(),
        acsch: unary(),
        acoth: unary(),
        exp: unary('\\exp'),
        ln: unary('\\ln'),
        log: { arity: [1, 2], latex: '\\log' },
        log10: unary('\\log_{10}'),
        log2: unary('\\log_{2}'),
        sqrt: unary('\\sqrt'),
        cbrt: unary(),
        nthRoot: { arity: [1, 2] },
        pow: { arity: 2 },
        abs: unary(),
        sign: unary('\\operatorname{sgn}'),
        ceil: unary(),
        floor: unary(),
        round: unary(),
        fix: unary(),
        factorial: unary(),
        gamma: unary('\\Gamma'),
        mod: { arity: 2 },
    },
    constants: {
        pi: { latex: '\\pi' },
        e: { latex: 'e' },
        i: { latex: 'i' },
    },
});
//# sourceMappingURL=language.js.map