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
