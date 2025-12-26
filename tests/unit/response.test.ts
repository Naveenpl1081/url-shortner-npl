import { describe, it, expect } from '@jest/globals';
import { successResponse, errorResponse, redirectResponse } from '../../src/utils/response';

describe('Response Utils', () => {
  describe('successResponse', () => {
    test('should return success response with default status 200', () => {
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
  });
});