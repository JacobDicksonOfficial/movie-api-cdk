import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    if (!event.body) {
      return { statusCode: 400, body: JSON.stringify({ message: "Missing request body" }) };
    }

    const { email, password } = JSON.parse(event.body);
    if (!email || !password) {
      return { statusCode: 400, body: JSON.stringify({ message: "email and password required" }) };
    }

    const USER_POOL_CLIENT_ID = process.env.USER_POOL_CLIENT_ID!;

    const authResponse = await client.send(new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: USER_POOL_CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password
      }
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Login successful",
        idToken: authResponse.AuthenticationResult?.IdToken,
        accessToken: authResponse.AuthenticationResult?.AccessToken,
        refreshToken: authResponse.AuthenticationResult?.RefreshToken,
      }),
    };

  } catch (err: any) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: "Invalid credentials", error: err.message }),
    };
  }
};