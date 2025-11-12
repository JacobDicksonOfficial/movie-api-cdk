import { APIGatewayProxyHandlerV2 } from 'aws-lambda';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  // TODO: Implement Cognito signUp using AWS SDK v3 (CognitoIdentityProviderClient)
  // Expect body: { email, password }
  // For now, return 501 to prove the route is wired.
  return {
    statusCode: 501,
    body: JSON.stringify({ message: 'register not implemented yet' }),
  };
};
