import { describe, it, expect, beforeEach } from "@jest/globals";
import { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "../../src/functions/redirectUrl";
import { ddbMock, resetMocks, mockDynamoDBError } from "../mocks/aws-sdk.mock";
import { GetCommand } from "@aws-sdk/lib-dynamodb";

beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(() => {
  (console.error as jest.Mock).mockRestore();
});

process.env.TABLE_NAME = "TestTable";

describe("redirectUrl Lambda Function", () => {
  beforeEach(() => {
    resetMocks();
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
      expect(response.headers!["Location"]).toBe("https://example.com"); // Added !
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

    it("should return 400 for invalid shortId format", async () => {
      const event = createEvent("ab"); // Too short
      const response = await handler(event);

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for shortId with invalid characters", async () => {
      const event = createEvent("abc@123");
      const response = await handler(event);

      expect(response.statusCode).toBe(400);
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
        Item: { shortId: "test123" }, // Missing originalUrl
      });

      const event = createEvent("test123");
      const response = await handler(event);

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toContain("Invalid URL data");
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
  });
});
