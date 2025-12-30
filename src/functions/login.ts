import jwt from "jsonwebtoken";
import { APIGatewayProxyHandler } from "aws-lambda";

const JWT_SECRET = process.env.JWT_SECRET!;

export const handler: APIGatewayProxyHandler = async (event) => {
  const body = JSON.parse(event.body || "{}");
  const { email, password } = body;



  const token = jwt.sign(
    {
      userId: "USER#123",
      email: email,
      role: "user",
    },
    JWT_SECRET,
    {
      expiresIn: "1h",
    }
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      token,
    }),
  };
};
