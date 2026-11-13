# Verification record

Verified locally on 2026-11-12 with Node 22, Chrome through Playwright, and embedded PostgreSQL through PGlite.

- `npm run check`: passed JavaScript syntax checks.
- `npm test`: 29 tests passed. Coverage includes campaign and character permissions, map file cleanup, session tools, designer drafts and publishing, and the linked journal migration and visibility checks.
- `npm run test:browser`: passed desktop and mobile preview and three-account cloud-adapter workflows, including journal settings, links, backlinks, tags, and world-note ownership transfer. Existing creation, advancement, inventory, map, session, designer catalog, and sign-out flows also passed.
- `npm run build`: packaged the current workspace into `dist/` for deployment. The original tracker source and the catalog conversion script stay in the repository.
- Screenshots are generated in the ignored `test-results/` directory.

The browser suite sends the production HTTP adapter through an emulated Supabase API into the migrated PostgreSQL database. Live Supabase Auth and Storage remain to be verified after applying the migration and deploying. See the two-device check in `SETUP.md`.
