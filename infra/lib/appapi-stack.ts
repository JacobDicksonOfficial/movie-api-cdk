import { Stack, StackProps, CfnOutput, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as ddb from 'aws-cdk-lib/aws-dynamodb';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';

// Phase 10 extras:
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';

export interface AppApiStackProps extends StackProps {
  userPool: cognito.IUserPool;
  table: ddb.ITable;
}

export class AppApiStack extends Stack {
  public readonly appApi: apigw.RestApi;

  constructor(scope: Construct, id: string, props: AppApiStackProps) {
    super(scope, id, props);

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

    const jwtAuthorizer = new apigw.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [props.userPool],
      authorizerName: 'MovieJwtAuthorizer',
    });

    const env = { TABLE_NAME: props.table.tableName };
    const defaults = { runtime: Runtime.NODEJS_20_X, bundling: { minify: true, externalModules: [] }, environment: env };

    // Lambdas
    const getMovieFn = new NodejsFunction(this, 'GetMovieFn', {
      entry: path.join(__dirname, '../src/app/get-movie.ts'),
      handler: 'handler',
      ...defaults,
    });
    const getCastFn = new NodejsFunction(this, 'GetCastFn', {
      entry: path.join(__dirname, '../src/app/get-cast.ts'),
      handler: 'handler',
      ...defaults,
    });
    const getCastMemberFn = new NodejsFunction(this, 'GetCastMemberFn', {
      entry: path.join(__dirname, '../src/app/get-cast-member.ts'),
      handler: 'handler',
      ...defaults,
    });
    const getAwardsFn = new NodejsFunction(this, 'GetAwardsFn', {
      entry: path.join(__dirname, '../src/app/get-awards.ts'),
      handler: 'handler',
      ...defaults,
    });
    const postMovieFn = new NodejsFunction(this, 'PostMovieFn', {
      entry: path.join(__dirname, '../src/app/post-movie.ts'),
      handler: 'handler',
      ...defaults,
      timeout: Duration.seconds(10),
    });
    const deleteMovieFn = new NodejsFunction(this, 'DeleteMovieFn', {
      entry: path.join(__dirname, '../src/app/delete-movie.ts'),
      handler: 'handler',
      ...defaults,
      timeout: Duration.seconds(15),
    });

    // Phase 10: 30-day log retention + simple error alarms
    const apiFns = [
      ['GetMovieFn', getMovieFn],
      ['GetCastFn', getCastFn],
      ['GetCastMemberFn', getCastMemberFn],
      ['GetAwardsFn', getAwardsFn],
      ['PostMovieFn', postMovieFn],
      ['DeleteMovieFn', deleteMovieFn],
    ] as const;

    apiFns.forEach(([idSuffix, fn]) => {
      new logs.LogRetention(this, `${idSuffix}Retention`, {
        logGroupName: fn.logGroup.logGroupName,
        retention: logs.RetentionDays.ONE_MONTH,
      });
      new cloudwatch.Alarm(this, `${idSuffix}Errors`, {
        metric: fn.metricErrors(),
        threshold: 1,
        evaluationPeriods: 1,
        datapointsToAlarm: 1,
      });
    });

    // Permissions
    props.table.grantReadData(getMovieFn);
    props.table.grantReadData(getCastFn);
    props.table.grantReadData(getCastMemberFn);
    props.table.grantReadData(getAwardsFn);
    props.table.grantReadWriteData(postMovieFn);
    props.table.grantReadWriteData(deleteMovieFn);

    // Resources
    const movies = this.appApi.root.addResource('movies');
    const movieId = movies.addResource('{movieId}');
    const actors = movieId.addResource('actors');
    const actorId = actors.addResource('{actorId}');
    const awards = this.appApi.root.addResource('awards');

    // GETs → JWT required
    const getOpts: apigw.MethodOptions = {
      authorizationType: apigw.AuthorizationType.COGNITO,
      authorizer: jwtAuthorizer,
    };
    movieId.addMethod('GET', new apigw.LambdaIntegration(getMovieFn), getOpts);
    actors.addMethod('GET', new apigw.LambdaIntegration(getCastFn), getOpts);
    actorId.addMethod('GET', new apigw.LambdaIntegration(getCastMemberFn), getOpts);
    awards.addMethod('GET', new apigw.LambdaIntegration(getAwardsFn), getOpts);

    // Admin → API key required
    const adminOpts: apigw.MethodOptions = { apiKeyRequired: true };
    movies.addMethod('POST', new apigw.LambdaIntegration(postMovieFn), adminOpts);
    movieId.addMethod('DELETE', new apigw.LambdaIntegration(deleteMovieFn), adminOpts);

    new CfnOutput(this, 'AppApiUrl', { value: this.appApi.url ?? 'N/A' });
  }
}
