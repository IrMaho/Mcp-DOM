import { describe, it, expect } from 'vitest';
import { PrivacyEngine } from '../../src/core/privacy-engine';
describe('PrivacyEngine', () => {
    it('should mask sensitive passwords and token inputs', () => {
        const privacy = new PrivacyEngine();
        const maskedPass = privacy.maskValue('SuperSecret123!', 'password');
        expect(maskedPass).toBe('••••••••');
        const maskedToken = privacy.maskValue('abc_token_xyz', 'text', 'user_token');
        expect(maskedToken).toBe('••••••••');
        const normalText = privacy.maskValue('John Doe', 'text', 'username');
        expect(normalText).toBe('John Doe');
    });
    it('should sanitize sensitive HTTP headers', () => {
        const privacy = new PrivacyEngine();
        const headers = {
            Authorization: 'Bearer secret_token_12345',
            Cookie: 'session_id=abcdef',
            'Content-Type': 'application/json',
        };
        const sanitized = privacy.sanitizeHeaders(headers);
        expect(sanitized['Authorization']).toBe('[REDACTED]');
        expect(sanitized['Cookie']).toBe('[REDACTED]');
        expect(sanitized['Content-Type']).toBe('application/json');
    });
    it('should sanitize query parameters containing secrets', () => {
        const privacy = new PrivacyEngine();
        const rawUrl = 'https://api.example.com/data?token=my_secret_token&user=alex';
        const sanitizedUrl = privacy.sanitizeUrl(rawUrl);
        expect(sanitizedUrl).toContain('token=%5BREDACTED%5D');
        expect(sanitizedUrl).toContain('user=alex');
    });
});
//# sourceMappingURL=privacy-engine.test.js.map