# Movie API — AWS CDK

Status: Phases 0–1 completed (tooling + AWS account/CLI + CDK bootstrap).<br>
Region: eu-west-1<br>
AWS CLI profile: movie-api<br>
Next: scaffold CDK app under infra/.


## Phase 3 — DataStack plan (design only)

- Stack (logical): DataStack
- Table (physical): movie-api-table
- Region: eu-west-1
- Keys: id (PK, String), sk (SK, String)
- Billing: On-Demand (Pay-Per-Request)
- PITR: ON (for safety)
- RemovalPolicy (dev): DESTROY
- Stream: NEW_AND_OLD_IMAGES

### Entity key prefixes
- Movie: PK = m<movieId>, SK = xxxx
- Actor: PK = a<actorId>, SK = xxxx
- Cast:  PK = c<movieId>, SK = <actorId>
- Award: PK = w<movieId> or w<actorId>, SK = <awardBody>

Examples:
- m1234 | xxxx | "The Shawshank Redemption" | 05-03-1995 | "overview…"
- c1234 | 6789 | "Ellis Redding" | "role description…"

### IAM plan (for later stacks)
- GET Lambdas: dynamodb:GetItem, dynamodb:Query
- Admin Lambdas (POST/DELETE): dynamodb:PutItem, dynamodb:DeleteItem, dynamodb:BatchWriteItem
- Stream consumer Lambda: needs table Stream ARN + dynamodb:DescribeStream, GetRecords, GetShardIterator, ListStreams

> All queries will use GetItem/Query only (no scans), per the assignment spec.
