import { APIGatewayProxyHandler } from 'aws-lambda';
import { ddb, TABLE_NAME, log, usernameFrom, pathWithQuery } from '../shared/db';
import { GetCommand } from '@aws-sdk/lib-dynamodb';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const movieId = event.pathParameters?.movieId;
    const actorId = event.pathParameters?.actorId;
    if (!movieId || !actorId) return { statusCode: 400, body: JSON.stringify({ message: 'movieId and actorId required' }) };

    const username = usernameFrom(event);
    console.log(`${username} ${pathWithQuery(event)}`);

    log({ level: 'info', msg: 'GET /movies/{id}/actors/{actorId}', username, path: event.path, movieId, actorId });

    const resp = await ddb.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { id: `c${movieId}`, sk: String(actorId) },
    }));

    if (!resp.Item) return { statusCode: 404, body: JSON.stringify({ message: 'not found' }) };
    return { statusCode: 200, body: JSON.stringify(resp.Item) };
  } catch (err: any) {
    log({ level: 'error', msg: 'get-cast-member error', error: err.message });
    return { statusCode: 500, body: JSON.stringify({ message: 'internal error' }) };
  }
};
