# Roundwise REST API Reference

All requests and responses use JSON (`Content-Type: application/json`).
All authenticated endpoints require the `token` httpOnly cookie issued upon login or registration.

---

## Public Endpoints

### `GET /api/health`
Returns system status, database connectivity, and configured AI model.

### `GET /api/public/stats`
Returns genuine dataset metrics.
```json
{
  "success": true,
  "data": {
    "questionCount": 2842,
    "companyCount": 659,
    "snapshotDate": "2026-08-16",
    "commit": "e095c259cfd036e3ddb6886e84d7075c2faac477"
  }
}
```

### `GET /api/public/plan-preview`
Simulates a multi-company study plan without saving or requiring authentication.
- **Query Parameters:**
  - `companySlugs`: comma-separated slugs (e.g. `google,amazon`)
  - `totalDays`: integer (3–30, default 7)
  - `questionsPerDay`: integer (1–10, default 3)

---

## Authentication Endpoints

### `POST /api/auth/register`
Creates a new account and sets `token` httpOnly cookie.
- **Body:** `{ "name": "...", "email": "...", "password": "..." }`
- **Status:** `201 Created`

### `POST /api/auth/login`
Authenticates with credentials and sets `token` httpOnly cookie.
- **Body:** `{ "email": "...", "password": "..." }`
- **Status:** `200 OK`

### `POST /api/auth/demo`
One-click demo login if demo credentials are configured in environment variables.

### `GET /api/auth/me` *(Auth Required)*
Returns authenticated user profile.

### `POST /api/auth/logout` *(Auth Required)*
Clears the authentication cookie.

---

## Companies Endpoints

### `GET /api/companies`
Lists indexed companies with pagination, search, and sorting.
- **Query Parameters:**
  - `search`: string
  - `sort`: `questions` | `fresh` | `name`
  - `order`: `asc` | `desc`
  - `page`: integer (default 1)
  - `limit`: integer (default 24)

### `GET /api/companies/:slug`
Returns single company details and difficulty breakdown.

---

## Questions Endpoints

### `GET /api/questions`
Search and filter questions. Optional authentication enriches results with user status.
- **Query Parameters:**
  - `search`: string
  - `company`: slug string
  - `difficulty`: `Easy` | `Medium` | `Hard`
  - `recency`: `thirty-days` | `three-months` | `six-months` | `more-than-six-months` | `all`
  - `sort`: `frequency` | `acceptance` | `difficulty` | `id`
  - `bookmarked`: boolean
  - `status`: `unattempted` | `attempted` | `solved`
  - `page`: integer
  - `limit`: integer

### `GET /api/questions/:id`
Returns question details, all company frequencies, and candidate's progress.

---

## Progress & Revision Endpoints *(Auth Required)*

### `PUT /api/progress/questions/:questionId/status`
Updates completion status (`{ solved: boolean }`). Ticking sets `solvedAt` and schedules SM-2 spaced repetition revision; unticking clears `solvedAt` and removes from the revision queue.

### `PUT /api/progress/questions/:questionId/bookmark`
Toggles question bookmark.

### `PUT /api/progress/questions/:questionId/notes`
Saves candidate's invariant notes.

### `PUT /api/progress/questions/:questionId/solution`
Saves solution code scratchpad.

### `POST /api/progress/questions/:questionId/review`
Submits spaced-repetition recall rating (`forgot` | `hard` | `good` | `easy`).

### `GET /api/progress/revisions/due`
Returns list of problems whose review interval is due.

### `GET /api/progress/stats`
Returns user solve counts grouped by difficulty and status.

---

## Study Plans Endpoints *(Auth Required)*

### `POST /api/plans`
Generates and persists a deterministic multi-company study plan.
- **Body:**
```json
{
  "companySlugs": ["google", "amazon", "microsoft"],
  "totalDays": 7,
  "questionsPerDay": 3,
  "difficultyMix": { "easy": 20, "medium": 60, "hard": 20 },
  "focusRecency": "all",
  "includeSolved": false
}
```

### `GET /api/plans`
Lists candidate's saved plans with solved completion counts.

### `GET /api/plans/:id`
Returns complete plan with day-by-day populated questions.

### `DELETE /api/plans/:id`
Deletes a study plan.

---

## AI Endpoints *(Auth Required)*

### `POST /api/ai/review`
Requests Gemini code and reasoning review.
- **Body:**
```json
{
  "questionId": "...",
  "language": "python",
  "code": "...",
  "explanation": "..."
}
```
- **Response:**
```json
{
  "success": true,
  "data": {
    "approach": "...",
    "timeComplexity": "O(N log K)",
    "spaceComplexity": "O(K)",
    "edgeCases": ["...", "..."],
    "suggestions": ["..."]
  },
  "quotaRemaining": 9,
  "disclaimer": "AI review checks reasoning; it does not run your code."
}
```

### `GET /api/ai/status`
Returns daily quota status (total quota, used today, remaining).
