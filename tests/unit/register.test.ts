import { describe, it, expect, beforeEach, beforeAll, afterAll, jest } from "@jest/globals";
import { QueryCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddbMock, resetMocks } from "../mocks/aws-sdk.mock";
import bcrypt from "bcryptjs";

// 1. SET ENVIRONMENT VARIABLES BEFORE IMPORTING HANDLER
process.env.USERS_TABLE = "UsersTable";

// 2. MOCK LIBRARIES
jest.mock("bcryptjs");

// Specialized Mock for uuid to avoid ESM syntax errors
const mockUuid = "1234-5678-9012";
jest.mock("uuid", () => ({
  v4: () => "1234-5678-9012"
}));

// 3. NOW IMPORT THE HANDLER
import { handler } from "../../src/functions/register";

describe("register Lambda Function", () => {
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

  beforeAll(() => {
    // Suppress console.error for clean logs in CI/CD
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
      const event = createEvent({ email: "newuser@test.com" });
      const response = await (handler as any)(event, {} as any);
      
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).message).toBe("Email and password are required");
    });

    it("should return 400 if body is completely empty", async () => {
      const event = createEvent(null);
      const response = await (handler as any)(event, {} as any);
      
      expect(response.statusCode).toBe(400);
    });
  });

  describe("Registration Logic", () => {
    it("should return 409 if email is already registered", async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [{ userId: "existing-id", email: "taken@test.com" }]
      });

      const event = createEvent({ email: "taken@test.com", password: "password123" });
      const response = await (handler as any)(event, {} as any);

      expect(response.statusCode).toBe(409);
      expect(JSON.parse(response.body).message).toBe("Email already registered");
    });

    it("should return 201 and save user on successful registration", async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] });
      ddbMock.on(PutCommand).resolves({});
      
      // Use mockImplementation to handle bcrypt hashing
      jest.mocked(bcrypt.hash).mockImplementation(() => Promise.resolve("mocked_hash") as any);

      const event = createEvent({ email: "new@test.com", password: "securePassword" });
      const response = await (handler as any)(event, {} as any);

      expect(response.statusCode).toBe(201);

      const putCalls = ddbMock.commandCalls(PutCommand);
      expect(putCalls.length).toBe(1);
      
      // Use "!" because we checked the length above
      const savedItem = putCalls[0].args[0].input.Item!; 
      
      expect(savedItem).toMatchObject({
        userId: `USER#${mockUuid}`,
        email: "new@test.com",
        passwordHash: "mocked_hash",
        role: "user"
      });
      expect(savedItem.createdAt).toBeDefined();
    });
  });

  describe("Global Error Handling", () => {
    it("should return 500 if DynamoDB fails (Catch block)", async () => {
      ddbMock.on(QueryCommand).rejects(new Error("Query failed"));

      const event = createEvent({ email: "test@test.com", password: "password" });
      const response = await (handler as any)(event, {} as any);

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body).message).toBe("Internal server error");
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});