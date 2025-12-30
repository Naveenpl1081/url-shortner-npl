import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const USERS_TABLE = process.env.USERS_TABLE!;

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { email, password } = body;

    if (!email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Email and password are required" }),
      };
    }

    // 1️⃣ Check if email already exists
    const existingUser = await docClient.send(
      new QueryCommand({
        TableName: USERS_TABLE,
        IndexName: "EmailIndex",
        KeyConditionExpression: "email = :email",
        ExpressionAttributeValues: {
          ":email": email,
        },
      })
    );

    if (existingUser.Items && existingUser.Items.length > 0) {
      return {
        statusCode: 409,
        body: JSON.stringify({ message: "Email already registered" }),
      };
    }

    // 2️⃣ Hash password using bcryptjs
    const SALT_ROUNDS = 10;
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const userId = `USER#${uuidv4()}`;

    // 3️⃣ Save user to DynamoDB
    await docClient.send(
      new PutCommand({
        TableName: USERS_TABLE,
        Item: {
          userId,
          email,
          passwordHash,
          role: "user",
          createdAt: new Date().toISOString(),
        },
      })
    );

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "User registered successfully",
      }),
    };
  } catch (error) {
    console.error("REGISTER_ERROR", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};
