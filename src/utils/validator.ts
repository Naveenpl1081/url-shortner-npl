export class ValidationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ValidationError';
    }
  }
  
  export const isValidUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
     
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch (error) {
      return false;
    }
  };
  
  export const validateUrl = (url: string): void => {
    if (!url || typeof url !== 'string') {
      throw new ValidationError('URL is required and must be a string');
    }
  
    if (url.trim().length === 0) {
      throw new ValidationError('URL cannot be empty');
    }
  
    if (url.length > 2048) {
      throw new ValidationError('URL is too long (maximum 2048 characters)');
    }
  
    if (!isValidUrl(url)) {
      throw new ValidationError('Invalid URL format. Must be a valid HTTP or HTTPS URL');
    }
  };
  
  export const sanitizeUrl = (url: string): string => {
    return url.trim();
  };
  
  export const validateShortId = (shortId: string | undefined): void => {
    if (!shortId || typeof shortId !== 'string') {
      throw new ValidationError('Short ID is required');
    }
  
    if (shortId.trim().length === 0) {
      throw new ValidationError('Short ID cannot be empty');
    }
  
   
    const validPattern = /^[A-Za-z0-9_-]{6,12}$/;
    if (!validPattern.test(shortId)) {
      throw new ValidationError('Invalid short ID format');
    }
  };