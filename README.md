# Empyrean Campaigns

A new-edition campaign workspace that can replace the previous character tracker at the same GitHub Pages URL.

Includes account registration/sign-in/recovery, campaign creation and invitations, GM-managed content and creation bounds, guided character creation, permanent character sheets and advancement, shared maps/markers, inventory transfers, and private/party/GM/direct notes.

GMs can build unassigned sheets in **Characters** and give them to a player directly or with a single-use link. The same page holds the GM's NPC roster, with custom stat labels, private notes, and tokens that can be placed on campaign maps. In **Session tools**, the table can follow turn order, track progress clocks, and share dice rolls. Owners can delete a character from its sheet, and the GM can delete a campaign from **Campaign settings → Rules**.

**Designer Studio** lets designated Empyrean accounts edit and save an unpublished draft of official lineages, variants, backgrounds, skills, and abilities. **Publish catalog** makes the draft available to all signed-in players through the Official library, character creation, and advancement.

**Cloud accounts and cross-device persistence require a Supabase project.** The repository includes the database schema, authorization, transaction functions, and [setup instructions](./SETUP.md). Until configured, the application offers an explicitly labeled device-only preview with example content.

New campaigns use empty catalogs so we can author the new edition's lineages, backgrounds, skills, and abilities together. The preview's game content is illustrative.

```powershell
npm ci
npm run dev
```

Open [localhost:4173](http://localhost:4173/). The production client uses browser-native JavaScript modules. `npm run build` packages only the static client for deployment.

```powershell
npm run check
npm test
npm run test:browser
```

The previous tracker’s source remains in the repository. Run `node scripts/import-original-catalog.mjs` to convert its shared rules and catalog into the current catalog format. Designer Studio replaces the previous system editor.
