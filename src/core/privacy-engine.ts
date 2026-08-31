import { PrivacyConfig, DEFAULT_PRIVACY_CONFIG } from '../types/privacy';

export class PrivacyEngine {
  private config: PrivacyConfig;

  constructor(config: Partial<PrivacyConfig> = {}) {
    this.config = { ...DEFAULT_PRIVACY_CONFIG, ...config };
  }

  public shouldBlockNode(element: Element): boolean {
    if (!element || !element.matches) return false;
    for (const selector of this.config.blockSelectors) {
      try {
        if (element.matches(selector) || element.closest(selector)) {
          return true;
        }
      } catch {
        // Invalid selector ignored
      }
    }
    return false;
  }

  public shouldMaskText(element: Element): boolean {
    if (!element || !element.matches) return false;
    for (const selector of this.config.maskSelectors) {
      try {
        if (element.matches(selector) || element.closest(selector)) {
          return true;
        }
      } catch {
        // Invalid selector ignored
      }
    }
    return false;
  }

  public maskValue(value: string, inputType?: string, elementName?: string): string {
    if (!value) return value;

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

  public sanitizeText(text: string, isMasked: boolean = false): string {
    if (!text) return text;
    if (isMasked) {
      return text.replace(/[^\s\n\r\t]/g, '*');
    }
    if (text.length > this.config.maxTextLength) {
      return text.substring(0, this.config.maxTextLength) + '... [TRUNCATED]';
    }
    return text;
  }

  public sanitizeHeaders(headers?: Record<string, string>): Record<string, string> | undefined {
    if (!headers) return undefined;
    const sanitized: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      if (this.config.redactHeaders.some((h) => lowerKey.includes(h))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  public sanitizeUrl(rawUrl: string): string {
    try {
      const url = new URL(rawUrl);
      for (const param of this.config.redactQueryParams) {
        if (url.searchParams.has(param)) {
          url.searchParams.set(param, '[REDACTED]');
        }
      }
      return url.toString();
    } catch {
      return rawUrl;
    }
  }
}
