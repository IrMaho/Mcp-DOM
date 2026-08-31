import { PrivacyConfig } from '../types/privacy';
export declare class PrivacyEngine {
    private config;
    constructor(config?: Partial<PrivacyConfig>);
    shouldBlockNode(element: Element): boolean;
    shouldMaskText(element: Element): boolean;
    maskValue(value: string, inputType?: string, elementName?: string): string;
    sanitizeText(text: string, isMasked?: boolean): string;
    sanitizeHeaders(headers?: Record<string, string>): Record<string, string> | undefined;
    sanitizeUrl(rawUrl: string): string;
}
//# sourceMappingURL=privacy-engine.d.ts.map