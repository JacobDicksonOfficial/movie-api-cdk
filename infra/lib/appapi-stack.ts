import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as cdk from 'aws-cdk-lib';

export interface AppApiStackProps extends StackProps {
  /** This pass's the User Pool from AuthStack so we can build a JWT authorizer for GET routes */
  userPool: cognito.IUserPool;
}

export class AppApiStack extends Stack {
  public readonly appApi: apigw.RestApi;
  public readonly apiKey: apigw.IApiKey;
  public readonly usagePlan: apigw.UsagePlan;

  constructor(scope: Construct, id: string, props: AppApiStackProps) {
    super(scope, id, props);

    // 1) REST API – front door for the app
    this.appApi = new apigw.RestApi(this, 'AppApi', {
      restApiName: 'movie-app-api',
      description: 'Movie App API with JWT for GET and API Key for admin routes',
      deployOptions: { stageName: 'prod' },
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
        allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      },
    });

    // 2) Cognito Authorizer (JWT) for applying GET requests only
    const jwtAuthorizer = new apigw.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [props.userPool],
      authorizerName: 'MovieJwtAuthorizer',
    });

    // Helper: simple 501 MockIntegration
    const mock501 = (action: string) =>
      new apigw.MockIntegration({
        passthroughBehavior: apigw.PassthroughBehavior.NEVER,
        requestTemplates: { 'application/json': '{ "statusCode": 501 }' },
        integrationResponses: [
          {
            statusCode: '501',
            responseTemplates: {
              'application/json': JSON.stringify({ message: `${action} not implemented yet` }),
            },
          },
        ],
      });

    // Common method response for 501 responses
    const methodResp501: apigw.MethodResponse = { statusCode: '501' };

    // 3) Resources
    const movies = this.appApi.root.addResource('movies');
    const movieId = movies.addResource('{movieId}');
    const actors = movieId.addResource('actors');
    const actorId = actors.addResource('{actorId}');
    const awards = this.appApi.root.addResource('awards');

    // 4) GET endpoints (JWT authorizer required)
    const getOpts: apigw.MethodOptions = {
      authorizationType: apigw.AuthorizationType.COGNITO,
      authorizer: jwtAuthorizer,
      methodResponses: [methodResp501],
    };

    // GET /movies/{movieId}
    movieId.addMethod('GET', mock501('GET /movies/{movieId}'), getOpts);

    // GET /movies/{movieId}/actors
    actors.addMethod('GET', mock501('GET /movies/{movieId}/actors'), getOpts);

    // GET /movies/{movieId}/actors/{actorId}
    actorId.addMethod('GET', mock501('GET /movies/{movieId}/actors/{actorId}'), getOpts);

    // GET /awards?movie=...&actor=...&awardBody=...
    awards.addMethod('GET', mock501('GET /awards'), getOpts);

    // 5) Admin endpoints (API Key required – no JWT)
    const adminOpts: apigw.MethodOptions = {
      apiKeyRequired: true,
      methodResponses: [methodResp501],
    };

    // POST /movies
    movies.addMethod('POST', mock501('POST /movies'), adminOpts);

    // DELETE /movies/{movieId}
    movieId.addMethod('DELETE', mock501('DELETE /movies/{movieId}'), adminOpts);

    // 6) API Key + Usage Plan
    const adminKeyParam = new cdk.CfnParameter(this, 'AdminApiKeyParam', {
      type: 'String',
      default: 'demo-admin-key-CHANGE-ME',
      description:
         'Demo-only admin API key value to require on POST/DELETE (replace before demo).',
    });

    const apiKey = new apigw.ApiKey(this, 'AdminApiKey', {
      apiKeyName: 'movie-admin-key',
      value: adminKeyParam.valueAsString,
      description: 'Admin key for POST/DELETE routes',
    });
    this.apiKey = apiKey;

    const plan = new apigw.UsagePlan(this, 'AdminUsagePlan', {
      name: 'movie-admin-plan',
      throttle: { rateLimit: 10, burstLimit: 2 },
      quota: { limit: 10000, period: apigw.Period.MONTH },
    });
    plan.addApiStage({ stage: this.appApi.deploymentStage });
    plan.addApiKey(apiKey);
    this.usagePlan = plan;

    // 7) Outputs 
    new CfnOutput(this, 'AdminApiKeyValue', {
      value: adminKeyParam.valueAsString,
      description: 'DEMO: API key to send as x-api-key on POST/DELETE',
    });
  }
}
