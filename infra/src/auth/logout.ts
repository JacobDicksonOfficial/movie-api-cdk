import { APIGatewayProxyHandlerV2 } from 'aws-lambda';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  // TODO: Implement GlobalSignOut/Revocation (optional)
  // Expect header Authorization: Bearer <id/access token>
  return {
    statusCode: 501,
    body: JSON.stringify({ message: 'logout not implemented yet' }),
  };
};
