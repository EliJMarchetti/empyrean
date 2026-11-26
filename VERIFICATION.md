# Verification record

Verified locally on 2026-11-12 with Node 22, Chrome through Playwright, and embedded PostgreSQL through PGlite.

- `npm run check`: passed JavaScript syntax checks.
- `npm test`: 29 tests passed. Coverage includes campaign and character permissions, map file cleanup, session tools, designer drafts and publishing, and the linked journal migration and visibility checks.
- `npm run test:browser`: passed desktop and mobile preview and three-account cloud-adapter workflows, including journal settings, links, backlinks, tags, and world-note ownership transfer. Existing creation, advancement, inventory, map, session, designer catalog, and sign-out flows also passed.
- `npm run build`: packaged the current workspace into `dist/` for deployment. The original tracker source and the catalog conversion script stay in the repository.
- Screenshots are generated in the ignored `test-results/` directory.

The browser suite sends the production HTTP adapter through an emulated Supabase API into the migrated PostgreSQL database. Live Supabase Auth and Storage remain to be verified after applying the migration and deploying. See the two-device check in `SETUP.md`.

## Awakening and Oracle verification — 2026-11-25

The additive Awakening/Oracle migrations and optional Edge Function are described in [ORACLE.md](./ORACLE.md). Verification includes canonical 100-name generation, deck distribution and recursive Aces, idempotent draws, selection locking, decimal arithmetic, distinct input/output values, original-proposal preservation, approval/supersession, campaign isolation, role restrictions, provider failures and malformed output. Browser coverage includes refresh restoration, `/oracle/`, edited manual GM approval, Codex filters/history, player permissions and responsive layouts, alongside the existing application flows.

The configured Supabase project was restored, both migrations applied, and the Oracle endpoint deployed. Live RLS/function grants and unauthenticated denial were checked. Actual paid model generation requires server-side provider configuration. Static frontend publication and custom-domain availability remain outside the verified live state. See ORACLE.md for rollout instructions and remaining limitations.

Final checks: `npm test` passed all 45 tests; `npm run check`, the full browser suite, Deno type checking, and the production static build passed.
