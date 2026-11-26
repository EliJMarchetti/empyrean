# Awakening and Oracle

The implementation extends the existing plain JavaScript application, Supabase Auth, read-only table policies, `app_action` transactions, and device preview. It introduces no client framework, SDK, embeddings service, or paid package dependency. Optional AI requests use the OpenAI Responses API and incur the configured provider's usage charges.

## Using the features

1. Open a draft character and select **Awakening**, after Identity. Existing characters can open **Spend Merit → Awakening**. Eligibility remains a campaign decision; an unrecorded awakening does not block existing character workflows.
2. Draw Input and Output. Each click saves the server-generated sequence before revealing it. Refreshing returns the saved cards. Aces generate two additional draws recursively, without replacement; each side starts with a complete deck.
3. After both sides are visible, choose a drawn option for each side and confirm. Final choices lock. The sheet displays the generated discipline, consumed/produced domains, cards, and unresolved restrictions. Suits are stored without assigning subtypes or specialization benefits.
4. Open **Oracle** in campaign navigation, or `/oracle/` to choose a campaign. The directory entry point supports `goodlands.space/oracle` on hosts that serve directory indexes; GitHub Pages normally redirects to `/oracle/`.
5. Select **New valuation request**. Choose a character or General valuation, describe the action and optional circumstances, and choose AI or manual GM review. The request is persisted before any AI call. The open request form also saves a device draft with an idempotency key.
6. The GM selects **Review valuation**, edits each side independently, and approves, denies, or requests clarification. Blank Essentia means undetermined; an explicit `0` is a distinct, known value. Only sides with a known value create Codex records. Conditions, scope, assumptions, scaling, tags, benchmark status, and rationale are editable.
7. Browse approved rulings in the Codex. Filter by domain, status, or text. **Revise / supersede** adds a replacement and retains the old record. Equivalent active records with different values are flagged for GM review; they are never automatically averaged. A clarification is retained in review history; the player can submit a new request with the requested details.

## Database and authorization

Apply these files once after `005_linked_journal.sql`:

- `supabase/migrations/20261126022017_awakening_oracle.sql`
- `supabase/migrations/20261126023650_oracle_hardening.sql`

The additive schema includes:

| Table | Purpose |
| --- | --- |
| `private.awakening_config` | Versioned snapshot of the canonical working deck; no browser table grants |
| `public.awakenings` | Separate character awakening record, side histories, available options, selected affinities, generation method and ruleset |
| `public.oracle_rules` | Explicit campaign Oracle instructions with revision checks |
| `public.oracle_estimates` | Original request, character reference, immutable original AI suggestion, provider state, model/version, retrieved IDs and review status |
| `public.oracle_reviews` | Append-only GM decisions, edited ruling, rationale, scope and reviewer |
| `public.oracle_valuations` | Independently reusable input/output values and their approval, provenance and supersession links |

All new tables have RLS. The private deck configuration intentionally has no browser policies or table grants; only the owner-run transaction reads it. Direct browser writes are denied. Awakening access follows character visibility; only its owner can draw/select. Requests and review details are visible to their requester and campaign GM. Approved and historical Codex records are visible to campaign members. Only the campaign GM can approve, supersede, or change campaign instructions. Character references must be in that campaign and owned by the requester or authorized to its GM.

Existing campaign deletion cascades through these new campaign records. No character builds, saved rule snapshots, legacy abilities, or old prices are rewritten. Historical Arkhemetry catalog content remains historical. No existing structured Dynametry records were found in the active app. New structured awakenings always interpret Dynametry as Energy → Mass and Arkhevis as Mass → Energy. Any later legacy importer must explicitly map old semantics; it must not infer input/output from an old display name alone.

Valuations use PostgreSQL `numeric`, with explicit range/precision checks. RPC responses and AI proposals transport decimal strings to avoid JavaScript precision loss. The current application safeguard is `0 ≤ value < 10^30`, at most six decimal places. This is a storage limit, not an adopted rule permitting fractional Essentia expenditure. Conditional resource calculations use integer arithmetic and round requirements upward to that display precision.

## Optional AI configuration

Deploy `supabase/functions/oracle/index.ts` with the repository-relative modules included. With an authenticated Supabase CLI, use its current `functions deploy` workflow; `supabase/config.toml` provides the function's gateway setting. `scripts/oracle-deploy-files.mjs` emits the equivalent self-contained file array for the Supabase MCP deploy tool. It packages the canonical modules without maintaining a second rule implementation.

Set these in **Supabase → Edge Functions → Secrets**, never in `config.js`, GitHub Pages variables, or browser code:

| Secret | Meaning |
| --- | --- |
| `OPENAI_API_KEY` | Provider API credential; must have access to the configured model |
| `ORACLE_MODEL` | Model ID supporting strict JSON-schema structured output through the Responses API |
| `ORACLE_ALLOWED_ORIGINS` | Optional comma-separated origins; defaults to `https://goodlands.space`, `https://www.goodlands.space`, and `https://elijmarchetti.github.io`. Add local development origins explicitly when needed. |

Supabase supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in the function environment. The function manually validates the user's bearer token with Supabase Auth. Gateway `verify_jwt=false` supports modern publishable-key calls; it does not permit unauthenticated access. Context RPC calls run with the caller's token and RLS. Only the server credential can claim a generation lease and save validated provider results. The model has no tools or approval privileges.

Requests retrieve at most twelve relevant active approved valuations from the same campaign using description, domain, tags, scope and conditions. Retrieval treats each operation independently and does not require a matching conversion pair. It is a bounded lexical implementation; semantic embeddings and advanced quantity matching are future improvements. The AI receives only explicit Oracle instructions, supplied circumstances, the selected character's mechanical fields and purchased skill definitions, and these precedents. Journal entries, biographies, unrelated characters and the full campaign history are excluded.

The system prompt establishes the authority hierarchy and treats retrieved text as untrusted data. Independent values, null unknowns, allowed domains, bounds, text sizes and real authorized precedent IDs are validated in application code and the database. Denied/proposed estimates are never positive precedents. Superseded rulings are excluded from future retrieval. Scaling is not assumed without explicit approval.

Provider calls have a timeout, per-request retry cap and a per-user rate guard. A generation lease prevents duplicate concurrent requests; stale leases expire after two minutes so a GM can review manually. Missing configuration, provider errors, malformed output and refusals preserve the original request. No AI response is fabricated. Requests use `store:false` at the provider.

The adapter follows the official [Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create) and [Supabase Edge Function authentication](https://supabase.com/docs/guides/functions/auth) interfaces.

## Established, provisional and deferred mechanics

Canonical domain IDs, input-first naming, the 54-card distribution, individual attribute hits, duplicate skill-die collapse, specialized hit multiplication and capped `60 + 10 × effective hits` efficiency are deterministic application code.

Restricted rank assignments, unrestricted face-card assignments and recursive Ace resolution are labeled working defaults in `CARD_DEFAULTS`. Its database snapshot is checked by `npm run check`. Before initial deployment, regenerate it with `node scripts/sync-awakening-config.mjs` after editing defaults. After deployment, introduce a new ruleset version through a new additive migration; retain old configuration for in-progress records. Future predetermined policies can populate side options without drawing; no lineage guarantees are implemented now.

Magnitude is shown as the provisional positive reduction `floor(log10(quantity))` for quantities at least one Essentia. Each side's intrinsic value is displayed separately; neither is silently adopted as the definitive Entry/Exit difficulty basis. Required-input figures are conditional on actual efficiency, not guarantees of successful tests.

No canonical valuation rows are seeded, including the working hydrogen benchmark. No suit meanings, restriction taxonomy, automatic restriction specialization, lifespan prices, elemental rates, Chance formula, absolute-domain execution rules, failure-acquisition formula, targeting/range engine, or spillover table is introduced. Nothing creation/annihilation remains explicitly subject to GM adjudication. This infrastructure never executes a conversion or stores spendable Essentia balances.

## Verification and rollout

Run:

```powershell
npm run check
npm test
npm run test:browser
npx --yes deno check supabase/functions/oracle/index.ts
npm run build
```

`check` performs syntax and deck-snapshot checks. This JavaScript repository has no separate lint or frontend TypeScript configuration. The Deno command checks the Edge Function entry point. PostgreSQL tests use PGlite and real authenticated/anonymous/server role grants. Browser tests exercise the cloud HTTP adapter against that database, including two accounts, restoration, review, supersession and mobile layouts. Provider tests use controlled HTTP responses, not billable model calls. Screenshots are in ignored `test-results/`.

During this implementation the existing Supabase project `osqmvnrkiuarwofrgmrq` was restored to `ACTIVE_HEALTHY`, both migrations were applied, and the Oracle Edge Function was deployed. Live checks confirmed 54 unique configured cards, RLS on every new public table, server-only AI result writes, and a 401 response without authentication. Live paid model generation was not verified because no provider credential/model was available in the working environment. Existing Auth leaked-password protection remains disabled; private designer tables have no anon/authenticated table grants despite a generic metadata warning about their disabled RLS.

The static client is packaged in `dist/`. Publish through the repository's existing GitHub Pages workflow or its current static host to expose the new frontend. This change does not register or change `goodlands.space` DNS or hosting. The custom-domain path is prepared but was not verified live; the domain was not reachable through the web inspection tool. For email confirmation/recovery from Oracle, add the exact deployed `/oracle/` address to Supabase Auth Redirect URLs.

Main implementation files: `src/v2/awakening.js` (taxonomy/cards/policies), `essentia.js` (exact mechanics), `oracle-core.js` (schema, compatibility, prompt, retrieval/conflicts), `oracle-store.js` (device preview), `supernatural-ui.js` (UI), `app.js`/`app.css`/`cloud.js`/`demo.js` (integration), `oracle/index.html` (entry point), the two migrations, the Oracle function, packaging/check helpers, and the awakening/Oracle tests. Existing untracked `Arkhemetry_Codex_Starter/` files were not modified.
