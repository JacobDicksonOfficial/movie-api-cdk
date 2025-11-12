#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AuthStack } from '../lib/auth-stack';
import { DataStack } from '../lib/data-stack';
import { AppApiStack } from '../lib/appapi-stack';
import { OpsStack } from '../lib/ops-stack';

const app = new cdk.App();

// Use the CLI/profile account & region. Default to eu-west-1 for clarity.
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'eu-west-1',
};

// Foundation stacks (we’ll pass references later when resources exist)
const data = new DataStack(app, 'DataStack', { env });
const auth = new AuthStack(app, 'AuthStack', { env });

// App/API and Ops (no resources yet, just structure)
const api = new AppApiStack(app, 'AppApiStack', { env });
const ops = new OpsStack(app, 'OpsStack', { env });

// Optional tags for billing/clarity
cdk.Tags.of(app).add('Project', 'MovieAPI');
cdk.Tags.of(app).add('Owner', 'JacobDickson');
