# Verification record

Verified locally on 2026-11-12 with Node 22, Chrome through Playwright, and embedded PostgreSQL through PGlite.

- `npm run check`: passed JavaScript syntax checks.
- `npm test`: 24 tests passed. The GM tools tests cover upgrading an existing database, campaign and character deletion, character claim and assignment permissions, NPC privacy, map file cleanup permissions, turn order, progress clocks, and shared dice.
- `npm run test:browser`: passed desktop and mobile preview and three-account cloud-adapter workflows. Covered campaign invites, character claims and assignment, character deletion, NPC editing and token movement, session tools, campaign deletion, and retrying map file cleanup after a simulated Storage failure. Existing creation, advancement, journal, inventory, catalog, and sign-out flows also passed.
- `npm run build`: packaged the new workspace and original tracker into `dist/` for GitHub Pages. Backend scripts, tests, and dependencies are excluded from the published client.
- Screenshots are generated in the ignored `test-results/` directory.

The browser suite sends the production HTTP adapter through an emulated Supabase API into the migrated PostgreSQL database. Live Supabase Auth and Storage remain to be verified after applying the migration and deploying. See the two-device check in `SETUP.md`.
