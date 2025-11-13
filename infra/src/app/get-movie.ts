import { APIGatewayProxyHandler } from 'aws-lambda';
import { ddb, TABLE_NAME, log, usernameFrom, pathWithQuery } from '../shared/db';
import { GetCommand } from '@aws-sdk/lib-dynamodb';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const movieId = event.pathParameters?.movieId;
    if (!movieId) return { statusCode: 400, body: JSON.stringify({ message: 'movieId required' }) };

    const username = usernameFrom(event);
    // plain log line as per spec
    console.log(`${username} ${pathWithQuery(event)}`);

    log({ level: 'info', msg: 'GET /movies/{id}', username, path: event.path, movieId });

    const resp = await ddb.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { id: `m${movieId}`, sk: 'xxxx' },
    }));

    if (!resp.Item) return { statusCode: 404, body: JSON.stringify({ message: 'not found' }) };
    return { statusCode: 200, body: JSON.stringify(resp.Item) };
  } catch (err: any) {
    log({ level: 'error', msg: 'get-movie error', error: err.message, stack: err.stack });
    return { statusCode: 500, body: JSON.stringify({ message: 'internal error' }) };
  }
};
