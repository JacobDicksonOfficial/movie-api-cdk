#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AuthStack } from '../lib/auth-stack';
import { DataStack } from '../lib/data-stack';
import { AppApiStack } from '../lib/appapi-stack';
import { OpsStack } from '../lib/ops-stack';

const app = new cdk.App();
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'eu-west-1',
};

const data = new DataStack(app, 'DataStack', { env });
const auth = new AuthStack(app, 'AuthStack', { env });

// 🔗 Pass the user pool to AppApiStack for the JWT authorizer
const api = new AppApiStack(app, 'AppApiStack', {
  env,
  userPool: auth.userPool,
});

const ops = new OpsStack(app, 'OpsStack', { env });

cdk.Tags.of(app).add('Project', 'MovieAPI');
cdk.Tags.of(app).add('Owner', 'JacobDickson');
