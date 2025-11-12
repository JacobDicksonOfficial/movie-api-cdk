import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface AppApiStackProps extends StackProps {
  // Later we can pass references like table, user pool, api key etc.
}

export class AppApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: AppApiStackProps) {
    super(scope, id, props);
    // Placeholder: REST API, Lambdas, Cognito authorizer for GETs, API Key/Usage Plan for POST/DELETE.
  }
}
