import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface OpsStackProps extends StackProps {}

export class OpsStack extends Stack {
  constructor(scope: Construct, id: string, props?: OpsStackProps) {
    super(scope, id, props);
    // Placeholder: log retention/alarms and shared ops bits will go here.
  }
}
