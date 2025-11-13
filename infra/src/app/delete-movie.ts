import { APIGatewayProxyHandler } from 'aws-lambda';
import { ddb, TABLE_NAME, log } from '../shared/db';
import { DeleteCommand, QueryCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const movieId = event.pathParameters?.movieId;
    if (!movieId) return { statusCode: 400, body: JSON.stringify({ message: 'movieId required' }) };

    const adminCaller = event.requestContext.identity.apiKey ?? 'no-api-key';
    log({ level: 'info', msg: 'DELETE /movies/{id}', adminKeyHash: hash(adminCaller), path: event.path, movieId });

    // Delete the movie item
    await ddb.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { id: `m${movieId}`, sk: 'xxxx' },
    }));

    // Query cascades: cast (c{movieId}/*) and awards (w{movieId}/*)
    const [cast, awards] = await Promise.all([
      ddb.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: '#id = :pk',
        ExpressionAttributeNames: { '#id': 'id' },
        ExpressionAttributeValues: { ':pk': `c${movieId}` },
      })),
      ddb.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: '#id = :pk',
        ExpressionAttributeNames: { '#id': 'id' },
        ExpressionAttributeValues: { ':pk': `w${movieId}` },
      })),
    ]);

    const toDelete = [...(cast.Items ?? []), ...(awards.Items ?? [])];

    // Batch delete in chunks of 25
    for (let i = 0; i < toDelete.length; i += 25) {
      const chunk = toDelete.slice(i, i + 25);
      await ddb.send(new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: chunk.map((it) => ({ DeleteRequest: { Key: { id: it.id, sk: it.sk } } })),
        },
      }));
    }

    return { statusCode: 200, body: JSON.stringify({ message: 'movie deleted', cascaded: toDelete.length }) };
  } catch (err: any) {
    log({ level: 'error', msg: 'delete-movie error', error: err.message });
    return { statusCode: 500, body: JSON.stringify({ message: 'internal error' }) };
  }
};

function hash(s: string) {
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h.toString(16);
}
