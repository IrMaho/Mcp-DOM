export interface PrivacyConfig {
    maskAllInputs: boolean;
    maskInputTypes: string[];
    maskSelectors: string[];
    blockSelectors: string[];
    redactHeaders: string[];
    redactQueryParams: string[];
    maxTextLength: number;
}
export declare const DEFAULT_PRIVACY_CONFIG: PrivacyConfig;
//# sourceMappingURL=privacy.d.ts.map