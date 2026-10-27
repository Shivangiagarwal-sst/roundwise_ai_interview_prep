# Roundwise Technical Architecture

## 1. System Overview

Roundwise is designed as a single-origin MERN stack application built for reliability, rapid response times, and deterministic execution.

```
┌────────────────────────────────────────────────────────┐
│                      Client Layer                      │
│   React 18 + Vite + Vanilla CSS Custom Design Tokens    │
│   React Router DOM + Context API + Lucide Icons        │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP / Credentials Cookie
                           ▼
┌────────────────────────────────────────────────────────┐
│                     Server Layer                       │
│    Node.js (>=20) + Express 4 + Helmet + Pino Logging  │
│    Zod Request Validation + Express Rate Limiters      │
└────────────┬─────────────────────────────┬─────────────┘
             │                             │
             ▼                             ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│       Database Layer      │ │      AI Analysis Layer    │
│  MongoDB (Mongoose ODM)   │ │  Google Gemini API        │
│  - Companies (659 docs)   │ │  - Algorithmic reasoning  │
│  - Questions (2,800 docs) │ │  - Time/space complexity  │
│  - User Progress (SM-2)   │ │  - Edge cases breakdown   │
│  - Prep Plans             │ │  - Quota tracker (10/day) │
└───────────────────────────┘ └───────────────────────────┘
```

---

## 2. Security Architecture

### Authentication & Session Management
- **HttpOnly Cookies:** Authentication tokens are issued as JSON Web Tokens (JWT) signed with HMAC-SHA256 and transmitted exclusively via `httpOnly`, `SameSite=Lax` cookies. JavaScript cannot access the token, neutralizing cross-site scripting (XSS) credential theft.
- **CSRF Mitigation:** Cookie transmission requires valid `SameSite=Lax` configuration combined with strict origin validation in CORS middleware.
- **Password Hashing:** Passwords are salted and hashed using bcrypt with 12 cost rounds (`BCRYPT_ROUNDS = 12`).

### Input Hardening & Prompt Defense
- **Zod Validation Middleware:** All endpoints enforce schema validation for `req.body`, `req.query`, and `req.params`. Invalid fields fail before reaching controller logic.
- **AI Prompt-Injection Sanitization:** Code submitted for AI review is wrapped within demarcated code fences with explicit boundary instructions, preventing user input from overriding the system evaluation criteria.
- **Rate Limiting:** Granular rate limiters prevent credential brute-forcing (5 attempts/min on auth endpoints) and AI quota abuse (5 requests/min per IP).

---

## 3. Database Schema Design & Indexing

### `Company`
```js
{
  slug: { type: String, unique: true },
  name: { type: String },
  questionCount: { type: Number, index: true },
  freshCount: { type: Number },
  difficultyBreakdown: { easy: Number, medium: Number, hard: Number }
}
```
- Indexed for text search (`name: 'text'`) and frequency sorting (`questionCount: -1`).

### `Question`
```js
{
  leetcodeId: { type: Number, unique: true },
  title: { type: String },
  url: { type: String },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'] },
  acceptanceRate: { type: Number },
  companies: [
    {
      slug: String,
      name: String,
      frequency: Number,
      recency: [String]
    }
  ],
  companySlugs: { type: [String], index: true },
  maxFrequency: { type: Number, index: true }
}
```
- Multi-key index on `companySlugs` enables sub-millisecond filtering across multiple target companies simultaneously.

### `UserQuestionProgress`
```js
{
  user: { type: ObjectId, ref: 'User' },
  question: { type: ObjectId, ref: 'Question' },
  status: { type: String, enum: ['unattempted', 'attempted', 'solved'] },
  isBookmarked: Boolean,
  solvedAt: Date,
  revision: {
    stage: Number, // 0 to 4
    nextReviewAt: Date, // Indexed for revision queue queries
    lastReviewedAt: Date
  },
  notes: String,
  solution: { language: String, code: String },
  aiReview: { ... }
}
```
- Compound unique index `{ user: 1, question: 1 }` prevents duplicate records.
- Compound index `{ user: 1, 'revision.nextReviewAt': 1 }` allows instant retrieval of daily due revisions.

---

## 4. Production Deployment Strategy

- **Single-Origin Deployment:** In production (`NODE_ENV=production`), the Express server serves both the REST API at `/api/*` and the static compiled frontend from `client/dist`. This eliminates cross-origin cookie issues and enables zero-configuration hosting on Render.
- **Graceful Shutdown:** Process traps `SIGTERM` and `SIGINT`, closes HTTP listeners, terminates open database connections gracefully, and times out after 10 seconds if hanging.
