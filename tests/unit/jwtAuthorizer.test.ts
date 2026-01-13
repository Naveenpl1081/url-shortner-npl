import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import jwt from "jsonwebtoken";
import { APIGatewayTokenAuthorizerEvent } from "aws-lambda";

/**
 * IMPORTANT:
 * Environment variables MUST be set before importing the handler
 */
process.env.JWT_SECRET = "test-secret";

/**
 * Mock jsonwebtoken
 */
jest.mock("jsonwebtoken", () => ({
  verify: jest.fn(),
}));

/**
 * Import handler AFTER env + mocks
 */
import { handler } from "../../src/authorizers/jwtAuthorizer";

describe("JWT Authorizer Lambda", () => {
  const baseEvent: Partial<APIGatewayTokenAuthorizerEvent> = {
    type: "TOKEN",
    methodArn:
      "arn:aws:execute-api:ap-south-1:123456789012:api-id/dev/POST/resource",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should ALLOW request for valid Bearer token", async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      userId: "user123",
    });

    const event: APIGatewayTokenAuthorizerEvent = {
      ...baseEvent,
      authorizationToken: "Bearer valid.jwt.token",
    } as APIGatewayTokenAuthorizerEvent;

    const response = await handler(event);

    expect(jwt.verify).toHaveBeenCalledWith(
      "valid.jwt.token",
      "test-secret"
    );

    const statement = response.policyDocument.Statement[0] as any;

    expect(statement.Effect).toBe("Allow");
    expect(statement.Resource).toBe(event.methodArn);
  });

  it("should DENY request when authorizationToken is missing", async () => {
    const event: APIGatewayTokenAuthorizerEvent = {
      ...baseEvent,
      authorizationToken: undefined as any,
    } as APIGatewayTokenAuthorizerEvent;

    const response = await handler(event);

    const statement = response.policyDocument.Statement[0] as any;

    expect(statement.Effect).toBe("Deny");
  });

  it("should DENY request when token does not start with Bearer", async () => {
    const event: APIGatewayTokenAuthorizerEvent = {
      ...baseEvent,
      authorizationToken: "InvalidToken",
    } as APIGatewayTokenAuthorizerEvent;

    const response = await handler(event);

    expect(jwt.verify).not.toHaveBeenCalled();

    const statement = response.policyDocument.Statement[0] as any;

    expect(statement.Effect).toBe("Deny");
  });

  it("should DENY request when jwt.verify throws Error", async () => {
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error("Invalid token");
    });

    const event: APIGatewayTokenAuthorizerEvent = {
      ...baseEvent,
      authorizationToken: "Bearer invalid.jwt.token",
    } as APIGatewayTokenAuthorizerEvent;

    const response = await handler(event);

    expect(jwt.verify).toHaveBeenCalled();

    const statement = response.policyDocument.Statement[0] as any;

    expect(statement.Effect).toBe("Deny");
  });

  it("should DENY request when jwt.verify throws non-Error", async () => {
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw "string error";
    });

    const event: APIGatewayTokenAuthorizerEvent = {
      ...baseEvent,
      authorizationToken: "Bearer invalid.jwt.token",
    } as APIGatewayTokenAuthorizerEvent;

    const response = await handler(event);

    const statement = response.policyDocument.Statement[0] as any;

    expect(statement.Effect).toBe("Deny");
  });
});
