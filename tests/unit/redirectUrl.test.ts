import { describe, it, expect, beforeEach, beforeAll, afterAll, jest } from "@jest/globals";
import { APIGatewayProxyEvent } from "aws-lambda";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { ddbMock, resetMocks, mockDynamoDBError } from "../mocks/aws-sdk.mock";
import * as validator from '../../src/utils/validator';

// Import the handler
import { handler } from "../../src/functions/redirectUrl";

let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

beforeAll(() => {
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(() => {
  consoleErrorSpy.mockRestore();
});

describe("redirectUrl Lambda Function", () => {
  // Store the original env to restore it after tests
  const originalEnv = process.env;

  beforeEach(() => {
    resetMocks();
    jest.clearAllMocks();
    // Reset process.env to original state before each test
    process.env = { ...originalEnv };
    process.env.TABLE_NAME = "TestTable";
  });

  const createEvent = (shortId: string): APIGatewayProxyEvent =>
    ({
      pathParameters: { shortId },
    } as any);

  /**
   * NEW TEST CASE: This covers lines 18-19 (Environment Variable check)
   * This is what was missing to hit 100%
   */
  describe("Configuration", () => {
    it("should throw error if TABLE_NAME is missing", async () => {
      delete process.env.TABLE_NAME;
      
      const event = createEvent("test123");
      const response = await handler(event);

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body).error).toContain("Internal server error");
      expect(consoleErrorSpy).toHaveBeenCalledWith("TABLE_NAME is not defined");
    });
  });

  describe("Successful Redirect", () => {
    it("should redirect to original URL", async () => {
      ddbMock.on(GetCommand).resolves({
        Item: {
          shortId: "test123",
          originalUrl: "https://example.com",
        },
      });

      const event = createEvent("test123");
      const response = await handler(event);

      expect(response.statusCode).toBe(301);
      expect(response.headers!["Location"]).toBe("https://example.com");
    });
  });

  describe("Validation", () => {
    it("should return 400 for missing shortId", async () => {
      const event = { pathParameters: {} } as any;
      const response = await handler(event);
      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for undefined pathParameters", async () => {
      const event = {} as any;
      const response = await handler(event);
      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid shortId format", async () => {
      const event = createEvent("ab");
      const response = await handler(event);
      expect(response.statusCode).toBe(400);
    });

    it("should handle non-ValidationError and re-throw to outer catch", async () => {
      jest.spyOn(validator, 'validateShortId').mockImplementationOnce(() => {
        throw new Error('Unexpected system error');
      });

      const event = createEvent("test123");
      const response = await handler(event);
      expect(response.statusCode).toBe(500);
    });
  });

  describe("Not Found", () => {
    it("should return 404 when URL not found", async () => {
      ddbMock.on(GetCommand).resolves({ Item: undefined });
      const event = createEvent("notfound");
      const response = await handler(event);
      expect(response.statusCode).toBe(404);
    });

    it("should return 500 for invalid data in database", async () => {
      ddbMock.on(GetCommand).resolves({ Item: { shortId: "test123" } });
      const event = createEvent("test123");
      const response = await handler(event);
      expect(response.statusCode).toBe(500);
    });
  });

  describe("Error Handling", () => {
    it("should handle ResourceNotFoundException", async () => {
      mockDynamoDBError("ResourceNotFoundException");
      const event = createEvent("test123");
      const response = await handler(event);
      expect(response.statusCode).toBe(503);
    });

    it("should handle ProvisionedThroughputExceededException", async () => {
      mockDynamoDBError("ProvisionedThroughputExceededException");
      const event = createEvent("test123");
      const response = await handler(event);
      expect(response.statusCode).toBe(503);
    });

    it("should handle generic errors", async () => {
      mockDynamoDBError("UnknownError");
      const event = createEvent("test123");
      const response = await handler(event);
      expect(response.statusCode).toBe(500);
    });

    it('should handle non-Error exceptions', async () => {
      ddbMock.on(GetCommand).rejects('String error');
      const event = createEvent("test123");
      const response = await handler(event);
      expect(response.statusCode).toBe(500);
    });
  });
});