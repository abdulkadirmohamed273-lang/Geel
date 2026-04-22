/**
 * Lab requests may use `test_name` (current schema) or legacy `tests` (older HTML app).
 * Normalize so all readers show the same string.
 */
export function getRequestedTestsString(labRequest) {
    if (!labRequest) return '';
    const raw = labRequest.test_name != null && String(labRequest.test_name).trim()
        ? labRequest.test_name
        : labRequest.tests;
    if (raw == null) return '';
    const s = String(raw).trim();
    return s;
}

export function hasRequestedTests(labRequest) {
    return Boolean(getRequestedTestsString(labRequest));
}

/** Compare visit ids from DB/queue (string, number, bigint-safe). */
export function visitIdsMatch(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a === 'bigint' || typeof b === 'bigint') {
        return String(a) === String(b);
    }
    const na = Number(a);
    const nb = Number(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb) && na === nb) return true;
    return String(a) === String(b);
}
