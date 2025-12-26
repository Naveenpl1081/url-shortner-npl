import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';


export const ddbMock = mockClient(DynamoDBDocumentClient);


export const resetMocks = () => {
  ddbMock.reset();
};


export const mockDynamoDBSuccess = () => {
  ddbMock.on(PutCommand).resolves({});
  ddbMock.on(GetCommand).resolves({
    Item: {
      shortId: 'test123',
      originalUrl: 'https://example.com',
      createdAt: '2024-12-26T10:00:00.000Z',
    },
  });
  ddbMock.on(QueryCommand).resolves({
    Items: [],
  });
};


export const mockExistingUrl = () => {
  ddbMock.on(QueryCommand).resolves({
    Items: [
      {
        shortId: 'existing123',
        originalUrl: 'https://example.com',
        createdAt: '2024-12-25T10:00:00.000Z',
      },
    ],
  });
};


export const mockDynamoDBError = (errorName: string) => {
  const error = new Error('DynamoDB error');
  error.name = errorName;
  ddbMock.on(PutCommand).rejects(error);
  ddbMock.on(GetCommand).rejects(error);
  ddbMock.on(QueryCommand).rejects(error);
};