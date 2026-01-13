import { describe, it, expect, beforeEach, beforeAll, afterAll, jest } from "@jest/globals";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddbMock, resetMocks } from "../mocks/aws-sdk.mock";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// 1. SET ENVIRONMENT VARIABLES FIRST
const TEST_JWT_SECRET = "test-secret";
process.env.USERS_TABLE = "UsersTable";
process.env.JWT_SECRET = TEST_JWT_SECRET;

// 2. MOCK LIBRARIES
jest.mock("bcryptjs");
jest.mock("jsonwebtoken");

// 3. NOW IMPORT THE HANDLER
import { handler } from "../../src/functions/login";

describe("login Lambda Function", () => {
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

  beforeAll(() => {
    // Suppress console.error to keep the test output clean
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  beforeEach(() => {
    resetMocks();
    jest.clearAllMocks();
  });

  const createEvent = (body: object | null) => ({
    body: body ? JSON.stringify(body) : null,
  } as any);

  describe("Validation", () => {
    it("should return 400 if email or password is missing", async () => {
      const event = createEvent({ email: "test@example.com" }); 
      const response = await (handler as any)(event, {} as any);
      
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).message).toBe("Email and password are required");
    });

    it("should return 400 if body is empty", async () => {
      const event = createEvent(null);
      const response = await (handler as any)(event, {} as any);
      
      expect(response.statusCode).toBe(400);
    });
  });

  describe("Authentication Logic", () => {
    it("should return 401 if user is not found in DynamoDB", async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] });

      const event = createEvent({ email: "wrong@example.com", password: "password123" });
      const response = await (handler as any)(event, {} as any);

      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.body).message).toBe("Invalid credentials");
    });

    it("should return 401 if password does not match", async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [{ userId: "123", email: "user@test.com", passwordHash: "hashed_pass" }]
      });
      
      jest.mocked(bcrypt.compare).mockImplementation(() => Promise.resolve(false));

      const event = createEvent({ email: "user@test.com", password: "wrong_password" });
      const response = await (handler as any)(event, {} as any);

      expect(response.statusCode).toBe(401);
    });

    it("should return 200 and a token on successful login", async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [{ 
          userId: "123", 
          email: "user@test.com", 
          passwordHash: "hashed_pass", 
          role: "admin" 
        }]
      });
      
      jest.mocked(bcrypt.compare).mockImplementation(() => Promise.resolve(true));
      jest.mocked(jwt.sign).mockImplementation(() => "mock-jwt-token" as any);

      const event = createEvent({ email: "user@test.com", password: "correct_password" });
      const response = await (handler as any)(event, {} as any);

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).token).toBe("mock-jwt-token");
      
      // Verify JWT was signed with the correct data
      expect(jwt.sign).toHaveBeenCalledWith(
        {
          userId: "123",
          email: "user@test.com",
          role: "admin"
        },
        TEST_JWT_SECRET,
        { expiresIn: "1h" }
      );
    });
  });

  describe("Global Error Handling", () => {
    it("should return 500 if an unexpected error occurs (Catch block)", async () => {
      ddbMock.on(QueryCommand).rejects(new Error("DB Connection Failed"));

      const event = createEvent({ email: "test@test.com", password: "password" });
      const response = await (handler as any)(event, {} as any);

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body).message).toBe("Internal server error");
    });
  });
});