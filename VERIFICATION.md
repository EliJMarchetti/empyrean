# Verification record

Verified locally on 2026-11-12 with Node 22, Chrome through Playwright, and embedded PostgreSQL through PGlite.

- `npm run check`: passed JavaScript syntax checks.
- `npm test`: 26 tests passed. The GM tools tests cover upgrading an existing database, campaign and character deletion, character claim and assignment permissions, NPC privacy, map file cleanup permissions, turn order, progress clocks, and shared dice. Designer tests cover import mappings, private draft access, draft revision checks, editing, publication, deletion, and preserving finished sheet rules.
- `npm run test:browser`: passed desktop and mobile preview and three-account cloud-adapter workflows. Covered campaign invites, character claims and assignment, character deletion, NPC editing and token movement, session tools, campaign deletion, and retrying map file cleanup after a simulated Storage failure. Existing creation, advancement, journal, inventory, catalog, and sign-out flows also passed. Designer Studio passed add, edit, delete, publish, player visibility, and access checks.
- `npm run build`: packaged the current workspace into `dist/` for deployment. The original tracker source and the catalog conversion script stay in the repository.
- Screenshots are generated in the ignored `test-results/` directory.

The browser suite sends the production HTTP adapter through an emulated Supabase API into the migrated PostgreSQL database. Live Supabase Auth and Storage remain to be verified after applying the migration and deploying. See the two-device check in `SETUP.md`.
