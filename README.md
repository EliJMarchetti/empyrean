# Empyrean Character Tracker

The first playable foundation for the Empyrean web app lives in this repository. This version focuses on the character sheet homepage, local character management, campaign linking placeholders, and the custom dice roller logic for your tabletop system.

## What is included

- Browser-style top toolbar with character switching, creation, save, share, edit lock, campaign linking, and deletion
- Local multi-character persistence through `localStorage`
- Three-panel character sheet for `Body`, `Soul`, and `Rift`
- Gear inventory card screen with Focus slots, durability, bulk tracking, armor/shields, and active/passive equipment bonuses
- Bottom-right gear hotbar showing Focus cards on every character screen
- Disabled world/VTT tab for future integration
- Empyrean dice roller with attribute-based rolls, skill and specialization bonuses, and custom formula support
- Share/export flow using a portable import code and hosted share-link support when the app is served over HTTP

## Running it locally

Because this first version is dependency-light, you can run it without a build step.

### Option 1

Open [index.html](C:\Users\Elijm\Documents\Empyrean Character Tracker\index.html) directly in a browser.

### Option 2

Serve the folder with Python for cleaner local links and imports:

```powershell
python -m http.server 4173
```

Then visit [http://localhost:4173](http://localhost:4173).

## Next milestones

- Flesh out character creation and biography details
- Connect campaign codes to a real multiplayer/VTT layer
- Add map, encounter, and shared table tools
