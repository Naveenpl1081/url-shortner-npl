import { describe, it, expect, beforeEach, beforeAll, afterAll, jest } from '@jest/globals';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../src/functions/createUrl';
import { ddbMock, resetMocks, mockDynamoDBSuccess, mockExistingUrl, mockDynamoDBError } from '../mocks/aws-sdk.mock';


jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'test1234'),
}));


beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  (console.error as jest.Mock).mockRestore();
});


process.env.TABLE_NAME = 'TestTable';
process.env.ORIGINAL_URL_INDEX = 'TestIndex';

describe('createUrl Lambda Function', () => {
  beforeEach(() => {
    resetMocks();
    jest.clearAllMocks();
  });

  const createEvent = (body: any): APIGatewayProxyEvent => ({
    body: JSON.stringify(body),
    requestContext: {
      domainName: 'test.execute-api.ap-south-1.amazonaws.com',
      stage: 'test',
    } as any,
  } as APIGatewayProxyEvent);

  describe('Successful URL Creation', () => {
    it('should create new short URL successfully', async () => {
      mockDynamoDBSuccess();

      const event = createEvent({ url: 'https://example.com' });
      const response = await handler(event);

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.shortId).toBe('test1234');
      expect(body.data.originalUrl).toBe('https://example.com');
      expect(body.data.shortUrl).toContain('/short/test1234');
    });

    it('should return existing short URL if URL already exists', async () => {
      mockExistingUrl();

      const event = createEvent({ url: 'https://example.com' });
      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.shortId).toBe('existing123');
      expect(body.data.message).toBe('URL already exists');
    });

    it('should sanitize URL with whitespace', async () => {
      mockDynamoDBSuccess();

      const event = createEvent({ url: '  https://example.com  ' });
      const response = await handler(event);

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.originalUrl).toBe('https://example.com');
    });
  });

  describe('Input Validation', () => {
    it('should return 400 for invalid JSON', async () => {
      const event = {
        body: 'invalid json{',
        requestContext: { domainName: 'test', stage: 'test' },
      } as any;

      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Invalid JSON');
    });

    it('should return 400 for missing URL', async () => {
      const event = createEvent({});
      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('required');
    });

    it('should return 400 for empty URL', async () => {
      const event = createEvent({ url: '' });
      const response = await handler(event);

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for invalid URL format', async () => {
      const event = createEvent({ url: 'not-a-url' });
      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Invalid URL format');
    });

    it('should return 400 for non-HTTP(S) protocol', async () => {
      const event = createEvent({ url: 'ftp://example.com' });
      const response = await handler(event);

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for URL too long', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2050);
      const event = createEvent({ url: longUrl });
      const response = await handler(event);

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Error Handling', () => {
    it('should handle ResourceNotFoundException', async () => {
      mockDynamoDBError('ResourceNotFoundException');

      const event = createEvent({ url: 'https://example.com' });
      const response = await handler(event);

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Database table not found');
    });

    it('should handle ProvisionedThroughputExceededException', async () => {
      mockDynamoDBError('ProvisionedThroughputExceededException');

      const event = createEvent({ url: 'https://example.com' });
      const response = await handler(event);

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('temporarily unavailable');
    });

    it('should handle generic errors', async () => {
      mockDynamoDBError('UnknownError');

      const event = createEvent({ url: 'https://example.com' });
      const response = await handler(event);

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Internal server error');
    });
  });
});