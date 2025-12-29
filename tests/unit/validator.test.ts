import { describe, it, expect } from '@jest/globals';
import { validateUrl, sanitizeUrl, validateShortId, ValidationError, isValidUrl } from '../../src/utils/validator';

describe('Validator Utils', () => {
  describe('isValidUrl', () => {
    it('should return true for valid HTTP URL', () => {
      expect(isValidUrl('http://example.com')).toBe(true);
    });

    it('should return true for valid HTTPS URL', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
    });

    it('should return false for invalid URL', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
    });

    it('should return false for non-HTTP(S) protocol', () => {
      expect(isValidUrl('ftp://example.com')).toBe(false);
    });
  });

  describe('validateUrl', () => {
    it('should validate correct HTTP URL', () => {
      expect(() => validateUrl('http://example.com')).not.toThrow();
    });

    it('should validate correct HTTPS URL', () => {
      expect(() => validateUrl('https://example.com')).not.toThrow();
    });

    it('should throw error for missing URL', () => {
      expect(() => validateUrl('')).toThrow(ValidationError);
      expect(() => validateUrl('')).toThrow('URL is required and must be a string');
    });

    it('should throw error for non-string URL', () => {
      expect(() => validateUrl(null as any)).toThrow(ValidationError);
      expect(() => validateUrl(undefined as any)).toThrow(ValidationError);
      expect(() => validateUrl(123 as any)).toThrow(ValidationError);
    });

    it('should throw error for whitespace only URL', () => {
      expect(() => validateUrl('   ')).toThrow(ValidationError);
      expect(() => validateUrl('   ')).toThrow('cannot be empty');
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

    it('should throw error for URL exactly at 2049 characters', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2030);
      expect(() => validateUrl(longUrl)).toThrow(ValidationError);
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
      expect(() => validateShortId(null as any)).toThrow(ValidationError);
    });

    it('should throw error for non-string short ID', () => {
      expect(() => validateShortId(123 as any)).toThrow(ValidationError);
    });

    it('should throw error for whitespace only short ID', () => {
      expect(() => validateShortId('   ')).toThrow(ValidationError);
      expect(() => validateShortId('   ')).toThrow('cannot be empty');
    });

    it('should throw error for invalid short ID format', () => {
      expect(() => validateShortId('ab')).toThrow(ValidationError); // Too short
      expect(() => validateShortId('a'.repeat(15))).toThrow(ValidationError); // Too long
      expect(() => validateShortId('abc@123')).toThrow(ValidationError); // Invalid chars
      expect(() => validateShortId('abc 123')).toThrow(ValidationError); // Space
    });
  });

  describe('ValidationError', () => {
    it('should create ValidationError with correct name', () => {
      const error = new ValidationError('Test error');
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Test error');
      expect(error instanceof Error).toBe(true);
    });
  });
});