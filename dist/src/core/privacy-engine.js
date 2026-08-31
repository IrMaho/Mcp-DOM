import { DEFAULT_PRIVACY_CONFIG } from '../types/privacy';
export class PrivacyEngine {
    config;
    constructor(config = {}) {
        this.config = { ...DEFAULT_PRIVACY_CONFIG, ...config };
    }
    shouldBlockNode(element) {
        if (!element || !element.matches)
            return false;
        for (const selector of this.config.blockSelectors) {
            try {
                if (element.matches(selector) || element.closest(selector)) {
                    return true;
                }
            }
            catch {
                // Invalid selector ignored
            }
        }
        return false;
    }
    shouldMaskText(element) {
        if (!element || !element.matches)
            return false;
        for (const selector of this.config.maskSelectors) {
            try {
                if (element.matches(selector) || element.closest(selector)) {
                    return true;
                }
            }
            catch {
                // Invalid selector ignored
            }
        }
        return false;
    }
    maskValue(value, inputType, elementName) {
        if (!value)
            return value;
        if (this.config.maskAllInputs) {
            return '*'.repeat(Math.min(value.length, 12));
        }
        if (inputType && this.config.maskInputTypes.includes(inputType.toLowerCase())) {
            return '••••••••';
        }
        if (elementName && /(password|token|secret|cvv|credit|auth|ssn)/i.test(elementName)) {
            return '••••••••';
        }
        return value;
    }
    sanitizeText(text, isMasked = false) {
        if (!text)
            return text;
        if (isMasked) {
            return text.replace(/[^\s\n\r\t]/g, '*');
        }
        if (text.length > this.config.maxTextLength) {
            return text.substring(0, this.config.maxTextLength) + '... [TRUNCATED]';
        }
        return text;
    }
    sanitizeHeaders(headers) {
        if (!headers)
            return undefined;
        const sanitized = {};
        for (const [key, value] of Object.entries(headers)) {
            const lowerKey = key.toLowerCase();
            if (this.config.redactHeaders.some((h) => lowerKey.includes(h))) {
                sanitized[key] = '[REDACTED]';
            }
            else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
    sanitizeUrl(rawUrl) {
        try {
            const url = new URL(rawUrl);
            for (const param of this.config.redactQueryParams) {
                if (url.searchParams.has(param)) {
                    url.searchParams.set(param, '[REDACTED]');
                }
            }
            return url.toString();
        }
        catch {
            return rawUrl;
        }
    }
}
//# sourceMappingURL=privacy-engine.js.map