export const DEFAULT_PRIVACY_CONFIG = {
    maskAllInputs: false,
    maskInputTypes: ['password', 'hidden', 'tel', 'email'],
    maskSelectors: ['[data-private]', '.private-data', '.sensitive', '[data-testid="sensitive"]'],
    blockSelectors: ['.recording-blocked', '[data-recording-ignore]'],
    redactHeaders: ['authorization', 'cookie', 'set-cookie', 'x-api-key', 'proxy-authorization', 'token'],
    redactQueryParams: ['token', 'key', 'auth', 'secret', 'password', 'access_token', 'apiKey', 'bearer'],
    maxTextLength: 100000,
};
//# sourceMappingURL=privacy.js.map