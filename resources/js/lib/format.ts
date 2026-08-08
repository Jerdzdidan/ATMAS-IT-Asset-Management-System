/**
 * Render a stored timestamp as a readable local date and time.
 */
export function formatDateTime(value: string | null | undefined): string {
    if (!value) return '—';

    return new Date(value).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Render a stored calendar date without a time component.
 */
export function formatDate(value: string | null | undefined): string {
    if (!value) return '—';

    return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Render a peso amount, falling back to a dash when the cost was never recorded.
 */
export function formatCurrency(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') return '—';

    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value));
}

/**
 * Produce a `datetime-local` input value for the current moment.
 */
export function currentDateTimeLocal(): string {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;

    return new Date(now.getTime() - offset).toISOString().slice(0, 16);
}
