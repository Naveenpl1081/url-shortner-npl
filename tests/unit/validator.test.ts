import { describe, it, expect } from '@jest/globals';
import { validateUrl, sanitizeUrl, validateShortId, ValidationError } from '../../src/utils/validator';

describe('Validator Utils', () => {
  describe('validateUrl', () => {
    it('should validate correct HTTP URL', () => {
      expect(() => validateUrl('http://example.com')).not.toThrow();
    });

    it('should validate correct HTTPS URL', () => {
      expect(() => validateUrl('https://example.com')).not.toThrow();
    });

    it('should throw error for missing URL', () => {
      expect(() => validateUrl('')).toThrow(ValidationError);
      expect(() => validateUrl('')).toThrow('URL is required and must be a string'); // Fixed!
    });

    it('should throw error for non-string URL', () => {
      expect(() => validateUrl(null as any)).toThrow(ValidationError);
      expect(() => validateUrl(undefined as any)).toThrow(ValidationError);
    });

    it('should throw error for invalid URL format', () => {
      expect(() => validateUrl('not-a-url')).toThrow(ValidationError);
      expect(() => validateUrl('not-a-url')).toThrow('Invalid URL format');
    });

    it('should throw error for non-HTTP(S) protocol', () => {
      expect(() => validateUrl('ftp://example.com')).toThrow(ValidationError);
    });

    it('should throw error for URL too long', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2050);
      expect(() => validateUrl(longUrl)).toThrow(ValidationError);
      expect(() => validateUrl(longUrl)).toThrow('too long');
    });
  });

  describe('sanitizeUrl', () => {
    it('should trim whitespace from URL', () => {
      expect(sanitizeUrl('  https://example.com  ')).toBe('https://example.com');
    });

    it('should handle URL without whitespace', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    });
  });

  describe('validateShortId', () => {
    it('should validate correct short ID', () => {
      expect(() => validateShortId('abc123')).not.toThrow();
      expect(() => validateShortId('XyZ-_789')).not.toThrow();
    });

    it('should throw error for missing short ID', () => {
      expect(() => validateShortId(undefined)).toThrow(ValidationError);
      expect(() => validateShortId('')).toThrow(ValidationError);
    });

    it('should throw error for invalid short ID format', () => {
      expect(() => validateShortId('ab')).toThrow(ValidationError); // Too short
      expect(() => validateShortId('a'.repeat(15))).toThrow(ValidationError); // Too long
      expect(() => validateShortId('abc@123')).toThrow(ValidationError); // Invalid chars
    });
  });
});