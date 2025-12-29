
import { describe, it, expect, beforeEach, beforeAll, afterAll, jest } from "@jest/globals";
import { APIGatewayProxyEvent } from "aws-lambda";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { ddbMock, resetMocks, mockDynamoDBError } from "../mocks/aws-sdk.mock";
import * as validator from '../../src/utils/validator';

// Import the handler AFTER mocks are set up
import { handler } from "../../src/functions/redirectUrl";

let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

beforeAll(() => {
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(() => {
  consoleErrorSpy.mockRestore();
});

// Set env var before importing
process.env.TABLE_NAME = "TestTable";

describe("redirectUrl Lambda Function", () => {
  beforeEach(() => {
    resetMocks();
    jest.clearAllMocks();
  });

  const createEvent = (shortId: string): APIGatewayProxyEvent =>
    ({
      pathParameters: { shortId },
    } as any);

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
      expect(response.headers).toBeDefined();
      expect(response.headers!["Location"]).toBe("https://example.com");
      expect(response.body).toBe("");
    });
  });

  describe("Validation", () => {
    it("should return 400 for missing shortId", async () => {
      const event = { pathParameters: {} } as any;
      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain("Short ID is required");
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

    it("should return 400 for shortId with invalid characters", async () => {
      const event = createEvent("abc@123");
      const response = await handler(event);

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for empty shortId", async () => {
      const event = createEvent("");
      const response = await handler(event);

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for whitespace only shortId", async () => {
      const event = createEvent("   ");
      const response = await handler(event);

      expect(response.statusCode).toBe(400);
    });

    it('should handle non-ValidationError and re-throw to outer catch', async () => {
      jest.spyOn(validator, 'validateShortId').mockImplementationOnce(() => {
        throw new Error('Unexpected system error');
      });

      const event = createEvent("test123");
      const response = await handler(event);

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body).error).toContain('Internal server error');
    });
  });

  describe("Not Found", () => {
    it("should return 404 when URL not found", async () => {
      ddbMock.on(GetCommand).resolves({ Item: undefined });

      const event = createEvent("notfound");
      const response = await handler(event);

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toContain("URL not found");
    });

    it("should return 500 for invalid data in database", async () => {
      ddbMock.on(GetCommand).resolves({
        Item: { shortId: "test123" },
      });

      const event = createEvent("test123");
      const response = await handler(event);

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toContain("Invalid URL data");
    });

    it("should return 500 for non-string originalUrl", async () => {
      ddbMock.on(GetCommand).resolves({
        Item: { shortId: "test123", originalUrl: 123 },
      });

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