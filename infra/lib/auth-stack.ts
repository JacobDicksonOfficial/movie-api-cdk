import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface AuthStackProps extends StackProps {}

export class AuthStack extends Stack {
  constructor(scope: Construct, id: string, props?: AuthStackProps) {
    super(scope, id, props);
    // Placeholder: Cognito User Pool + Auth API (register/login/logout) will go here.
  }
}
