import { APIGatewayProxyHandler } from 'aws-lambda';
import { ddb, TABLE_NAME, log } from '../shared/db';
import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const q = event.queryStringParameters ?? {};
    const movie = q.movie;
    const actor = q.actor;
    const awardBody = q.awardBody;

    const username = (event.requestContext.authorizer as any)?.claims?.['cognito:username'] ?? 'anonymous';
    log({ level: 'info', msg: 'GET /awards', username, path: event.path, query: q });

    // Helper to query all awards for an entity
    const queryAll = async (pk: string) => {
      const r = await ddb.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: '#id = :pk',
        ExpressionAttributeNames: { '#id': 'id' },
        ExpressionAttributeValues: { ':pk': pk },
      }));
      return r.Items ?? [];
    };

    // Helper to get a specific award for an entity
    const getOne = async (pk: string, body: string) => {
      const r = await ddb.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { id: pk, sk: body },
      }));
      return r.Item ? [r.Item] : [];
    };

    // Cases
    if (movie && !actor && !awardBody) {
      return { statusCode: 200, body: JSON.stringify(await queryAll(`w${movie}`)) };
    }
    if (actor && !movie && !awardBody) {
      return { statusCode: 200, body: JSON.stringify(await queryAll(`w${actor}`)) };
    }
    if (movie && awardBody && !actor) {
      return { statusCode: 200, body: JSON.stringify(await getOne(`w${movie}`, awardBody)) };
    }
    if (actor && awardBody && !movie) {
      return { statusCode: 200, body: JSON.stringify(await getOne(`w${actor}`, awardBody)) };
    }
    if (movie && actor && !awardBody) {
      // spec note: awards are per entity → return both result sets
      const [movieRes, actorRes] = await Promise.all([queryAll(`w${movie}`), queryAll(`w${actor}`)]);
      return { statusCode: 200, body: JSON.stringify({ movieAwards: movieRes, actorAwards: actorRes }) };
    }
    if (movie && actor && awardBody) {
      const [movieOne, actorOne] = await Promise.all([getOne(`w${movie}`, awardBody), getOne(`w${actor}`, awardBody)]);
      return { statusCode: 200, body: JSON.stringify({ movieAwards: movieOne, actorAwards: actorOne }) };
    }
    return { statusCode: 400, body: JSON.stringify({ message: 'Provide movie or actor (and optional awardBody)' }) };
  } catch (err: any) {
    log({ level: 'error', msg: 'get-awards error', error: err.message });
    return { statusCode: 500, body: JSON.stringify({ message: 'internal error' }) };
  }
};
