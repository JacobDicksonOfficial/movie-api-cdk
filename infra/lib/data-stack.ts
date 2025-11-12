import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface DataStackProps extends StackProps {}

export class DataStack extends Stack {
  constructor(scope: Construct, id: string, props?: DataStackProps) {
    super(scope, id, props);
    // Placeholder: DynamoDB single-table (movie-api-table) + Streams will go here.
  }
}
