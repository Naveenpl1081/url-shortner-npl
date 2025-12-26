import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { errorResponse, redirectResponse } from '../utils/response';
import { validateShortId, ValidationError } from '../utils/validator';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME || '';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const shortId = event.pathParameters?.shortId;

  
    try {
      validateShortId(shortId);
    } catch (validationError) {
      if (validationError instanceof ValidationError) {
        return errorResponse(validationError.message, 400);
      }
      throw validationError;
    }

  
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { shortId }
    }));

    if (!result.Item) {
      return errorResponse('URL not found', 404);
    }

  
    if (!result.Item.originalUrl || typeof result.Item.originalUrl !== 'string') {
      console.error('Invalid data in database:', result.Item);
      return errorResponse('Invalid URL data', 500);
    }

   
    return redirectResponse(result.Item.originalUrl);

  } catch (error) {
    console.error('Error redirecting URL:', error);

    
    if (error instanceof Error) {
      if (error.name === 'ResourceNotFoundException') {
        return errorResponse('Database table not found', 503);
      }
      if (error.name === 'ProvisionedThroughputExceededException') {
        return errorResponse('Service temporarily unavailable. Please try again.', 503);
      }
    }

    return errorResponse('Internal server error', 500);
  }
};