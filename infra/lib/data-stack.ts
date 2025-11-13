import { Stack, StackProps, CfnOutput, RemovalPolicy, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  AttributeType,
  BillingMode,
  StreamViewType,
  Table,
} from 'aws-cdk-lib/aws-dynamodb';
import { Runtime, StartingPosition } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as path from 'path';

// Phase 10 extras:
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';

export interface DataStackProps extends StackProps {}

export class DataStack extends Stack {
  public readonly table: Table;

  constructor(scope: Construct, id: string, props?: DataStackProps) {
    super(scope, id, props);

    this.table = new Table(this, 'MoviesSingleTable', {
      tableName: 'movies-app',
      partitionKey: { name: 'id', type: AttributeType.STRING },
      sortKey:      { name: 'sk', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
      // non-deprecated PITR field
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
    });

    this.table.applyRemovalPolicy(RemovalPolicy.DESTROY);

    // Stream consumer: logs INSERT/REMOVE as required lines
    const stateLogger = new NodejsFunction(this, 'StateChangeLoggerFn', {
      entry: path.join(__dirname, '../src/streams/state-change-logger.ts'),
      handler: 'handler',
      runtime: Runtime.NODEJS_20_X,
      bundling: { minify: true, externalModules: [] },
      timeout: Duration.seconds(10),
      environment: { TABLE_NAME: this.table.tableName },
    });

    // Phase 10: 30-day log retention + simple error alarm
    new logs.LogRetention(this, 'StateChangeLoggerFnRetention', {
      logGroupName: stateLogger.logGroup.logGroupName,
      retention: logs.RetentionDays.ONE_MONTH,
    });
    new cloudwatch.Alarm(this, 'StateChangeLoggerFnErrors', {
      metric: stateLogger.metricErrors(),
      threshold: 1,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
    });

    stateLogger.addEventSource(
      new DynamoEventSource(this.table, {
        startingPosition: StartingPosition.TRIM_HORIZON,
        batchSize: 10,
        bisectBatchOnError: true,
        retryAttempts: 2,
      })
    );

    new CfnOutput(this, 'TableName', { value: this.table.tableName });
    new CfnOutput(this, 'TableArn', { value: this.table.tableArn });
    new CfnOutput(this, 'StreamArn', { value: this.table.tableStreamArn ?? 'no-stream' });
  }
}
