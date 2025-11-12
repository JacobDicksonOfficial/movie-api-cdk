import { Stack, StackProps, CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  AttributeType,
  BillingMode,
  StreamViewType,
  Table,
} from 'aws-cdk-lib/aws-dynamodb';

export interface DataStackProps extends StackProps {}

export class DataStack extends Stack {
  public readonly table: Table;

  constructor(scope: Construct, id: string, props?: DataStackProps) {
    super(scope, id, props);

    // DynamoDB single-table (spec)
    this.table = new Table(this, 'MoviesSingleTable', {
      tableName: 'movies-app',                    // physical name (per phase spec)
      partitionKey: { name: 'id', type: AttributeType.STRING }, // PK
      sortKey:      { name: 'sk', type: AttributeType.STRING }, // SK
      billingMode: BillingMode.PAY_PER_REQUEST,   // on-demand
      stream: StreamViewType.NEW_AND_OLD_IMAGES,  // needed for state-change logging
      pointInTimeRecovery: true,                  // safety (optional but recommended)
    });

    // Dev convenience; switch to RETAIN if you want to preserve table on destroy
    this.table.applyRemovalPolicy(RemovalPolicy.DESTROY);

    // Useful outputs for other stacks / verification
    new CfnOutput(this, 'TableName', { value: this.table.tableName });
    new CfnOutput(this, 'TableArn', { value: this.table.tableArn });
    new CfnOutput(this, 'StreamArn', {
      value: this.table.tableStreamArn ?? 'no-stream',
    });
  }
}
