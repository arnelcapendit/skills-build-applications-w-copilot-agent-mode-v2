# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

Record your plan here before editing code.

- Presentation tier decision: Keep route-level views in React and use the shared API client for relative `/api` requests. Each capability view will expose loading, populated, empty, and accessible error states without embedding persistence or business rules in components.
- Logic tier decision: Keep request validation, scoring, membership updates, aggregation, and recommendation selection in `octofitService.ts`; routes translate service results and errors into the documented JSON and HTTP contracts.
- Data tier decision: Use Mongoose schemas with required identity and capability fields, ObjectId references between users, teams, and activities, and a default empty `members` array. Seed stable demo records with upserts and never clear unrelated records.
- Activity tracking approach: Validate the submitted user and team IDs and confirm both records exist before creating an activity. Store the references, type, minutes, a deterministic points value based on minutes, and an occurrence timestamp; invalid input or missing references must return 4xx responses rather than cast-error 500s.
- Team management approach: Require a name, preserve the submitted name and mascot, and keep member references as ObjectIds with an empty-array default. When associating a user with a team, keep the user's team reference and the team's members list consistent.
- Leaderboard approach: Aggregate activity points by team, sort totals descending, and assign ranks starting at 1. Return the team name and total alongside each rank.
- Workout suggestions approach: Find the user by email, use the user's fitness goal and recent activity to select and explain relevant seeded workouts, and return a deliberate 4xx response when no user matches.

## Test plan

Run the focused contract tests first, then both builds. A failing data test points to a schema invariant or seed regression; a failing API test points to service behavior, validation, or response-shape errors; a failing frontend test points to rendering, request state, accessibility, or API-client wiring. A build failure indicates a TypeScript or bundling error.

- Data tier: `npm run test:data --prefix octofit-tracker/backend` - passed (5/5), including schema validation, seed repeatability, and preservation of unrelated records.
- API: `npm run test:api --prefix octofit-tracker/backend` - passed (4/4), covering activity validation and creation, teams and members, leaderboard ranking, and personalized workout suggestions.
- Frontend: `npm test --prefix octofit-tracker/frontend` - passed (15/15), covering API-backed content and loading, empty, and accessible error states on all four routes.
- Backend build: `npm run build --prefix octofit-tracker/backend` - passed; rerun after implementation to catch TypeScript errors.
- Frontend build: `npm run build --prefix octofit-tracker/frontend` - passed; rerun after implementation to catch TypeScript or Vite errors.
- Codespace seed idempotence: run `npm run seed --prefix octofit-tracker/backend` twice against the configured MongoDB instance; two consecutive live runs were not verified in this check. The data-contract test verifies repeated seeding against an isolated in-memory MongoDB and preservation of unrelated records.
