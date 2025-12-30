import jwt from "jsonwebtoken";
import {
  APIGatewayTokenAuthorizerEvent,
  APIGatewayAuthorizerResult,
} from "aws-lambda";

const JWT_SECRET = process.env.JWT_SECRET!;

export const handler = async (
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  try {
    const token = event.authorizationToken;

    if (!token || !token.startsWith("Bearer ")) {
      throw new Error("Invalid token format");
    }

    const jwtToken = token.replace("Bearer ", "");

    const decoded = jwt.verify(jwtToken, JWT_SECRET);

    return generatePolicy("user", "Allow", event.methodArn);
  } catch (err) {
    return generatePolicy("user", "Deny", event.methodArn);
  }
};

function generatePolicy(
  principalId: string,
  effect: "Allow" | "Deny",
  resource: string
): APIGatewayAuthorizerResult {
  return {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    },
  };
}
