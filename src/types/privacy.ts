export interface PrivacyConfig {
  maskAllInputs: boolean;
  maskInputTypes: string[]; // e.g. ['password', 'tel', 'email', 'credit-card', 'ssn']
  maskSelectors: string[]; // CSS selectors whose text content should be asterisk-masked
  blockSelectors: string[]; // CSS selectors whose entire subtree should be omitted from recording
  redactHeaders: string[]; // e.g. ['authorization', 'cookie', 'set-cookie', 'x-api-key']
  redactQueryParams: string[]; // e.g. ['token', 'key', 'auth', 'secret', 'password', 'access_token']
  maxTextLength: number; // truncate excessively large text nodes (e.g. 50,000 chars)
}

export const DEFAULT_PRIVACY_CONFIG: PrivacyConfig = {
  maskAllInputs: false,
  maskInputTypes: ['password', 'hidden', 'tel', 'email'],
  maskSelectors: ['[data-private]', '.private-data', '.sensitive', '[data-testid="sensitive"]'],
  blockSelectors: ['.recording-blocked', '[data-recording-ignore]'],
  redactHeaders: ['authorization', 'cookie', 'set-cookie', 'x-api-key', 'proxy-authorization', 'token'],
  redactQueryParams: ['token', 'key', 'auth', 'secret', 'password', 'access_token', 'apiKey', 'bearer'],
  maxTextLength: 100000,
};
