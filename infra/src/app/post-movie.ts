import { APIGatewayProxyHandler } from 'aws-lambda';
import { ddb, TABLE_NAME, log } from '../shared/db';
import { PutCommand } from '@aws-sdk/lib-dynamodb';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { movieId, title, releaseDate, overview } = body;
    if (!movieId || !title) {
      return { statusCode: 400, body: JSON.stringify({ message: 'movieId and title required' }) };
    }

    const adminCaller = event.requestContext.identity.apiKey ?? 'no-api-key';
    log({ level: 'info', msg: 'POST /movies', adminKeyHash: hash(adminCaller), path: event.path, movieId });

    await ddb.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        id: `m${movieId}`,
        sk: 'xxxx',
        title,
        releaseDate,
        overview,
        createdAt: new Date().toISOString(),
      },
      ConditionExpression: 'attribute_not_exists(id)', // prevent overwrite
    }));

    return { statusCode: 201, body: JSON.stringify({ message: 'movie created', id: movieId }) };
  } catch (err: any) {
    log({ level: 'error', msg: 'post-movie error', error: err.message });
    const code = err.name === 'ConditionalCheckFailedException' ? 409 : 500;
    return { statusCode: code, body: JSON.stringify({ message: err.message }) };
  }
};

function hash(s: string) {
  // cheap obfuscation to avoid logging raw key
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h.toString(16);
}
