import { Stack, StackProps, CfnOutput, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

// Phase 10 extras:
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as logs from 'aws-cdk-lib/aws-logs';

export interface AuthStackProps extends StackProps {}

export class AuthStack extends Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly authApi: apigw.RestApi;

  constructor(scope: Construct, id: string, props?: AuthStackProps) {
    super(scope, id, props);

    // 1) Cognito User Pool (email login)
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'movie-api-users',
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: { email: { required: true, mutable: false } },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
        tempPasswordValidity: Duration.days(7),
      },
    });

    // 2) App client (no secret; for web/native)
    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: 'movie-api-client',
      generateSecret: false,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      preventUserExistenceErrors: true,
    });

    // 3) API Gateway (Auth API)
    this.authApi = new apigw.RestApi(this, 'AuthApi', {
      restApiName: 'movie-auth-api',
      description: 'Auth API for register/login/logout with Cognito',
      deployOptions: { stageName: 'prod' },
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: ['POST', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
      },
    });

    // 4) Lambda helpers
    const defaultEnv = {
      USER_POOL_ID: this.userPool.userPoolId,
      USER_POOL_CLIENT_ID: this.userPoolClient.userPoolClientId,
      REGION: Stack.of(this).region,
    };

    const nodeFn = (id: string, entryRel: string) =>
      new NodejsFunction(this, id, {
        entry: path.join(__dirname, `../src/auth/${entryRel}`),
        handler: 'handler',
        runtime: Runtime.NODEJS_20_X,
        bundling: { minify: true, externalModules: [] },
        environment: defaultEnv,
      });

    const registerFn = nodeFn('RegisterFn', 'register.ts');
    const loginFn    = nodeFn('LoginFn', 'login.ts');
    const logoutFn   = nodeFn('LogoutFn', 'logout.ts');

    // Phase 10: 30-day log retention + simple error alarms
    [registerFn, loginFn, logoutFn].forEach((fn, i) => {
      new logs.LogRetention(this, `AuthFnRetention${i}`, {
        logGroupName: fn.logGroup.logGroupName,
        retention: logs.RetentionDays.ONE_MONTH,
      });
      new cloudwatch.Alarm(this, `AuthFnErrors${i}`, {
        metric: fn.metricErrors(),
        threshold: 1,
        evaluationPeriods: 1,
        datapointsToAlarm: 1,
      });
    });

    // Allow Lambdas to call Cognito IdP
    const idpActions = [
      'cognito-idp:SignUp',
      'cognito-idp:AdminConfirmSignUp',
      'cognito-idp:InitiateAuth',
      'cognito-idp:RespondToAuthChallenge',
      'cognito-idp:GlobalSignOut',
      'cognito-idp:RevokeToken',
      'cognito-idp:AdminUpdateUserAttributes',
    ];
    [registerFn, loginFn, logoutFn].forEach(fn => {
      fn.addToRolePolicy(new iam.PolicyStatement({
        actions: idpActions,
        resources: [this.userPool.userPoolArn],
      }));
    });

    // 5) Routes
    const auth = this.authApi.root.addResource('auth');
    auth.addResource('register').addMethod('POST', new apigw.LambdaIntegration(registerFn));
    auth.addResource('login').addMethod('POST', new apigw.LambdaIntegration(loginFn));
    auth.addResource('logout').addMethod('POST', new apigw.LambdaIntegration(logoutFn));

    // 6) Outputs
    new CfnOutput(this, 'UserPoolId',        { value: this.userPool.userPoolId });
    new CfnOutput(this, 'UserPoolClientId',  { value: this.userPoolClient.userPoolClientId });
    new CfnOutput(this, 'AuthApiUrl',        { value: this.authApi.url ?? 'N/A' });
  }
}
