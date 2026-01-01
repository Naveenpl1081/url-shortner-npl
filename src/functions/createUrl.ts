import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import 'nanoid';
import { sanitizeUrl, validateUrl, ValidationError } from '../utils/validator.ts';
import { errorResponse, successResponse } from '../utils/response.ts';
import { nanoid } from 'nanoid';


const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME || '';
const ORIGINAL_URL_INDEX = process.env.ORIGINAL_URL_INDEX || '';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
  
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (parseError) {
      return errorResponse('Invalid JSON in request body', 400);
    }

    const rawUrl = body.url;


    try {
      validateUrl(rawUrl);
    } catch (validationError) {
      if (validationError instanceof ValidationError) {
        return errorResponse(validationError.message, 400);
      }
      throw validationError;
    }

    const originalUrl = sanitizeUrl(rawUrl);

  
    const existingUrl = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: ORIGINAL_URL_INDEX,
      KeyConditionExpression: 'originalUrl = :url',
      ExpressionAttributeValues: {
        ':url': originalUrl
      },
      Limit: 1
    }));

  
    if (existingUrl.Items && existingUrl.Items.length > 0) {
      const item = existingUrl.Items[0];
      const baseUrl = `https://${event.requestContext.domainName}/${event.requestContext.stage}`;
      
      return successResponse({
        shortUrl: `${baseUrl}/short/${item.shortId}`,
        shortId: item.shortId,
        originalUrl: item.originalUrl,
        message: 'URL already exists',
        createdAt: item.createdAt
      });
    }

 
    const shortId = nanoid(8);
    const createdAt = new Date().toISOString();
    const baseUrl = `https://${event.requestContext.domainName}/${event.requestContext.stage}`;
    const shortUrl = `${baseUrl}/short/${shortId}`;

   
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        shortId,
        originalUrl,
        createdAt
      }
    }));

    return successResponse({
      shortUrl,
      shortId,
      originalUrl,
      createdAt
    }, 201);

  } catch (error) {
    console.error('Error creating short URL:', error);

    
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