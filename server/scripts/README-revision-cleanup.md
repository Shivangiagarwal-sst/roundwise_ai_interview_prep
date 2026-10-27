# One-time cleanup of legacy revision schedules

The Revision Queue reads saved records from MongoDB. Updating the seeding script does not remove schedules that were already written to Atlas.

This utility lists reviewed revision schedules for one account and, only when explicitly passed `--confirm`, resets their revision scheduling fields. It does **not** delete the account, solved status, bookmarks, notes, plans, or question data.

Run from the `server` folder, using the same configured `server/.env` as the app:

```bash
npm run cleanup:legacy-revisions -- your-login-email@example.com --dry-run
```

Review the exact list first. To clear the listed reviewed schedules for that account while preserving other data:

```bash
npm run cleanup:legacy-revisions -- your-login-email@example.com --confirm
```

This targets schedules with stage greater than zero and a recorded review date. It may include legitimate reviewed schedules, so inspect the dry-run list before confirming. Newly solved, not-yet-reviewed stage-0 items are preserved.
