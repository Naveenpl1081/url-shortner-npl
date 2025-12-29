import { describe, it, expect } from '@jest/globals';
import { successResponse, errorResponse, redirectResponse, formatResponse } from '../../src/utils/response';

describe('Response Utils', () => {
  describe('formatResponse', () => {
    it('should format response with data', () => {
      const response = formatResponse({
        statusCode: 200,
        data: { message: 'Success' }
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        success: true,
        data: { message: 'Success' }
      });
      expect(response.headers).toBeDefined();
      expect(response.headers!['Content-Type']).toBe('application/json');
    });

    it('should format response with error', () => {
      const response = formatResponse({
        statusCode: 404,
        error: 'Not found'
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body)).toEqual({
        success: false,
        error: 'Not found'
      });
    });

    it('should merge custom headers with default headers', () => {
      const response = formatResponse({
        statusCode: 200,
        data: { test: 'data' },
        headers: { 'X-Custom-Header': 'custom-value' }
      });

      expect(response.headers!['Content-Type']).toBe('application/json');
      expect(response.headers!['X-Custom-Header']).toBe('custom-value');
      expect(response.headers!['Access-Control-Allow-Origin']).toBe('*');
    });

    it('should override default headers with custom headers', () => {
      const response = formatResponse({
        statusCode: 200,
        data: { test: 'data' },
        headers: { 'Content-Type': 'text/plain' }
      });

      expect(response.headers!['Content-Type']).toBe('text/plain');
    });
  });

  describe('successResponse', () => {
    it('should return success response with default status 200', () => {
      const data = { message: 'Success' };
      const response = successResponse(data);

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        success: true,
        data,
      });
      expect(response.headers).toBeDefined();
      expect(response.headers!['Content-Type']).toBe('application/json');
      expect(response.headers!['Access-Control-Allow-Origin']).toBe('*');
    });

    it('should return success response with custom status code', () => {
      const data = { id: '123' };
      const response = successResponse(data, 201);

      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.body)).toEqual({
        success: true,
        data,
      });
    });

    it('should include all CORS headers', () => {
      const response = successResponse({ test: 'data' });

      expect(response.headers!['Access-Control-Allow-Origin']).toBe('*');
      expect(response.headers!['Access-Control-Allow-Headers']).toBe('Content-Type');
      expect(response.headers!['Access-Control-Allow-Methods']).toBe('GET,POST,OPTIONS');
    });
  });

  describe('errorResponse', () => {
    it('should return error response with default status 500', () => {
      const error = 'Something went wrong';
      const response = errorResponse(error);

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body)).toEqual({
        success: false,
        error,
      });
    });

    it('should return error response with custom status code', () => {
      const error = 'Not found';
      const response = errorResponse(error, 404);

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body)).toEqual({
        success: false,
        error,
      });
    });

    it('should include all CORS headers', () => {
      const response = errorResponse('Error message');

      expect(response.headers!['Access-Control-Allow-Origin']).toBe('*');
      expect(response.headers!['Access-Control-Allow-Headers']).toBe('Content-Type');
      expect(response.headers!['Access-Control-Allow-Methods']).toBe('GET,POST,OPTIONS');
    });
  });

  describe('redirectResponse', () => {
    it('should return redirect response with 301 status', () => {
      const url = 'https://example.com';
      const response = redirectResponse(url);

      expect(response.statusCode).toBe(301);
      expect(response.body).toBe('');
      expect(response.headers).toBeDefined();
      expect(response.headers!['Location']).toBe(url);
      expect(response.headers!['Access-Control-Allow-Origin']).toBe('*');
    });

    it('should redirect to different URLs', () => {
      const url = 'https://different-domain.com/path';
      const response = redirectResponse(url);

      expect(response.statusCode).toBe(301);
      expect(response.headers!['Location']).toBe(url);
    });
  });
});