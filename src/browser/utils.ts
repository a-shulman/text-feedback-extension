export type FeedbackMetrika = {
    counterId: number;
    goals?: {
        button?: string;
        submit?: string;
        cancel?: string;
    };
};

export type FeedbackOptions = {
    customFormEndpoint?: string;
    metrika?: FeedbackMetrika;
    privacyPolicyUrl?: string;
};

export const DEFAULT_GOALS = {
    button: 'selection-feedback-button',
    submit: 'selection-submit',
    cancel: 'selection-cancel',
} as const;

/**
 * Returns an inline onclick attribute value that calls ym() in the global scope.
 * Using onclick instead of an addEventListener avoids the "class constructors must be
 * invoked with 'new'" error that occurs when ym is called from inside a strict-mode IIFE.
 *
 * Accesses `window.ym` explicitly rather than the bare `ym` identifier: a bare identifier
 * is resolved through the page's global lexical scope first, so if any other script on the
 * page declares a top-level `class ym {}` (e.g. a minified vendor bundle), it silently
 * shadows the real `window.ym` function and calling it throws "Class constructor ym cannot
 * be invoked without 'new'". Property access on `window` bypasses that shadowing. The
 * typeof guard also avoids a "window.ym is not a function" error when Metrika hasn't
 * loaded yet or is blocked (e.g. by an ad blocker).
 */
export function buildYmGoalCall(
    metrika: FeedbackMetrika | undefined,
    key: keyof typeof DEFAULT_GOALS,
): string {
    if (!metrika?.counterId) return '';
    const goal = metrika.goals?.[key] ?? DEFAULT_GOALS[key];
    return `typeof window.ym==='function'&&window.ym(${metrika.counterId},'reachGoal','${goal}')`;
}

export async function sendData<T extends object>(endpoint: string, payload: T): Promise<Response> {
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
    }

    return response;
}

export function sanitizeInput(text: unknown): string {
    if (typeof text !== 'string') return '';

    return text
        .trim()
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
        .substring(0, 5000);
}
