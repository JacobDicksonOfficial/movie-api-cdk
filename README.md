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


## Phase 4 - DataStack — DynamoDB single-table (deployed)

- Table: movies-app
- Keys: id (PK, String), sk (SK, String)
- Billing: On-Demand
- Stream: NEW_AND_OLD_IMAGES
- PITR: ON

### Entity prefixes (spec)
- Movie: PK = m{movieId}, SK = xxxx
- Actor: PK = a{actorId}, SK = xxxx
- Cast:  PK = c{movieId}, SK = {actorId}   # actorId stored as string
- Award: PK = w{movieId} or w{actorId}, SK = {awardBody}

Examples:
- m1234 | xxxx | title, releaseDate, overview…
- c1234 | 6789 | roleName, roleDescription…

## Phase 5 — AuthStack (Cognito + Auth API) 

- Cognito User Pool: `movie-api-users` (email sign-in, self-signup enabled, email auto-verify).
- App Client: `movie-api-client` (no secret; supports `USER_PASSWORD_AUTH`).
- Auth REST API: `movie-auth-api` with:
  - `POST /auth/register`
  - `POST /auth/login`
  - `POST /auth/logout`
- Lambdas for each route (currently stubbed → return HTTP 501 “not implemented yet”).
- Least-privilege IAM so Lambdas can call Cognito IdP (SignUp/InitiateAuth/etc.).

## Phase 6 - AppApiStack (REST API, Cognito authorizer for GETs, API Key for admin)

- App REST API: movie-app-api (stage prod, CORS open for demo).
- Cognito JWT Authorizer (User Pool from AuthStack): Required on GET endpoints

- API Key + Usage Plan for admin routes: API Key name: movie-admin-key

### Routes (mock integrations returning 501 until Lambdas are added):
- GET /movies/{movieId} (JWT required)
- GET /movies/{movieId}/actors (JWT required)
- GET /movies/{movieId}/actors/{actorId}(JWT required)
- GET /awards (query: movie, actor, awardBody) (JWT required)
- POST /movies (x-api-key required)
- DELETE /movies/{movieId} (x-api-key required)