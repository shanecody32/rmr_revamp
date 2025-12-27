const AUTH_TOKEN_STORAGE_KEY = 'rmr.auth.token';

function isBrowser(): boolean {
    return typeof window !== 'undefined';
}

export function getStoredAuthToken(): string | null {
    if (!isBrowser()) {
        return null;
    }
    return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function setStoredAuthToken(token: string): void {
    if (!isBrowser()) {
        return;
    }
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
}

export function clearStoredAuthToken(): void {
    if (!isBrowser()) {
        return;
    }
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}
