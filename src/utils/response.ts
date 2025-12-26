import { APIGatewayProxyResult } from 'aws-lambda';

interface ResponseOptions {
  statusCode: number;
  data?: any;
  error?: string;
  headers?: Record<string, string>;
}

export const formatResponse = (options: ResponseOptions): APIGatewayProxyResult => {
  const { statusCode, data, error, headers = {} } = options;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  };

  const body = error
    ? { success: false, error }
    : { success: true, data };

  return {
    statusCode,
    body: JSON.stringify(body),
    headers: { ...defaultHeaders, ...headers }
  };
};

export const successResponse = (data: any, statusCode: number = 200): APIGatewayProxyResult => {
  return formatResponse({ statusCode, data });
};

export const errorResponse = (error: string, statusCode: number = 500): APIGatewayProxyResult => {
  return formatResponse({ statusCode, error });
};

export const redirectResponse = (location: string): APIGatewayProxyResult => {
  return {
    statusCode: 301,
    body: '',
    headers: {
      'Location': location,
      'Access-Control-Allow-Origin': '*'
    }
  };
};