import { APIGatewayProxyHandlerV2 } from 'aws-lambda';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  // TODO: Implement InitiateAuth USER_PASSWORD_AUTH to get JWTs
  // Expect body: { email, password }
  return {
    statusCode: 501,
    body: JSON.stringify({ message: 'login not implemented yet' }),
  };
};
