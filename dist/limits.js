import { InvalidArgumentError } from '@arki/math/errors';
export const DEFAULT_LIMITS = Object.freeze({ length: 10_000, tokens: 5000, depth: 256, nodes: 5000 });
function positive(name, value, fallback) {
    if (value === undefined)
        return fallback;
    if (!Number.isSafeInteger(value) || value < 1) {
        throw new InvalidArgumentError(`limits.${name} must be a positive integer, got ${String(value)}`);
    }
    return value;
}
export function resolveLimits(limits) {
    if (limits === undefined)
        return DEFAULT_LIMITS;
    return {
        length: positive('length', limits.length, DEFAULT_LIMITS.length),
        tokens: positive('tokens', limits.tokens, DEFAULT_LIMITS.tokens),
        depth: positive('depth', limits.depth, DEFAULT_LIMITS.depth),
        nodes: positive('nodes', limits.nodes, DEFAULT_LIMITS.nodes),
    };
}
export const DEFAULT_STEPS = 10_000_000;
export function resolveCompileLimits(limits) {
    return {
        depth: positive('depth', limits?.depth, DEFAULT_LIMITS.depth),
        steps: positive('steps', limits?.steps, DEFAULT_STEPS),
    };
}
export const DEFAULT_DIGITS = 1000;
export function resolveDigits(limits) {
    return positive('digits', limits?.digits, DEFAULT_DIGITS);
}
//# sourceMappingURL=limits.js.map