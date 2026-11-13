# Connect Empyrean to the cloud

The new application stays compatible with your existing GitHub Pages address. Supabase supplies accounts, PostgreSQL, and private map storage. Without that connection, the app offers a clearly labeled local preview. Preview accounts, invitations, and sample rules are only for that browser.

## 1. Create a Supabase project

Create a project at [Supabase](https://supabase.com/dashboard). Save the database password privately. No database password or service-role key belongs in this repository.

In the project's SQL Editor, run these files in order, once, in a **new project**:

1. `supabase/migrations/001_campaigns.sql`
2. `supabase/migrations/002_gm_tools.sql`
3. `supabase/migrations/003_designer_studio.sql`
4. `supabase/migrations/004_designer_drafts.sql`
5. `supabase/storage.sql`

They create the data tables, account profiles, database permissions and transaction functions, plus a private `campaign-maps` bucket. Do not paste them over a database with an existing Empyrean schema.

**Upgrading an existing Empyrean v2 project?** Run `supabase/migrations/002_gm_tools.sql` once and then re-run `supabase/storage.sql`. The upgrade keeps your existing campaigns, accounts, and sheets. Apply it before deploying the updated client.

Apply `supabase/migrations/003_designer_studio.sql` after the GM migration. Assign the Game Designer role by inserting the chosen Supabase Auth user ID into `private.game_designers` from the SQL Editor. The user signs in with their normal Empyrean account and opens `/designer/`. Published entries are added to current and future campaigns. Finished character sheets use their saved rules for existing choices.

Apply `supabase/migrations/004_designer_drafts.sql` to enable saved designer drafts. The production import is stored as a draft for review. The conversion script maps original specializations to unlockable skills, homeworlds and lineage features to variants, and corporate ties to abilities. Imported abilities start at 1 Merit when bought individually. Tekhne and Arkhemetry options without written rules start hidden. The original character and campaign saves are outside the scope of this catalog conversion.

## 2. Set up email sign-in

In Supabase Authentication, enable Email sign-in. In URL Configuration:

- Set **Site URL** to the exact existing website address, including the repository path and trailing slash. For the default Pages address for this repository, that is `https://elijmarchetti.github.io/empyrean/`.
- Add that same URL to **Redirect URLs**.
- For local testing, also allow `http://localhost:4173/` and `http://127.0.0.1:4173/`.

The app supports account registration, email confirmation, sign-in, password reset, and sign-out. Configure an SMTP provider in Supabase for delivery to your players; the built-in email sender has development limits. See [email authentication](https://supabase.com/docs/guides/auth/passwords) and [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

## 3. Connect the public client

Copy the project URL and **publishable** key from the project's Connect/API settings. The legacy public `anon` key also works. Never use `sb_secret_…` or a `service_role` key.

Choose either method:

**GitHub Pages deployment:** In repository Settings → Secrets and variables → Actions → Variables, add:

- `SUPABASE_URL`: `https://YOUR_PROJECT.supabase.co`
- `SUPABASE_PUBLISHABLE_KEY`: your public publishable key

The Pages workflow writes these public values into the deployed `config.js`.

**Local or another static host:** Edit `config.js`:

```js
window.EMPYREAN_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabasePublishableKey: "sb_publishable_YOUR_PUBLIC_KEY",
};
```

For local testing with the repository-variable method, also fill in `config.js` locally. GitHub variables are available only during deployment.

## 4. Run and deploy

```powershell
npm ci
npm run dev
```

Open `http://localhost:4173/`. For a dependency-free preview, `python -m http.server 4173` also serves this app. Use HTTP; ES modules do not run reliably from a `file://` URL.

The GitHub Pages workflow deploys the static site from `dist/` on a push to `main`. In repository Settings → Pages, choose **GitHub Actions**. The workflow runs syntax checks and database/rules tests before publishing at the repository's Pages URL.

For other static hosting, run `npm run build` and publish `dist/`. No Node server is required in production. Routes use URL hashes so character and table links work on GitHub Pages.

## 5. Prepare your first campaign

1. Register, confirm your email if required, and sign in.
2. Create a campaign. Set starting Merit, Sparks, and creation maximums.
3. Open **Campaign settings**. Add skills first, then abilities, lineages, and backgrounds. New campaigns intentionally start with no invented new-edition content.
4. In each entry, choose its skill unlocks and granted abilities. Skills marked **General** appear for every character, even at rank 0. Lineages can have variants and can require an age category. Disable entries to restrict creation choices.
5. Set the categorical fields required for a custom background. The starter labels are editable and are not official game rules.
6. Save campaign settings, then create an invitation link. Send that link to your players. Links expire after seven days, allow fifty joins, and can be revoked.
7. A player signs in, accepts the invitation, and goes directly into character creation. Existing members resume their character when accepting the same link again.

## Two-device acceptance check

- Sign in as GM on one device; create a campaign and add one lineage and one general skill.
- Open its invitation on a second device or separate browser profile. Register a different account and join.
- Create a character, select its lineage and age category, then choose a preset/custom/bypass background. Custom backgrounds cannot finish until the GM approves them.
- Spend/refund during creation. Finish with leftover Merit and verify the warning and that the sheet has zero unspent Merit.
- Award Merit as GM. Spend it as the player. Creation caps no longer apply; base maximums remain 5 and 10. Refunds are blocked by the database.
- Create party and private notes. Verify the party note on both devices and the private note only for its author. Try a GM note and a direct note too.
- Transfer part of an inventory stack and verify quantities on both devices.
- Upload a map as GM, mark it visible, and create a marker linked to the player. The player can move their marker; other players cannot. Hidden maps/markers are excluded from player reads.

Connected screens refresh every five seconds while visible, and immediately after a local write or returning to the tab. A lost connection is shown explicitly. Unsaved edits stay in the open form; stale writes are rejected with a reload message. This first version is a shared tabletop foundation rather than a full combat automation system.

## Authorization and persistence

- Supabase Auth owns logins. All data access requires an authenticated user.
- The database checks GM ownership and campaign membership. Browser controls are not the security boundary.
- Direct table writes are denied. `app_action` validates mutations and performs spending, completion, awards, transfers, invitation redemption, and marker movement in transactions.
- Private/personal notes are author-only. GM notes are author-plus-GM; direct notes are author-plus-recipient. Read policies enforce this even with manual API calls.
- Players see their own drafts; the GM sees all campaign drafts. Finished sheets are visible to campaign members. Shared links require sign-in and membership.
- Maps use a private bucket and expiring URLs. An already issued image URL may remain usable until its one-hour expiry if a map is subsequently hidden. Database map/marker reads reflect hiding on the next sync.
- Finished characters retain the rules for their chosen lineage/background, unlocked skills, and acquired abilities. Other abilities use current campaign availability/prices until acquired. Newly added entries become available for advancement. Creation choices remain locked.
- Preview data is separate and never uploaded into real accounts. Previous-edition saves are untouched and not automatically converted.

## Verification

```powershell
npm run check
npm test
npm run test:browser
```

Database tests run the actual migration in an embedded PostgreSQL runtime (PGlite) with separate authenticated identities and row-level-security checks. Browser tests exercise the application locally. A new project's email delivery, HTTPS deployment, and Storage service still require the two-device check after configuration.
