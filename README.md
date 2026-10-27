# Roundwise

> **"Know what they ask before you walk in."**  
> A high-conviction technical interview prep workspace powered by genuine company-wise question data, multi-target deterministic study plans, and spaced-repetition retention.

[![Test Suite](https://img.shields.io/badge/tests-28%20passed-10b981.svg)](server/tests)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20.0.0-f97316.svg)](.nvmrc)
[![License: MIT](https://img.shields.io/badge/License-MIT-6366f1.svg)](LICENSE)
[![Dataset](https://img.shields.io/badge/companies-659%20indexed-06b6d4.svg)](server/data)

---

## 💡 The Problem & The Solution

### The Placement Problem
University students preparing for campus placements face a frustrating dilemma:
- **Paywalls:** LeetCode Premium costs ~$35/month or $159/year. The primary reason students pay is not the video solutions or compiler speed—it is simply to see **which questions each company asks**.
- **No Multi-Company Structure:** Candidates rarely interview for just one firm. They target 3 to 5 companies simultaneously (e.g. Google, Amazon, Microsoft, Uber). Standard lists treat companies in silos, causing candidates to waste hours manually cross-referencing spreadsheets and repeating patterns.
- **Recall Fade:** Solving a tricky Dynamic Programming or Graph problem once does not guarantee recall during high-stress 45-minute live rounds.

### The Roundwise Solution
Roundwise is a free, engineering-grade interview workspace built on top of genuine company-wise question datasets:
1. **Multi-Company Overlap Engine:** A pure mathematical scoring engine that identifies high-yield questions asked across multiple target companies, maximizing prep efficiency per hour.
2. **SM-2 Spaced Repetition:** Automated retention scheduling (1d, 3d, 7d, 14d, 30d) ensuring algorithmic patterns stay fresh until interview day.
3. **Honest AI Code Review:** Powered by Google Gemini to analyze algorithmic invariants, edge cases, and asymptotic complexity—with strict prompt hardening and no fake execution claims.

---

## 🛠️ Technology Stack

| Layer | Technology | Architectural Role |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite | High-performance SPA with client-side routing |
| **Styling** | Vanilla CSS Design System | Obsidian & ember dark-first palette, CSS variables, glassmorphism |
| **Icons** | Lucide React | Consistent engineering iconography |
| **Backend** | Node.js (>=20), Express 4 | RESTful API server with single-origin static serving |
| **Database** | MongoDB, Mongoose 8 | Multi-key indexed document storage |
| **Validation** | Zod 3 | Startup environment verification & request schema gating |
| **Security** | Helmet, Cookie-Parser, Bcrypt | HttpOnly JWT cookies, strict CORS, rate limiters |
| **AI Integration** | Google Gen AI SDK (`@google/genai`) | Reasoning review, time/space complexity analysis |
| **Testing** | Jest 29, Supertest, MongoMemoryServer | 100% in-memory isolated unit & integration test suite |

---

## 📊 Dataset Provenance & Attribution

The core question catalog is vendored directly into the repository for offline reproducibility:
- **Upstream Repository:** [`snehasishroy/leetcode-companywise-interview-questions`](https://github.com/snehasishroy/leetcode-companywise-interview-questions)
- **Snapshot Date:** `2026-08-16`
- **Vendored Commit:** `e095c259cfd036e3ddb6886e84d7075c2faac477`
- **Coverage:** **659 company directories**, **1,642 CSV files**, across 5 recency windows (`thirty-days`, `three-months`, `six-months`, `more-than-six-months`, `all`).
- Full provenance details: [server/data/SOURCE.json](server/data/SOURCE.json) and [server/data/ATTRIBUTION.md](server/data/ATTRIBUTION.md).

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Node.js:** `>= 20.0.0` (Verify with `node -v`)
- **MongoDB:** Local MongoDB instance OR a free MongoDB Atlas connection string.

### 2. Installation
Clone the repository and install root and package dependencies:
```bash
npm run install:all
```

### 3. Environment Configuration
Copy the template environment file:
```bash
cp server/.env.example server/.env
```

Edit `server/.env` with your settings:
```ini
MONGODB_URI=mongodb://localhost:27017/roundwise
PORT=5000
NODE_ENV=development
JWT_SECRET=replace-with-a-random-secret-at-least-32-chars-long
CLIENT_URL=http://localhost:5173

# Optional: Google Gemini API Key for AI Code Reviews
# Get key at: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash

# Optional: Instant Demo Account
DEMO_EMAIL=demo@roundwise.dev
DEMO_PASSWORD=roundwise-demo-pass
```

### 4. Import the Question Dataset
Populate your database with the 659 companies and 2,800+ questions:
```bash
npm run import:data
npm run verify:data
```

### 5. Seed Demo User (Optional)
Create the demo account populated with solved problems, plans, and revisions:
```bash
npm run seed:demo
```

### 6. Run the Application
Start both the API server and Vite client concurrently:
```bash
npm run dev
```
Open your browser at **`http://localhost:5173`**.

---

## 🧪 Testing

The test suite runs with an isolated in-memory database (`mongodb-memory-server`), requiring zero external network or database dependencies:

```bash
# Run all unit and integration tests (28 tests)
npm test

# Run tests with coverage report
cd server && npm run test:coverage
```

### Test Suite Structure
```
server/tests/
├── setup.js                      # MongoMemoryServer lifecycle & DB cleaner
├── unit/
│   ├── planGenerator.test.js     # Scoring formulas, recency weights, ramp-up
│   └── revisionScheduler.test.js # SM-2 stage progression & interval math
└── integration/
    ├── auth.test.js              # Register, login, httpOnly cookie verification
    ├── public.test.js            # Public stats counter & plan preview
    └── plans.test.js             # Authenticated plan creation & regeneration
```

---

## 📐 Mathematical Specification & Architecture

For deep-dive technical documentation:
- **[Algorithm Specification](docs/ALGORITHM.md):** Mathematical formulas for multi-company scoring, recency weights, difficulty balancing, and SM-2 retention.
- **[System Architecture](docs/ARCHITECTURE.md):** Security model, database schemas, compound indexes, and rate limiting strategy.
- **[REST API Reference](docs/API.md):** Complete OpenAPI/REST endpoint specifications, status codes, and payload formats.

---

## 🌐 Production Deployment (Render + MongoDB Atlas)

Roundwise is engineered to deploy cleanly as a single web service:

1. **MongoDB Atlas:** Create a free M0 cluster and copy the connection string.
2. **Render Web Service:**
   - **Build Command:** `npm run build` (builds the React client into `client/dist`).
   - **Start Command:** `npm start` (starts Express, which serves both `/api` and `client/dist`).
3. **Environment Variables on Render:**
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: `mongodb+srv://...`
   - `JWT_SECRET`: Random 64-char string
   - `CLIENT_URL`: `https://your-service.onrender.com`
   - `GEMINI_API_KEY`: Your Gemini key

---

## 📄 License & Disclaimer

- **Core Code:** MIT License ([LICENSE](LICENSE)).
- **Disclaimer:** Roundwise is an independent educational tool. Problem titles and links point to public problems on LeetCode. Roundwise is not affiliated with, endorsed by, or sponsored by LeetCode or any named companies.
