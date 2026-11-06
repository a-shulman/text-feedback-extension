import {describe, expect, it} from 'vitest';

import {buildYmGoalCall, sanitizeInput} from './utils';

describe('sanitizeInput', () => {
    it('returns empty string for non-string input', () => {
        expect(sanitizeInput(undefined)).toBe('');
        expect(sanitizeInput(42)).toBe('');
        expect(sanitizeInput(null)).toBe('');
        expect(sanitizeInput({})).toBe('');
    });

    it('returns empty string for empty string', () => {
        expect(sanitizeInput('')).toBe('');
    });

    it('passes safe text through unchanged', () => {
        expect(sanitizeInput('hello world')).toBe('hello world');
    });

    it('escapes <', () => {
        expect(sanitizeInput('<')).toBe('&lt;');
    });

    it('escapes >', () => {
        expect(sanitizeInput('>')).toBe('&gt;');
    });

    it('escapes "', () => {
        expect(sanitizeInput('"')).toBe('&quot;');
    });

    it("escapes '", () => {
        expect(sanitizeInput("'")).toBe('&#x27;');
    });

    it('escapes /', () => {
        expect(sanitizeInput('/')).toBe('&#x2F;');
    });

    it('escapes a <script> tag', () => {
        expect(sanitizeInput('<script>alert("xss")</script>')).toBe(
            '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;',
        );
    });

    it('trims surrounding whitespace before escaping', () => {
        expect(sanitizeInput('  a/b \n')).toBe('a&#x2F;b');
    });

    it('makes escaped string longer than the raw input', () => {
        expect(sanitizeInput('/'.repeat(10))).toHaveLength(60);
    });

    it('truncates input longer than 5000 characters', () => {
        expect(sanitizeInput('a'.repeat(6000))).toHaveLength(5000);
    });

    it('does not truncate input of exactly 5000 characters', () => {
        expect(sanitizeInput('a'.repeat(5000))).toHaveLength(5000);
    });
});

describe('buildYmGoalCall', () => {
    it('returns empty string when metrika is undefined', () => {
        expect(buildYmGoalCall(undefined, 'submit')).toBe('');
    });

    it('returns empty string when counterId is 0', () => {
        expect(buildYmGoalCall({counterId: 0}, 'submit')).toBe('');
    });

    it('returns ym call with default button goal', () => {
        expect(buildYmGoalCall({counterId: 12345}, 'button')).toBe(
            "typeof window.ym==='function'&&window.ym(12345,'reachGoal','selection-feedback-button')",
        );
    });

    it('returns ym call with default submit goal', () => {
        expect(buildYmGoalCall({counterId: 12345}, 'submit')).toBe(
            "typeof window.ym==='function'&&window.ym(12345,'reachGoal','selection-submit')",
        );
    });

    it('returns ym call with default cancel goal', () => {
        expect(buildYmGoalCall({counterId: 12345}, 'cancel')).toBe(
            "typeof window.ym==='function'&&window.ym(12345,'reachGoal','selection-cancel')",
        );
    });

    it('returns ym call with a custom goal name when provided', () => {
        expect(buildYmGoalCall({counterId: 12345, goals: {submit: 'my-submit'}}, 'submit')).toBe(
            "typeof window.ym==='function'&&window.ym(12345,'reachGoal','my-submit')",
        );
    });

    it('falls back to the default goal when only another key is customised', () => {
        expect(buildYmGoalCall({counterId: 12345, goals: {cancel: 'my-cancel'}}, 'submit')).toBe(
            "typeof window.ym==='function'&&window.ym(12345,'reachGoal','selection-submit')",
        );
    });
});
