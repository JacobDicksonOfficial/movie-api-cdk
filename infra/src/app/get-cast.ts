import { APIGatewayProxyHandler } from 'aws-lambda';
import { ddb, TABLE_NAME, log, usernameFrom, pathWithQuery } from '../shared/db';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const movieId = event.pathParameters?.movieId;
    if (!movieId) return { statusCode: 400, body: JSON.stringify({ message: 'movieId required' }) };

    const username = usernameFrom(event);
    console.log(`${username} ${pathWithQuery(event)}`);

    log({ level: 'info', msg: 'GET /movies/{id}/actors', username, path: event.path, movieId });

    const resp = await ddb.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: '#id = :pk',
      ExpressionAttributeNames: { '#id': 'id' },
      ExpressionAttributeValues: { ':pk': `c${movieId}` },
    }));

    return { statusCode: 200, body: JSON.stringify(resp.Items ?? []) };
  } catch (err: any) {
    log({ level: 'error', msg: 'get-cast error', error: err.message });
    return { statusCode: 500, body: JSON.stringify({ message: 'internal error' }) };
  }
};
