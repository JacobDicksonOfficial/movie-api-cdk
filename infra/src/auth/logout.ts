import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  GlobalSignOutCommand
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    if (!authHeader) {
      return { statusCode: 400, body: JSON.stringify({ message: "Missing Authorization header" }) };
    }

    const token = authHeader.replace("Bearer ", "");

    await client.send(new GlobalSignOutCommand({
      AccessToken: token,
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Logged out successfully" }),
    };

  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Logout failed", error: err.message }),
    };
  }
};