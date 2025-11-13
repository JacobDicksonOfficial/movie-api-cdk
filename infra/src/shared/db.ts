import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
export const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true, convertClassInstanceToMap: true },
  unmarshallOptions: { wrapNumbers: false },
});

export const TABLE_NAME = process.env.TABLE_NAME as string;

// Small helper for structured logs
export const log = (e: any) => console.log(JSON.stringify(e));

export const usernameFrom = (event: any): string =>
  (event?.requestContext?.authorizer as any)?.claims?.['cognito:username']
  || (event?.requestContext?.authorizer as any)?.claims?.email
  || 'anonymous';

export const pathWithQuery = (event: any): string => {
  const path = event?.path || '';
  const q = event?.queryStringParameters || null;
  if (!q) return path;
  const parts = Object.keys(q)
    .filter((k) => q[k] !== undefined && q[k] !== null && q[k] !== '')
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(q[k])}`);
  return parts.length ? `${path}?${parts.join('&')}` : path;
};

