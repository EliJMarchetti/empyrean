const STORAGE_KEY = "empyrean.characters.v1";
const MAX_SPECIALIZATIONS = 8;
const ATTRIBUTE_SCORES = [4, 5, 6, 7, 8, 9, 10, 11, 12];

const SECTION_TEMPLATES = [
  {
    id: "body",
    title: "Body",
    healthLabel: "Wounds",
    tone: "body",
    attributes: [
      { key: "power", label: "Power", subLabel: "Bulk", subType: "Support Track" },
      { key: "control", label: "Control", subLabel: "Accuracy", subType: "Support Track" },
      { key: "senses", label: "Senses", subLabel: "Focus", subType: "Support Track" },
    ],
    skills: ["Awareness", "Craft", "Deftness", "Might", "Mobility", "Vigor"],
  },
  {
    id: "soul",
    title: "Soul",
    healthLabel: "Madness",
    tone: "soul",
    attributes: [
      { key: "mind", label: "Mind", subLabel: "Augment", subType: "Augment Slot" },
      { key: "will", label: "Will", subLabel: "Augment", subType: "Augment Slot" },
      { key: "emotion", label: "Emotion", subLabel: "Augment", subType: "Augment Slot" },
    ],
    skills: ["Composure", "Information", "Manipulation", "Reason", "Rhetoric", "Systems"],
  },
  {
    id: "rift",
    title: "Rift",
    healthLabel: "Rift",
    tone: "rift",
    attributes: [
      { key: "intuition", label: "Intuition", subLabel: "Tekhne", subType: "Signature Ability" },
      {
        key: "conscience",
        label: "Conscience",
        subLabel: "Arkhemetry",
        subType: "Signature Ability",
      },
      {
        key: "communion",
        label: "Communion",
        subLabel: "Cosmoglossia",
        subType: "Signature Ability",
      },
    ],
    skills: ["Anima", "Character", "Discernment", "Discipline", "Faith", "Presence"],
  },
];

const AVATAR_OPTIONS = [
  { value: "male", label: "Masculine silhouette" },
  { value: "female", label: "Feminine silhouette" },
  { value: "neutral", label: "Neutral silhouette" },
];

const app = document.querySelector("#app");

const storedState = loadStoredState();

const state = {
  characters: storedState.characters,
  ui: {
    activeCharacterId: null,
    activeView: "sheet",
    editMode: true,
    activeModal: null,
    isCharacterMenuOpen: false,
    toast: null,
    rollHistory: [],
    lastRoll: null,
    isRolling: false,
  },
};

state.ui.activeCharacterId =
  storedState.activeCharacterId && state.characters.some((character) => character.id === storedState.activeCharacterId)
    ? storedState.activeCharacterId
    : state.characters[0]?.id ?? null;

const sharedImport = parseSharedCharacterFromUrl();
if (sharedImport) {
  state.ui.activeModal = { type: "import-shared", payload: sharedImport };
}

if (!state.characters.length && !state.ui.activeModal) {
  state.ui.activeModal = { type: "create-character" };
}

renderApp();

document.addEventListener("click", handleClick);
document.addEventListener("change", handleChange);
document.addEventListener("submit", handleSubmit);
document.addEventListener("contextmenu", handleContextMenu);
window.addEventListener("keydown", handleKeydown);

function renderApp() {
  const character = getActiveCharacter();

  app.innerHTML = `
    <div class="app-shell">
      <div class="backdrop-orbit orbit-one"></div>
      <div class="backdrop-orbit orbit-two"></div>
      ${renderToolbar(character)}
      <main class="workspace ${character ? "" : "workspace-empty"}">
        ${
          character
            ? `
              <section class="sheet-column">
                ${renderCharacterHeader(character)}
                ${renderPrimaryView(character)}
              </section>
              <aside class="utility-column">
                ${renderDicePanel(character)}
                ${renderGearPanel(character)}
              </aside>
            `
            : renderWelcomePanel()
        }
      </main>
      ${renderModal()}
      ${renderToast()}
    </div>
  `;
}

function renderToolbar(character) {
  const linkedLabel = character?.campaign?.code
    ? `${character.campaign.space || "Linked"} · ${character.campaign.code}`
    : "No campaign linked";

  return `
    <header class="toolbar">
      <div class="toolbar-group toolbar-left">
        <div class="toolbar-dropdown ${state.ui.isCharacterMenuOpen ? "is-open" : ""}">
          <button class="toolbar-button toolbar-button-primary" data-action="toggle-character-menu" type="button">
            ${iconFolder()}
            <span>Characters</span>
            <span class="toolbar-caret">${state.ui.isCharacterMenuOpen ? "▴" : "▾"}</span>
          </button>
          ${
            state.ui.isCharacterMenuOpen
              ? `
                <div class="character-menu">
                  <div class="character-menu-actions">
                    <button class="menu-action" data-action="open-create-modal" type="button">New Character</button>
                    <button class="menu-action" data-action="open-import-modal" type="button">Import Share Code</button>
                  </div>
                  <div class="character-menu-list">
                    ${
                      state.characters.length
                        ? state.characters
                            .map(
                              (entry) => `
                                <button
                                  class="character-menu-item ${entry.id === state.ui.activeCharacterId ? "is-active" : ""}"
                                  data-action="select-character"
                                  data-character-id="${entry.id}"
                                  type="button"
                                >
                                  <span class="character-menu-name">${escapeHtml(entry.name)}</span>
                                  <span class="character-menu-meta">${formatUpdatedAt(entry.updatedAt)}</span>
                                </button>
                              `
                            )
                            .join("")
                        : `<div class="character-menu-empty">No saved operatives yet.</div>`
                    }
                  </div>
                </div>
              `
              : ""
          }
        </div>
        <button
          class="toolbar-button ${state.ui.editMode ? "is-active" : ""}"
          data-action="toggle-edit-mode"
          type="button"
          ${character ? "" : "disabled"}
        >
          ${iconLock(state.ui.editMode)}
          <span>Edit ${state.ui.editMode ? "On" : "Off"}</span>
        </button>
        <button class="toolbar-button" data-action="save-character" type="button" ${character ? "" : "disabled"}>
          ${iconSave()}
          <span>Save</span>
        </button>
        <button class="toolbar-button" data-action="open-share-modal" type="button" ${character ? "" : "disabled"}>
          ${iconShare()}
          <span>Share</span>
        </button>
      </div>
      <div class="toolbar-group toolbar-right">
        <div class="toolbar-status">${escapeHtml(linkedLabel)}</div>
        <button class="toolbar-button" data-action="open-link-modal" type="button" ${character ? "" : "disabled"}>
          ${iconLink()}
          <span>Link to Campaign</span>
        </button>
        <button class="toolbar-button toolbar-button-danger" data-action="open-delete-modal" type="button" ${
          character ? "" : "disabled"
        }>
          ${iconTrash()}
          <span>Delete Character</span>
        </button>
      </div>
    </header>
  `;
}

function renderWelcomePanel() {
  return `
    <section class="welcome-panel">
      <div class="welcome-copy">
        <p class="eyebrow">Empyrean // Character Operations</p>
        <h1>Build your first operative.</h1>
        <p>
          The homepage is ready to manage multiple saved characters, lock editing, link campaigns later,
          and roll the custom dice math for your system. Start by creating the first character.
        </p>
        <button class="hero-button" data-action="open-create-modal" type="button">Create Character</button>
      </div>
    </section>
  `;
}

function renderCharacterHeader(character) {
  const campaignText = character.campaign?.code
    ? `${character.campaign.space || "Campaign"} • ${character.campaign.code}`
    : "Unlinked operative";
  const avatar = character.avatar ?? "neutral";

  return `
    <section class="character-header">
      <div class="character-header-main">
        <p class="eyebrow">Primary Sheet</p>
        <div class="character-title-row">
          <div>
            <h1>${escapeHtml(character.name)}</h1>
            <p class="character-subtitle">${escapeHtml(campaignText)}</p>
          </div>
          <div class="character-badges">
            <span class="status-pill">Saved Locally</span>
            <span class="status-pill">${state.ui.editMode ? "Edit Enabled" : "Edit Locked"}</span>
          </div>
        </div>
      </div>
      <div class="view-switcher">
        <button
          class="view-button ${state.ui.activeView === "sheet" ? "is-active" : ""}"
          data-action="switch-view"
          data-view="sheet"
          type="button"
          title="Character sheet"
        >
          ${iconAvatar(avatar)}
        </button>
        <button
          class="view-button ${state.ui.activeView === "inventory" ? "is-active" : ""}"
          data-action="switch-view"
          data-view="inventory"
          type="button"
          title="Inventory"
        >
          ${iconBackpack()}
        </button>
        <button
          class="view-button view-button-disabled"
          data-action="switch-view"
          data-view="world"
          type="button"
          title="World and VTT integration arrive in a later milestone."
          disabled
        >
          ${iconWorld()}
        </button>
      </div>
    </section>
  `;
}

function renderPrimaryView(character) {
  if (state.ui.activeView === "inventory") {
    return renderInventoryView(character);
  }

  if (state.ui.activeView === "world") {
    return renderWorldPlaceholder(character);
  }

  return `
    <div class="sheet-grid">
      ${SECTION_TEMPLATES.map((section) => renderSectionBlock(character, section)).join("")}
    </div>
    <section class="specializations-panel">
      <div class="section-heading section-heading-compact">
        <div>
          <p class="eyebrow">Applied Bonuses</p>
          <h2>Specializations</h2>
        </div>
        <span class="section-caption">Eight quick bonus slots across the bottom edge.</span>
      </div>
      <div class="specialization-strip">
        ${character.specializations
          .map(
            (specialization, index) => `
              <label class="specialization-chip">
                <span>${getSpecializationLabel(index)}</span>
                <input
                  type="number"
                  data-input="specialization-value"
                  data-index="${index}"
                  min="0"
                  max="100"
                  value="${specialization.value}"
                  ${state.ui.editMode ? "" : "disabled"}
                />
              </label>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderSectionBlock(character, sectionTemplate) {
  const section = character.sections[sectionTemplate.id];
  const maxHealth = getSectionMax(section);

  return `
    <section class="stat-block stat-block-${sectionTemplate.tone}">
      <div class="section-heading">
        <div>
          <p class="eyebrow">${sectionTemplate.healthLabel} and core traits</p>
          <h2>${sectionTemplate.title}</h2>
        </div>
        <div class="health-module">
          <span>${sectionTemplate.healthLabel}</span>
          <div class="health-values">
            <input
              type="number"
              data-input="health-current"
              data-section="${sectionTemplate.id}"
              min="0"
              max="${maxHealth}"
              value="${section.health.current}"
              ${state.ui.editMode ? "" : "disabled"}
            />
            <span>/ ${maxHealth}</span>
          </div>
        </div>
      </div>
      <div class="attribute-grid">
        ${section.attributes
          .map((attribute, index) => renderAttributeCard(sectionTemplate, attribute, index))
          .join("")}
      </div>
      <div class="skills-grid">
        ${section.skills
          .map(
            (skill, index) => `
              <label class="skill-row">
                <span>${escapeHtml(skill.label)}</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  data-input="skill-value"
                  data-section="${sectionTemplate.id}"
                  data-index="${index}"
                  value="${skill.value}"
                  ${state.ui.editMode ? "" : "disabled"}
                />
              </label>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderAttributeCard(sectionTemplate, attribute, index) {
  const diceText = formatDiceNotation(scoreToDice(attribute.score));

  return `
    <article class="attribute-card">
      <div class="attribute-card-top">
        <div>
          <p class="eyebrow">${escapeHtml(attribute.subLabel)}</p>
          <h3>${escapeHtml(attribute.label)}</h3>
        </div>
        <div class="attribute-score-pack">
          <label>
            <span>Score</span>
            <select
              data-input="attribute-score"
              data-section="${sectionTemplate.id}"
              data-index="${index}"
              ${state.ui.editMode ? "" : "disabled"}
            >
              ${ATTRIBUTE_SCORES.map(
                (value) => `<option value="${value}" ${value === attribute.score ? "selected" : ""}>${value}</option>`
              ).join("")}
            </select>
          </label>
          <div class="dice-chip">${escapeHtml(diceText)}</div>
        </div>
      </div>
      <label class="substat-field">
        <span>${escapeHtml(attribute.subLabel)} · ${escapeHtml(attribute.subType)}</span>
        <textarea
          rows="2"
          data-input="attribute-subvalue"
          data-section="${sectionTemplate.id}"
          data-index="${index}"
          maxlength="120"
          placeholder="Future-facing slot for notes, augments, or abilities."
          ${state.ui.editMode ? "" : "disabled"}
        >${escapeHtml(attribute.subValue)}</textarea>
      </label>
    </article>
  `;
}

function renderInventoryView(character) {
  const hasCampaign = Boolean(character.campaign?.code);

  return `
    <section class="placeholder-panel placeholder-inventory">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Inventory surface</p>
          <h2>Card bay coming next</h2>
        </div>
        <span class="section-caption">${hasCampaign ? "Linked and waiting for gear data." : "Offline loadout only for now."}</span>
      </div>
      <div class="placeholder-body">
        <p>
          This space is reserved for the future card-based inventory layout. For now it stays intentionally open
          so we can design gear cards and drag/drop behavior around the same shell later.
        </p>
      </div>
    </section>
  `;
}

function renderWorldPlaceholder(character) {
  const message = character.campaign?.code
    ? "Campaign linked, but the shared world map has not been built yet."
    : "Link this operative to a campaign before opening the future VTT view.";

  return `
    <section class="placeholder-panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Future VTT surface</p>
          <h2>World view locked</h2>
        </div>
      </div>
      <div class="placeholder-body">
        <p>${escapeHtml(message)}</p>
      </div>
    </section>
  `;
}

function renderDicePanel(character) {
  const lastRoll = state.ui.lastRoll;

  return `
    <section class="utility-panel dice-panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Resolution engine</p>
          <h2>Dice Roller</h2>
        </div>
        <span class="section-caption">Left click to build a roll. Right click for a custom formula.</span>
      </div>
      <button class="roll-button" data-action="open-builder-modal" type="button">
        <span class="roll-button-label">Roll</span>
        <span class="roll-button-note">Attribute + Skill + Specs + Bonus</span>
      </button>
      <div class="dice-stage ${state.ui.isRolling ? "is-rolling" : ""}">
        ${renderDie(lastRoll?.orderedResults?.[0] ?? "—", "a")}
        ${renderDie(lastRoll?.orderedResults?.[1] ?? "—", "b")}
      </div>
      <div class="roll-summary">
        ${
          lastRoll
            ? `
              <div class="summary-total">${lastRoll.total}</div>
              <div class="summary-meta">
                <p>${escapeHtml(lastRoll.label)}</p>
                <p>${escapeHtml(lastRoll.breakdown)}</p>
              </div>
            `
            : `
              <div class="summary-empty">
                <p>No roll yet.</p>
                <p>Your latest result lands here with critical and bonus math.</p>
              </div>
            `
        }
      </div>
      <div class="roll-history">
        ${
          state.ui.rollHistory.length
            ? state.ui.rollHistory
                .map(
                  (entry) => `
                    <div class="history-row">
                      <div>
                        <strong>${escapeHtml(entry.label)}</strong>
                        <span>${escapeHtml(entry.breakdown)}</span>
                      </div>
                      <div class="history-total">${entry.total}</div>
                    </div>
                  `
                )
                .join("")
            : `<div class="history-empty">Recent rolls will stack here.</div>`
        }
      </div>
    </section>
  `;
}

function renderDie(value, suffix) {
  return `
    <div class="die die-${suffix}">
      <div class="die-face die-face-front">${escapeHtml(String(value))}</div>
      <div class="die-face die-face-back">${escapeHtml(String(value))}</div>
      <div class="die-face die-face-right">${escapeHtml(String(value))}</div>
      <div class="die-face die-face-left">${escapeHtml(String(value))}</div>
      <div class="die-face die-face-top">${escapeHtml(String(value))}</div>
      <div class="die-face die-face-bottom">${escapeHtml(String(value))}</div>
    </div>
  `;
}

function renderGearPanel(character) {
  const linkedText = character.campaign?.code
    ? `Campaign ${character.campaign.code}`
    : "Not linked to a campaign";

  return `
    <section class="utility-panel gear-panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Equipment surface</p>
          <h2>Gear Cards</h2>
        </div>
        <span class="section-caption">Reserved for inventory cards and item detail views.</span>
      </div>
      <div class="gear-placeholder">
        <div class="gear-placeholder-card">
          <p class="eyebrow">Status</p>
          <h3>${escapeHtml(linkedText)}</h3>
          <p>
            The right-side display is intentionally blank until we define your equipment card language and
            campaign-connected inventory rules.
          </p>
        </div>
      </div>
    </section>
  `;
}

function renderModal() {
  if (!state.ui.activeModal) {
    return "";
  }

  const { type, payload } = state.ui.activeModal;

  if (type === "create-character") {
    const preventClose = !state.characters.length;
    return renderModalShell(
      "Create Character",
      "Start with a name and the profile silhouette for the sheet icon.",
      `
        <form class="modal-form" data-form="create-character">
          <label>
            <span>Character Name</span>
            <input type="text" name="name" maxlength="48" placeholder="Rhea Sol, Idris Vale..." required />
          </label>
          <label>
            <span>Profile Icon</span>
            <select name="avatar">
              ${AVATAR_OPTIONS.map(
                (option) => `<option value="${option.value}">${escapeHtml(option.label)}</option>`
              ).join("")}
            </select>
          </label>
          <div class="modal-actions">
            ${preventClose ? "" : `<button class="secondary-button" data-action="close-modal" type="button">Cancel</button>`}
            <button class="primary-button" type="submit">Create Operative</button>
          </div>
        </form>
      `,
      { preventClose }
    );
  }

  if (type === "link-campaign") {
    const current = getActiveCharacter();
    return renderModalShell(
      "Link to Campaign",
      "Store the code now so this character is ready when the VTT layer comes online.",
      `
        <form class="modal-form" data-form="link-campaign">
          <label>
            <span>VTT Space</span>
            <input
              type="text"
              name="space"
              maxlength="40"
              placeholder="Foundry, Roll20, Discord table..."
              value="${escapeAttribute(current?.campaign?.space || "")}"
            />
          </label>
          <label>
            <span>Campaign Code</span>
            <input
              type="text"
              name="code"
              maxlength="40"
              placeholder="GM supplied code"
              value="${escapeAttribute(current?.campaign?.code || "")}"
              required
            />
          </label>
          <div class="modal-actions">
            ${
              current?.campaign?.code
                ? `<button class="secondary-button" data-action="unlink-campaign" type="button">Clear Link</button>`
                : `<span></span>`
            }
            <button class="primary-button" type="submit">Save Link</button>
          </div>
        </form>
      `
    );
  }

  if (type === "confirm-delete") {
    const current = getActiveCharacter();
    return renderModalShell(
      "Delete Character",
      "This removes the currently selected saved character from local storage.",
      `
        <div class="modal-stack">
          <p>
            Are you sure you want to delete <strong>${escapeHtml(current?.name || "this character")}</strong>?
          </p>
          <div class="modal-actions">
            <button class="secondary-button" data-action="close-modal" type="button">Cancel</button>
            <button class="danger-button" data-action="confirm-delete-character" type="button">Delete Permanently</button>
          </div>
        </div>
      `
    );
  }

  if (type === "share-character") {
    const current = getActiveCharacter();
    const sharePayload = buildSharePayload(current);
    return renderModalShell(
      "Share Character",
      "Use the portable code anywhere, or the link once this app is hosted.",
      `
        <div class="modal-stack">
          <label>
            <span>Portable Share Code</span>
            <textarea rows="5" readonly>${escapeHtml(sharePayload.code)}</textarea>
          </label>
          <div class="modal-actions modal-actions-tight">
            <button class="secondary-button" data-action="copy-share-code" data-copy-value="${escapeAttribute(
              sharePayload.code
            )}" type="button">Copy Code</button>
          </div>
          <label>
            <span>Hosted Share Link</span>
            <textarea rows="3" readonly>${escapeHtml(sharePayload.link || "Serve this app over HTTP to generate a shareable link.")}</textarea>
          </label>
          <div class="modal-actions modal-actions-tight">
            <button
              class="secondary-button"
              data-action="copy-share-link"
              data-copy-value="${escapeAttribute(sharePayload.link || "")}"
              type="button"
              ${sharePayload.link ? "" : "disabled"}
            >
              Copy Link
            </button>
            <button class="primary-button" data-action="close-modal" type="button">Done</button>
          </div>
        </div>
      `
    );
  }

  if (type === "build-roll") {
    const current = getActiveCharacter();
    const attributeOptions = SECTION_TEMPLATES.flatMap((section) =>
      current.sections[section.id].attributes.map((attribute, index) => ({
        value: `${section.id}:${index}`,
        label: `${section.title} · ${attribute.label} (${attribute.score} / ${formatDiceNotation(scoreToDice(attribute.score))})`,
      }))
    );
    const skillOptions = SECTION_TEMPLATES.flatMap((section) =>
      current.sections[section.id].skills.map((skill, index) => ({
        value: `${section.id}:${index}`,
        label: `${section.title} · ${skill.label} (+${skill.value})`,
      }))
    );

    return renderModalShell(
      "Build Roll",
      "Pick an attribute, then layer on one skill, any number of specializations, and an optional situational bonus.",
      `
        <form class="modal-form" data-form="build-roll">
          <label>
            <span>Attribute</span>
            <select name="attributeRef" required>
              ${attributeOptions.map((option) => `<option value="${option.value}">${escapeHtml(option.label)}</option>`).join("")}
            </select>
          </label>
          <label>
            <span>Skill</span>
            <select name="skillRef" required>
              ${skillOptions.map((option) => `<option value="${option.value}">${escapeHtml(option.label)}</option>`).join("")}
            </select>
          </label>
          <label>
            <span>Situational Bonus</span>
            <input type="number" name="situationalBonus" min="-100" max="100" value="0" />
          </label>
          <fieldset class="checkbox-grid">
            <legend>Optional Specializations</legend>
            ${current.specializations
              .map(
                (specialization, index) => `
                  <label class="check-row">
                    <input type="checkbox" name="specialization" value="${index}" ${
                      specialization.value === 0 ? "disabled" : ""
                    } />
                    <span>${escapeHtml(specialization.name || `Specialization ${index + 1}`)} (+${specialization.value})</span>
                  </label>
                `
              )
              .join("")}
          </fieldset>
          <div class="modal-actions">
            <button class="secondary-button" data-action="close-modal" type="button">Cancel</button>
            <button class="primary-button" type="submit">Roll</button>
          </div>
        </form>
      `
    );
  }

  if (type === "custom-roll") {
    return renderModalShell(
      "Custom Roll",
      "Type any dice notation set such as 2d6 + 5 or 1d8 + 1d10 + 12.",
      `
        <form class="modal-form" data-form="custom-roll">
          <label>
            <span>Label</span>
            <input type="text" name="label" maxlength="48" placeholder="Manual check, weapon test..." />
          </label>
          <label>
            <span>Dice Formula</span>
            <input type="text" name="formula" maxlength="60" placeholder="1d8 + 1d10 + 12" required />
          </label>
          <div class="modal-actions">
            <button class="secondary-button" data-action="close-modal" type="button">Cancel</button>
            <button class="primary-button" type="submit">Roll Formula</button>
          </div>
        </form>
      `
    );
  }

  if (type === "import-modal") {
    return renderModalShell(
      "Import Share Code",
      "Paste a portable code from another character export to save it locally.",
      `
        <form class="modal-form" data-form="import-code">
          <label>
            <span>Share Code</span>
            <textarea rows="6" name="shareCode" placeholder="Paste exported code here." required></textarea>
          </label>
          <div class="modal-actions">
            <button class="secondary-button" data-action="close-modal" type="button">Cancel</button>
            <button class="primary-button" type="submit">Import Character</button>
          </div>
        </form>
      `
    );
  }

  if (type === "import-shared") {
    const imported = payload;
    return renderModalShell(
      "Import Shared Character",
      "This character arrived from a shared link or code. Save it as a new local copy?",
      `
        <div class="modal-stack">
          <p><strong>${escapeHtml(imported.name)}</strong> will be imported into your local character list.</p>
          <div class="modal-actions">
            <button class="secondary-button" data-action="dismiss-shared-import" type="button">Not Now</button>
            <button class="primary-button" data-action="confirm-import-shared" type="button">Save Copy</button>
          </div>
        </div>
      `
    );
  }

  return "";
}

function renderModalShell(title, subtitle, body, options = {}) {
  return `
    <div class="modal-backdrop" data-action="${options.preventClose ? "" : "close-modal"}">
      <section class="modal-card" aria-modal="true" role="dialog" onclick="event.stopPropagation()">
        <div class="modal-header">
          <div>
            <h2>${escapeHtml(title)}</h2>
            <p>${escapeHtml(subtitle)}</p>
          </div>
          ${
            options.preventClose
              ? ""
              : `<button class="icon-button" data-action="close-modal" type="button" aria-label="Close dialog">×</button>`
          }
        </div>
        ${body}
      </section>
    </div>
  `;
}

function renderToast() {
  if (!state.ui.toast) {
    return "";
  }

  return `<div class="toast">${escapeHtml(state.ui.toast)}</div>`;
}

function handleClick(event) {
  const actionTarget = event.target.closest("[data-action]");

  if (!actionTarget) {
    if (state.ui.isCharacterMenuOpen && !event.target.closest(".toolbar-dropdown")) {
      state.ui.isCharacterMenuOpen = false;
      renderApp();
    }
    return;
  }

  const action = actionTarget.dataset.action;

  if (action === "toggle-character-menu") {
    state.ui.isCharacterMenuOpen = !state.ui.isCharacterMenuOpen;
    renderApp();
    return;
  }

  if (action === "open-create-modal") {
    state.ui.activeModal = { type: "create-character" };
    state.ui.isCharacterMenuOpen = false;
    renderApp();
    return;
  }

  if (action === "open-import-modal") {
    state.ui.activeModal = { type: "import-modal" };
    state.ui.isCharacterMenuOpen = false;
    renderApp();
    return;
  }

  if (action === "select-character") {
    state.ui.activeCharacterId = actionTarget.dataset.characterId;
    state.ui.isCharacterMenuOpen = false;
    persistState();
    renderApp();
    return;
  }

  if (action === "toggle-edit-mode") {
    state.ui.editMode = !state.ui.editMode;
    showToast(state.ui.editMode ? "Edit mode enabled." : "Edit mode locked.");
    renderApp();
    return;
  }

  if (action === "save-character") {
    persistState();
    showToast("Character data saved locally.");
    renderApp();
    return;
  }

  if (action === "open-share-modal") {
    state.ui.activeModal = { type: "share-character" };
    renderApp();
    return;
  }

  if (action === "open-link-modal") {
    state.ui.activeModal = { type: "link-campaign" };
    renderApp();
    return;
  }

  if (action === "unlink-campaign") {
    updateCurrentCharacter((character) => {
      character.campaign = { space: "", code: "" };
    });
    state.ui.activeModal = null;
    showToast("Campaign link cleared.");
    renderApp();
    return;
  }

  if (action === "open-delete-modal") {
    state.ui.activeModal = { type: "confirm-delete" };
    renderApp();
    return;
  }

  if (action === "confirm-delete-character") {
    deleteCurrentCharacter();
    return;
  }

  if (action === "switch-view") {
    const view = actionTarget.dataset.view;
    if (view === "world") {
      showToast("World view will unlock once the VTT layer exists.");
      return;
    }
    state.ui.activeView = view;
    renderApp();
    return;
  }

  if (action === "open-builder-modal") {
    state.ui.activeModal = { type: "build-roll" };
    renderApp();
    return;
  }

  if (action === "copy-share-code" || action === "copy-share-link") {
    const value = actionTarget.dataset.copyValue;
    if (!value) {
      showToast("A hosted link is only available when this app is served over HTTP.");
      renderApp();
      return;
    }
    copyText(value)
      .then(() => {
        showToast(action === "copy-share-code" ? "Share code copied." : "Share link copied.");
        renderApp();
      })
      .catch(() => {
        showToast("Clipboard access was blocked. You can still copy the text manually.");
        renderApp();
      });
    return;
  }

  if (action === "confirm-import-shared") {
    const payload = state.ui.activeModal?.payload;
    if (payload) {
      importCharacter(payload);
    }
    return;
  }

  if (action === "dismiss-shared-import") {
    clearShareParam();
    state.ui.activeModal = state.characters.length ? null : { type: "create-character" };
    renderApp();
    return;
  }

  if (action === "close-modal") {
    closeModal();
  }
}

function handleChange(event) {
  const input = event.target.closest("[data-input]");
  if (!input) {
    return;
  }

  updateCurrentCharacter((character) => {
    const { input: inputType, section, index } = input.dataset;

    if (inputType === "health-current") {
      character.sections[section].health.current = clampNumber(input.value, 0, getSectionMax(character.sections[section]));
      return;
    }

    if (inputType === "attribute-score") {
      character.sections[section].attributes[Number(index)].score = clampNumber(input.value, 4, 12);
      return;
    }

    if (inputType === "attribute-subvalue") {
      character.sections[section].attributes[Number(index)].subValue = input.value.trim();
      return;
    }

    if (inputType === "skill-value") {
      character.sections[section].skills[Number(index)].value = clampNumber(input.value, 0, 100);
      return;
    }

    if (inputType === "specialization-name") {
      character.specializations[Number(index)].name = input.value.trim();
      return;
    }

    if (inputType === "specialization-value") {
      character.specializations[Number(index)].value = clampNumber(input.value, 0, 100);
    }
  });

  renderApp();
}

function handleSubmit(event) {
  const form = event.target.closest("[data-form]");
  if (!form) {
    return;
  }

  event.preventDefault();
  const formData = new FormData(form);
  const formName = form.dataset.form;

  if (formName === "create-character") {
    const name = String(formData.get("name") || "").trim();
    const avatar = String(formData.get("avatar") || "neutral");

    if (!name) {
      showToast("Character name is required.");
      renderApp();
      return;
    }

    const character = createCharacter(name, avatar);
    state.characters.unshift(character);
    state.ui.activeCharacterId = character.id;
    state.ui.editMode = true;
    state.ui.activeModal = null;
    state.ui.activeView = "sheet";
    persistState();
    showToast(`${name} created.`);
    renderApp();
    return;
  }

  if (formName === "link-campaign") {
    const space = String(formData.get("space") || "").trim();
    const code = String(formData.get("code") || "").trim();

    updateCurrentCharacter((character) => {
      character.campaign = { space, code };
    });

    state.ui.activeModal = null;
    showToast(code ? `Campaign linked to ${code}.` : "Campaign link saved.");
    renderApp();
    return;
  }

  if (formName === "build-roll") {
    const attributeRef = String(formData.get("attributeRef"));
    const skillRef = String(formData.get("skillRef"));
    const situationalBonus = clampNumber(formData.get("situationalBonus"), -100, 100);
    const specializationIndexes = formData.getAll("specialization").map((value) => Number(value));
    const roll = buildCharacterRoll(attributeRef, skillRef, specializationIndexes, situationalBonus);

      if (!roll) {
        showToast("Roll configuration could not be resolved.");
        renderApp();
        return;
      }

      state.ui.activeModal = null;
      finalizeRoll(roll);
      return;
    }

  if (formName === "custom-roll") {
    const label = String(formData.get("label") || "").trim() || "Custom Roll";
    const formula = String(formData.get("formula") || "").trim();

    try {
      const parsed = parseDiceFormula(formula);
      const roll = executeRoll({
        label,
        notation: parsed.notation,
        diceSides: parsed.diceSides,
        flatBonus: parsed.flatBonus,
        bonusParts: parsed.flatBonus ? [`Formula bonus ${formatSigned(parsed.flatBonus)}`] : [],
      });
      state.ui.activeModal = null;
      finalizeRoll(roll);
      return;
    } catch (error) {
      showToast(error.message);
      renderApp();
      return;
    }
  }

  if (formName === "import-code") {
    const shareCode = String(formData.get("shareCode") || "").trim();

    try {
      const character = parseShareCode(shareCode);
      importCharacter(character);
      return;
    } catch (error) {
      showToast(error.message);
      renderApp();
      return;
    }
  }
}

function handleContextMenu(event) {
  if (!event.target.closest(".roll-button")) {
    return;
  }
  event.preventDefault();
  state.ui.activeModal = { type: "custom-roll" };
  renderApp();
}

function handleKeydown(event) {
  if (event.key === "Escape" && state.ui.activeModal) {
    closeModal();
  }
}

function buildCharacterRoll(attributeRef, skillRef, specializationIndexes, situationalBonus) {
  const character = getActiveCharacter();
  if (!character) {
    return null;
  }

  const [attributeSectionId, attributeIndex] = attributeRef.split(":");
  const [skillSectionId, skillIndex] = skillRef.split(":");
  const attribute = character.sections[attributeSectionId]?.attributes?.[Number(attributeIndex)];
  const skill = character.sections[skillSectionId]?.skills?.[Number(skillIndex)];

  if (!attribute || !skill) {
    return null;
  }

  const selectedSpecializations = specializationIndexes
    .map((index) => character.specializations[index])
    .filter(Boolean);
  const skillBonus = skill.value;
  const specializationBonus = selectedSpecializations.reduce((total, specialization) => total + specialization.value, 0);
  const bonusParts = [`${skill.label} ${formatSigned(skillBonus)}`];

  if (specializationBonus) {
    selectedSpecializations.forEach((specialization) => {
      bonusParts.push(`${specialization.name || "Specialization"} ${formatSigned(specialization.value)}`);
    });
  }

  if (situationalBonus) {
    bonusParts.push(`Situational ${formatSigned(situationalBonus)}`);
  }

  return executeRoll({
    label: `${attribute.label} + ${skill.label}`,
    notation: formatDiceNotation(scoreToDice(attribute.score)),
    diceSides: scoreToDice(attribute.score),
    flatBonus: skillBonus + specializationBonus + situationalBonus,
    bonusParts,
  });
}

function executeRoll({ label, notation, diceSides, flatBonus = 0, bonusParts = [] }) {
  const results = diceSides.map((sides) => randomInt(1, sides));
  const orderedResults = [...results].sort((a, b) => b - a);
  const base = Number(orderedResults.join(""));
  let criticalBonus = 0;
  let criticalLabel = "";

  if (results.length === 2) {
    if (orderedResults[0] === 2 && orderedResults[1] === 1) {
      criticalBonus = 100;
      criticalLabel = "21 surge +100";
    } else if (results[0] === results[1]) {
      criticalBonus = 50;
      criticalLabel = "Double match +50";
    }
  }

  const total = base + criticalBonus + flatBonus;
  const detailParts = [`${notation} → ${orderedResults.join(" / ")}`, `Base ${base}`];

  if (criticalLabel) {
    detailParts.push(criticalLabel);
  }

  if (bonusParts.length) {
    detailParts.push(bonusParts.join(" • "));
  }

  if (flatBonus && !bonusParts.length) {
    detailParts.push(`Bonus ${formatSigned(flatBonus)}`);
  }

  return {
    id: createId(),
    label,
    notation,
    diceSides,
    results,
    orderedResults,
    base,
    criticalBonus,
    criticalLabel,
    flatBonus,
    total,
    breakdown: detailParts.join(" • "),
    createdAt: new Date().toISOString(),
  };
}

function finalizeRoll(roll) {
  state.ui.lastRoll = roll;
  state.ui.rollHistory = [roll, ...state.ui.rollHistory].slice(0, 6);
  state.ui.isRolling = true;
  renderApp();
  window.setTimeout(() => {
    state.ui.isRolling = false;
    renderApp();
  }, 950);
}

function parseDiceFormula(formula) {
  const cleaned = formula.replace(/\s+/g, "").toLowerCase();

  if (!cleaned) {
    throw new Error("Enter a dice formula first.");
  }

  const tokens = cleaned.match(/[+-]?[^+-]+/g);
  if (!tokens) {
    throw new Error("Dice formula could not be read.");
  }

  const diceSides = [];
  let flatBonus = 0;

  tokens.forEach((token) => {
    if (token.includes("d")) {
      const match = token.match(/^([+-]?)(\d*)d(\d+)$/);
      if (!match) {
        throw new Error(`Could not parse dice group "${token}".`);
      }
      const sign = match[1] || "+";
      if (sign === "-") {
        throw new Error("Negative dice groups are not supported.");
      }
      const count = Number(match[2] || 1);
      const sides = Number(match[3]);
      if (count < 1 || count > 10 || sides < 2 || sides > 100) {
        throw new Error("Use 1-10 dice with 2-100 sides.");
      }
      for (let i = 0; i < count; i += 1) {
        diceSides.push(sides);
      }
      return;
    }

    const numeric = Number(token);
    if (!Number.isFinite(numeric)) {
      throw new Error(`Could not parse modifier "${token}".`);
    }
    flatBonus += numeric;
  });

  if (!diceSides.length) {
    throw new Error("At least one dice group is required.");
  }

  return {
    notation: cleaned.replace(/\+/g, " + ").replace(/-/g, " - "),
    diceSides,
    flatBonus,
  };
}

function createCharacter(name, avatar = "neutral") {
  const character = {
    id: createId(),
    name,
    avatar,
    campaign: { space: "", code: "" },
    sections: {},
    specializations: Array.from({ length: MAX_SPECIALIZATIONS }, (_, index) => ({
      id: createId(),
      name: `Specialization ${index + 1}`,
      value: 0,
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  SECTION_TEMPLATES.forEach((section) => {
    character.sections[section.id] = {
      health: { current: 24 },
      attributes: section.attributes.map((attribute) => ({
        ...attribute,
        score: 8,
        subValue: "",
      })),
      skills: section.skills.map((skill) => ({
        key: slugify(skill),
        label: skill,
        value: 0,
      })),
    };
  });

  return normalizeCharacter(character);
}

function normalizeCharacter(rawCharacter) {
  const base = createCharacterSkeleton(rawCharacter?.name || "Untitled Operative", rawCharacter?.avatar || "neutral");
  base.id = rawCharacter?.id || base.id;
  base.campaign = {
    space: String(rawCharacter?.campaign?.space || ""),
    code: String(rawCharacter?.campaign?.code || ""),
  };
  base.createdAt = rawCharacter?.createdAt || base.createdAt;
  base.updatedAt = rawCharacter?.updatedAt || base.updatedAt;

  SECTION_TEMPLATES.forEach((section) => {
    const sourceSection = rawCharacter?.sections?.[section.id];
    base.sections[section.id].attributes = section.attributes.map((attribute, index) => ({
      ...attribute,
      score: clampNumber(sourceSection?.attributes?.[index]?.score ?? 8, 4, 12),
      subValue: String(sourceSection?.attributes?.[index]?.subValue || ""),
    }));
    base.sections[section.id].skills = section.skills.map((skill, index) => ({
      key: slugify(skill),
      label: skill,
      value: clampNumber(sourceSection?.skills?.[index]?.value ?? 0, 0, 100),
    }));
    const maxHealth = getSectionMax(base.sections[section.id]);
    base.sections[section.id].health.current = clampNumber(sourceSection?.health?.current ?? maxHealth, 0, maxHealth);
  });

  base.specializations = Array.from({ length: MAX_SPECIALIZATIONS }, (_, index) => ({
    id: rawCharacter?.specializations?.[index]?.id || createId(),
    name: String(rawCharacter?.specializations?.[index]?.name || `Specialization ${index + 1}`),
    value: clampNumber(rawCharacter?.specializations?.[index]?.value ?? 0, 0, 100),
  }));

  return base;
}

function createCharacterSkeleton(name, avatar) {
  const skeleton = {
    id: createId(),
    name,
    avatar,
    campaign: { space: "", code: "" },
    sections: {},
    specializations: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  SECTION_TEMPLATES.forEach((section) => {
    skeleton.sections[section.id] = {
      health: { current: 24 },
      attributes: section.attributes.map((attribute) => ({
        ...attribute,
        score: 8,
        subValue: "",
      })),
      skills: section.skills.map((skill) => ({
        key: slugify(skill),
        label: skill,
        value: 0,
      })),
    };
  });

  return skeleton;
}

function getActiveCharacter() {
  return state.characters.find((character) => character.id === state.ui.activeCharacterId) || null;
}

function updateCurrentCharacter(mutator) {
  const index = state.characters.findIndex((character) => character.id === state.ui.activeCharacterId);
  if (index === -1) {
    return;
  }

  const workingCopy = normalizeCharacter(state.characters[index]);
  mutator(workingCopy);
  workingCopy.updatedAt = new Date().toISOString();
  state.characters[index] = normalizeCharacter(workingCopy);
  persistState();
}

function deleteCurrentCharacter() {
  if (!state.ui.activeCharacterId) {
    return;
  }

  state.characters = state.characters.filter((character) => character.id !== state.ui.activeCharacterId);
  state.ui.activeCharacterId = state.characters[0]?.id ?? null;
  state.ui.activeModal = state.characters.length ? null : { type: "create-character" };
  persistState();
  showToast("Character deleted.");
  renderApp();
}

function importCharacter(sharedCharacter) {
  const imported = normalizeCharacter(sharedCharacter);
  imported.id = createId();
  imported.updatedAt = new Date().toISOString();
  imported.createdAt = imported.createdAt || imported.updatedAt;

  state.characters.unshift(imported);
  state.ui.activeCharacterId = imported.id;
  state.ui.activeModal = null;
  state.ui.activeView = "sheet";
  state.ui.editMode = false;
  clearShareParam();
  persistState();
  showToast(`${imported.name} imported.`);
  renderApp();
}

function loadStoredState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { characters: [], activeCharacterId: null };
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.characters)) {
      return { characters: [], activeCharacterId: null };
    }
    return {
      characters: parsed.characters.map((character) => normalizeCharacter(character)),
      activeCharacterId: parsed.activeCharacterId || null,
    };
  } catch {
    return { characters: [], activeCharacterId: null };
  }
}

function persistState() {
  const payload = {
    activeCharacterId: state.ui.activeCharacterId,
    characters: state.characters.map((character) => normalizeCharacter(character)),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function buildSharePayload(character) {
  const normalized = normalizeCharacter(character);
  const code = encodeShareCode({ version: 1, character: normalized });
  const url = new URL(window.location.href);
  url.searchParams.set("share", code);
  const isHosted = url.protocol === "http:" || url.protocol === "https:";

  return {
    code,
    link: isHosted ? url.toString() : "",
  };
}

function parseSharedCharacterFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const share = params.get("share");
  if (!share) {
    return null;
  }

  try {
    return parseShareCode(share);
  } catch {
    clearShareParam();
    return null;
  }
}

function parseShareCode(code) {
  try {
    const decoded = decodeShareCode(code);
    const parsed = JSON.parse(decoded);
    if (!parsed?.character) {
      throw new Error("This share code is missing character data.");
    }
    return normalizeCharacter(parsed.character);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("That share code could not be imported.");
  }
}

function clearShareParam() {
  const url = new URL(window.location.href);
  url.searchParams.delete("share");
  window.history.replaceState({}, "", url.toString());
}

function scoreToDice(score) {
  const normalized = clampNumber(score, 4, 12);
  if (normalized % 2 === 0) {
    return [normalized, normalized];
  }
  return [normalized - 1, normalized + 1];
}

function formatDiceNotation(diceSides) {
  const grouped = diceSides.reduce((accumulator, sides) => {
    accumulator[sides] = (accumulator[sides] || 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(grouped)
    .sort((left, right) => Number(left[0]) - Number(right[0]))
    .map(([sides, count]) => `${count}d${sides}`)
    .join(" + ");
}

function getSectionMax(section) {
  return section.attributes.reduce((total, attribute) => total + attribute.score, 0);
}

function clampNumber(value, minimum, maximum) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return minimum;
  }
  return Math.min(maximum, Math.max(minimum, numeric));
}

function randomInt(minimum, maximum) {
  return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function createId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `empyrean-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function formatUpdatedAt(value) {
  if (!value) {
    return "Recently saved";
  }
  return `Updated ${new Date(value).toLocaleDateString([], { month: "short", day: "numeric" })}`;
}

function formatSigned(value) {
  return value >= 0 ? `+${value}` : `${value}`;
}

function showToast(message) {
  state.ui.toast = message;
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    state.ui.toast = null;
    renderApp();
  }, 2800);
}

function closeModal() {
  if (!state.characters.length) {
    return;
  }
  state.ui.activeModal = null;
  renderApp();
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(value);
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function encodeShareCode(payload) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return window.btoa(binary);
}

function decodeShareCode(code) {
  const binary = window.atob(code);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("\n", "&#10;");
}

function iconFolder() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 7.5h6l1.6 2H21v7.7A2.8 2.8 0 0 1 18.2 20H5.8A2.8 2.8 0 0 1 3 17.2Z"></path>
      <path d="M3 7.3A2.3 2.3 0 0 1 5.3 5h3.9l1.4 1.7H21"></path>
    </svg>
  `;
}

function iconLock(isUnlocked) {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      ${
        isUnlocked
          ? `<path d="M8 11V8.8A4.1 4.1 0 0 1 16.2 8"></path><rect x="5" y="11" width="14" height="9" rx="2"></rect>`
          : `<path d="M8 11V8a4 4 0 1 1 8 0v3"></path><rect x="5" y="11" width="14" height="9" rx="2"></rect>`
      }
    </svg>
  `;
}

function iconSave() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 4h11l3 3v13H5z"></path>
      <path d="M8 4v6h8V4"></path>
      <path d="M8 18h8"></path>
    </svg>
  `;
}

function iconShare() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="18" cy="5" r="2.5"></circle>
      <circle cx="6" cy="12" r="2.5"></circle>
      <circle cx="18" cy="19" r="2.5"></circle>
      <path d="M8.2 11l7-4.5"></path>
      <path d="M8.2 13l7 4.3"></path>
    </svg>
  `;
}

function iconLink() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9.2 14.8 6.9 17a3 3 0 0 1-4.2-4.2L5 10.5"></path>
      <path d="m14.8 9.2 2.3-2.2a3 3 0 1 1 4.2 4.2L19 13.5"></path>
      <path d="m8 16 8-8"></path>
    </svg>
  `;
}

function iconTrash() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16"></path>
      <path d="M9 7V4h6v3"></path>
      <path d="M7 7l1 12h8l1-12"></path>
    </svg>
  `;
}

function iconAvatar(type) {
  if (type === "female") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="5.5" r="3"></circle>
        <path d="M12 8.8 8.5 14h2.8v5h1.4v-5H15z"></path>
        <path d="M10 19h4"></path>
      </svg>
    `;
  }

  if (type === "male") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="5.5" r="3"></circle>
        <path d="M12 8.8v4.2"></path>
        <path d="M9.3 19 12 13l2.7 6"></path>
        <path d="M8.3 11.5 12 9.4l3.7 2.1"></path>
      </svg>
    `;
  }

  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="5.5" r="3"></circle>
      <path d="M12 8.8v6.2"></path>
      <path d="M9 12h6"></path>
      <path d="M10 19l2-4 2 4"></path>
    </svg>
  `;
}

function iconBackpack() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.5 7.5V6a3.5 3.5 0 0 1 7 0v1.5"></path>
      <path d="M6.3 8.5h11.4A2.3 2.3 0 0 1 20 10.8v8.4a2.3 2.3 0 0 1-2.3 2.3H6.3A2.3 2.3 0 0 1 4 19.2v-8.4a2.3 2.3 0 0 1 2.3-2.3Z"></path>
      <path d="M9 13h6"></path>
    </svg>
  `;
}

function iconWorld() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8"></circle>
      <path d="M4.5 12h15"></path>
      <path d="M12 4a13.5 13.5 0 0 1 0 16"></path>
      <path d="M12 4a13.5 13.5 0 0 0 0 16"></path>
    </svg>
  `;
}

function renderPrimaryView(character) {
  if (state.ui.activeView === "inventory") {
    return renderInventoryView(character);
  }

  if (state.ui.activeView === "world") {
    return renderWorldPlaceholder(character);
  }

  return `
    <div class="sheet-grid">
      ${SECTION_TEMPLATES.map((section) => renderSectionBlock(character, section)).join("")}
    </div>
    <section class="specializations-panel">
      <div class="section-heading section-heading-compact">
        <div>
          <p class="eyebrow">Applied Bonuses</p>
          <h2>Specializations</h2>
        </div>
        <span class="section-caption">Eight quick bonus slots across the bottom edge.</span>
      </div>
      <div class="specialization-strip">
        ${character.specializations
          .map(
            (specialization, index) => `
              <label class="specialization-chip">
                <span>${getSpecializationLabel(index)}</span>
                <input
                  type="number"
                  data-input="specialization-value"
                  data-index="${index}"
                  min="0"
                  max="100"
                  value="${specialization.value}"
                  ${state.ui.editMode ? "" : "disabled"}
                />
              </label>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderSectionBlock(character, sectionTemplate) {
  const section = character.sections[sectionTemplate.id];
  const maxHealth = getSectionMax(section);

  return `
    <section class="stat-block stat-block-${sectionTemplate.tone}">
      <div class="section-heading section-heading-tight">
        <div>
          <p class="eyebrow">${sectionTemplate.healthLabel} and core traits</p>
          <h2>${sectionTemplate.title}</h2>
        </div>
        <div class="health-module">
          <span>${sectionTemplate.healthLabel}</span>
          <div class="health-values">
            <input
              type="number"
              data-input="health-current"
              data-section="${sectionTemplate.id}"
              min="0"
              max="${maxHealth}"
              value="${section.health.current}"
              ${state.ui.editMode ? "" : "disabled"}
            />
            <span>/ ${maxHealth}</span>
          </div>
        </div>
      </div>
      <div class="attribute-strip">
        ${section.attributes
          .map((attribute, index) => renderAttributeCard(sectionTemplate, attribute, index))
          .join("")}
      </div>
      <div class="skills-grid">
        ${section.skills
          .map(
            (skill, index) => `
              <label class="skill-row">
                <span>${escapeHtml(skill.label)}</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  data-input="skill-value"
                  data-section="${sectionTemplate.id}"
                  data-index="${index}"
                  value="${skill.value}"
                  ${state.ui.editMode ? "" : "disabled"}
                />
              </label>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderAttributeCard(sectionTemplate, attribute, index) {
  const diceText = formatDiceNotation(scoreToDice(attribute.score));
  const detail = normalizeAttributeDetail(attribute.subValue);

  if (sectionTemplate.id === "body") {
    return `
      <article class="attribute-card attribute-card-compact">
        <div class="attribute-title-row">
          <div>
            <p class="eyebrow">${escapeHtml(attribute.label)}</p>
            <h3>${attribute.score} <span>(${escapeHtml(diceText)})</span></h3>
          </div>
          <select
            class="attribute-score-select"
            data-input="attribute-score"
            data-section="${sectionTemplate.id}"
            data-index="${index}"
            ${state.ui.editMode ? "" : "disabled"}
          >
            ${ATTRIBUTE_SCORES.map(
              (value) => `<option value="${value}" ${value === attribute.score ? "selected" : ""}>${value}</option>`
            ).join("")}
          </select>
        </div>
        <div class="attribute-support-readout">
          <span>${escapeHtml(attribute.subLabel)}</span>
          <strong>${getBodyDerivedValue(attribute)}</strong>
        </div>
      </article>
    `;
  }

  return `
    <article class="attribute-card attribute-card-compact">
      <div class="attribute-title-row">
        <div>
          <p class="eyebrow">${escapeHtml(attribute.label)}</p>
          <h3>${attribute.score} <span>(${escapeHtml(diceText)})</span></h3>
        </div>
        <select
          class="attribute-score-select"
          data-input="attribute-score"
          data-section="${sectionTemplate.id}"
          data-index="${index}"
          ${state.ui.editMode ? "" : "disabled"}
        >
          ${ATTRIBUTE_SCORES.map(
            (value) => `<option value="${value}" ${value === attribute.score ? "selected" : ""}>${value}</option>`
          ).join("")}
        </select>
      </div>
      <button
        class="attribute-detail-button ${detail.name ? "is-filled" : ""}"
        data-action="open-attribute-detail"
        data-section="${sectionTemplate.id}"
        data-index="${index}"
        type="button"
      >
        <span>${escapeHtml(detail.name || attribute.subLabel)}</span>
        <small>${escapeHtml(detail.description ? "Open ability text" : "Add name and ability")}</small>
      </button>
    </article>
  `;
}

function renderDicePanel(character) {
  const lastRoll = state.ui.lastRoll;

  return `
    <section class="utility-panel dice-panel">
      <div class="section-heading section-heading-tight">
        <div>
          <p class="eyebrow">Resolution engine</p>
          <h2>Dice Roller</h2>
        </div>
        <button
          class="icon-button history-button"
          data-action="open-roll-history"
          type="button"
          title="Open recent rolls"
          aria-label="Open recent rolls"
        >
          ${iconHistory()}
        </button>
      </div>
      <span class="section-caption">Left click to build a roll. Right click for a custom formula.</span>
      <button class="roll-button" data-action="open-builder-modal" type="button">
        <span class="roll-button-label">Roll</span>
        <span class="roll-button-note">Attribute + Skill + Specs + Bonus</span>
      </button>
      <div class="dice-stage ${state.ui.isRolling ? "is-rolling" : ""}">
        ${renderDie(lastRoll?.orderedResults?.[0] ?? "-", "a")}
        ${renderDie(lastRoll?.orderedResults?.[1] ?? "-", "b")}
      </div>
      <div class="roll-summary">
        ${
          lastRoll
            ? `
              <div class="summary-total">${lastRoll.total}</div>
              <div class="summary-meta">
                <p>${escapeHtml(lastRoll.label)}</p>
                <p>${escapeHtml(lastRoll.breakdown)}</p>
              </div>
            `
            : `
              <div class="summary-empty">
                <p>No roll yet.</p>
                <p>Your latest result lands here with critical and bonus math.</p>
              </div>
            `
        }
      </div>
    </section>
  `;
}

function renderModal() {
  if (!state.ui.activeModal) {
    return "";
  }

  const { type, payload } = state.ui.activeModal;

  if (type === "create-character") {
    const preventClose = !state.characters.length;
    return renderModalShell(
      "Create Character",
      "Start with a name and the profile silhouette for the sheet icon.",
      `
        <form class="modal-form" data-form="create-character">
          <label>
            <span>Character Name</span>
            <input type="text" name="name" maxlength="48" placeholder="Rhea Sol, Idris Vale..." required />
          </label>
          <label>
            <span>Profile Icon</span>
            <select name="avatar">
              ${AVATAR_OPTIONS.map(
                (option) => `<option value="${option.value}">${escapeHtml(option.label)}</option>`
              ).join("")}
            </select>
          </label>
          <div class="modal-actions">
            ${preventClose ? "" : `<button class="secondary-button" data-action="close-modal" type="button">Cancel</button>`}
            <button class="primary-button" type="submit">Create Operative</button>
          </div>
        </form>
      `,
      { preventClose }
    );
  }

  if (type === "link-campaign") {
    const current = getActiveCharacter();
    return renderModalShell(
      "Link to Campaign",
      "Store the code now so this character is ready when the VTT layer comes online.",
      `
        <form class="modal-form" data-form="link-campaign">
          <label>
            <span>VTT Space</span>
            <input
              type="text"
              name="space"
              maxlength="40"
              placeholder="Foundry, Roll20, Discord table..."
              value="${escapeAttribute(current?.campaign?.space || "")}"
            />
          </label>
          <label>
            <span>Campaign Code</span>
            <input
              type="text"
              name="code"
              maxlength="40"
              placeholder="GM supplied code"
              value="${escapeAttribute(current?.campaign?.code || "")}"
              required
            />
          </label>
          <div class="modal-actions">
            ${
              current?.campaign?.code
                ? `<button class="secondary-button" data-action="unlink-campaign" type="button">Clear Link</button>`
                : `<span></span>`
            }
            <button class="primary-button" type="submit">Save Link</button>
          </div>
        </form>
      `
    );
  }

  if (type === "confirm-delete") {
    const current = getActiveCharacter();
    return renderModalShell(
      "Delete Character",
      "This removes the currently selected saved character from local storage.",
      `
        <div class="modal-stack">
          <p>
            Are you sure you want to delete <strong>${escapeHtml(current?.name || "this character")}</strong>?
          </p>
          <div class="modal-actions">
            <button class="secondary-button" data-action="close-modal" type="button">Cancel</button>
            <button class="danger-button" data-action="confirm-delete-character" type="button">Delete Permanently</button>
          </div>
        </div>
      `
    );
  }

  if (type === "share-character") {
    const current = getActiveCharacter();
    const sharePayload = buildSharePayload(current);
    return renderModalShell(
      "Share Character",
      "Use the portable code anywhere, or the link once this app is hosted.",
      `
        <div class="modal-stack">
          <label>
            <span>Portable Share Code</span>
            <textarea rows="5" readonly>${escapeHtml(sharePayload.code)}</textarea>
          </label>
          <div class="modal-actions modal-actions-tight">
            <button class="secondary-button" data-action="copy-share-code" data-copy-value="${escapeAttribute(
              sharePayload.code
            )}" type="button">Copy Code</button>
          </div>
          <label>
            <span>Hosted Share Link</span>
            <textarea rows="3" readonly>${escapeHtml(sharePayload.link || "Serve this app over HTTP to generate a shareable link.")}</textarea>
          </label>
          <div class="modal-actions modal-actions-tight">
            <button
              class="secondary-button"
              data-action="copy-share-link"
              data-copy-value="${escapeAttribute(sharePayload.link || "")}"
              type="button"
              ${sharePayload.link ? "" : "disabled"}
            >
              Copy Link
            </button>
            <button class="primary-button" data-action="close-modal" type="button">Done</button>
          </div>
        </div>
      `
    );
  }

  if (type === "attribute-detail") {
    const current = getActiveCharacter();
    const sectionId = payload?.sectionId;
    const attributeIndex = Number(payload?.index);
    const sectionTemplate = SECTION_TEMPLATES.find((section) => section.id === sectionId);
    const attribute = current?.sections?.[sectionId]?.attributes?.[attributeIndex];

    if (!sectionTemplate || !attribute) {
      return "";
    }

    const detail = normalizeAttributeDetail(attribute.subValue);

    return renderModalShell(
      detail.name || attribute.subLabel,
      `Capture the name and ability text for ${attribute.label}.`,
      `
        <form class="modal-form" data-form="attribute-detail">
          <label>
            <span>Name</span>
            <input
              type="text"
              name="detailName"
              maxlength="48"
              value="${escapeAttribute(detail.name)}"
              placeholder="${escapeAttribute(attribute.subLabel)}"
              ${state.ui.editMode ? "" : "readonly"}
            />
          </label>
          <label>
            <span>Ability</span>
            <textarea
              rows="7"
              name="detailDescription"
              maxlength="600"
              placeholder="Write the ability text here."
              ${state.ui.editMode ? "" : "readonly"}
            >${escapeHtml(detail.description)}</textarea>
          </label>
          <div class="modal-actions">
            <button class="secondary-button" data-action="close-modal" type="button">Close</button>
            ${state.ui.editMode ? `<button class="primary-button" type="submit">Save Ability</button>` : ""}
          </div>
        </form>
      `
    );
  }

  if (type === "build-roll") {
    const current = getActiveCharacter();
    const attributeOptions = SECTION_TEMPLATES.flatMap((section) =>
      current.sections[section.id].attributes.map((attribute, index) => ({
        value: `${section.id}:${index}`,
        label: `${section.title} - ${attribute.label} (${attribute.score} / ${formatDiceNotation(scoreToDice(attribute.score))})`,
      }))
    );
    const skillOptions = SECTION_TEMPLATES.flatMap((section) =>
      current.sections[section.id].skills.map((skill, index) => ({
        value: `${section.id}:${index}`,
        label: `${section.title} - ${skill.label} (${formatSigned(skill.value)})`,
      }))
    );

    return renderModalShell(
      "Build Roll",
      "Pick an attribute, then layer on one skill, any number of specializations, and an optional situational bonus.",
      `
        <form class="modal-form" data-form="build-roll">
          <label>
            <span>Attribute</span>
            <select name="attributeRef" required>
              ${attributeOptions.map((option) => `<option value="${option.value}">${escapeHtml(option.label)}</option>`).join("")}
            </select>
          </label>
          <label>
            <span>Skill</span>
            <select name="skillRef" required>
              ${skillOptions.map((option) => `<option value="${option.value}">${escapeHtml(option.label)}</option>`).join("")}
            </select>
          </label>
          <label>
            <span>Situational Bonus</span>
            <input type="number" name="situationalBonus" min="-100" max="100" value="0" />
          </label>
          <fieldset class="checkbox-grid">
            <legend>Optional Specializations</legend>
            ${current.specializations
              .map(
                (specialization, index) => `
                  <label class="check-row">
                    <input type="checkbox" name="specialization" value="${index}" ${
                      specialization.value === 0 ? "disabled" : ""
                    } />
                    <span>${getSpecializationLabel(index)} (${formatSigned(specialization.value)})</span>
                  </label>
                `
              )
              .join("")}
          </fieldset>
          <div class="modal-actions">
            <button class="secondary-button" data-action="close-modal" type="button">Cancel</button>
            <button class="primary-button" type="submit">Roll</button>
          </div>
        </form>
      `
    );
  }

  if (type === "custom-roll") {
    return renderModalShell(
      "Custom Roll",
      "Type any dice notation set such as 2d6 + 5 or 1d8 + 1d10 + 12.",
      `
        <form class="modal-form" data-form="custom-roll">
          <label>
            <span>Label</span>
            <input type="text" name="label" maxlength="48" placeholder="Manual check, weapon test..." />
          </label>
          <label>
            <span>Dice Formula</span>
            <input type="text" name="formula" maxlength="60" placeholder="1d8 + 1d10 + 12" required />
          </label>
          <div class="modal-actions">
            <button class="secondary-button" data-action="close-modal" type="button">Cancel</button>
            <button class="primary-button" type="submit">Roll Formula</button>
          </div>
        </form>
      `
    );
  }

  if (type === "roll-history") {
    return renderModalShell(
      "Recent Rolls",
      "The last six results stay here for reference.",
      `
        <div class="modal-stack">
          <div class="roll-history modal-roll-history">
            ${
              state.ui.rollHistory.length
                ? state.ui.rollHistory
                    .map(
                      (entry) => `
                        <div class="history-row">
                          <div>
                            <strong>${escapeHtml(entry.label)}</strong>
                            <span>${escapeHtml(entry.breakdown)}</span>
                          </div>
                          <div class="history-total">${entry.total}</div>
                        </div>
                      `
                    )
                    .join("")
                : `<div class="history-empty">No recent rolls yet.</div>`
            }
          </div>
          <div class="modal-actions">
            <button class="primary-button" data-action="close-modal" type="button">Done</button>
          </div>
        </div>
      `
    );
  }

  if (type === "import-modal") {
    return renderModalShell(
      "Import Share Code",
      "Paste a portable code from another character export to save it locally.",
      `
        <form class="modal-form" data-form="import-code">
          <label>
            <span>Share Code</span>
            <textarea rows="6" name="shareCode" placeholder="Paste exported code here." required></textarea>
          </label>
          <div class="modal-actions">
            <button class="secondary-button" data-action="close-modal" type="button">Cancel</button>
            <button class="primary-button" type="submit">Import Character</button>
          </div>
        </form>
      `
    );
  }

  if (type === "import-shared") {
    const imported = payload;
    return renderModalShell(
      "Import Shared Character",
      "This character arrived from a shared link or code. Save it as a new local copy?",
      `
        <div class="modal-stack">
          <p><strong>${escapeHtml(imported.name)}</strong> will be imported into your local character list.</p>
          <div class="modal-actions">
            <button class="secondary-button" data-action="dismiss-shared-import" type="button">Not Now</button>
            <button class="primary-button" data-action="confirm-import-shared" type="button">Save Copy</button>
          </div>
        </div>
      `
    );
  }

  return "";
}

function renderModalShell(title, subtitle, body, options = {}) {
  return `
    <div class="modal-backdrop" ${options.preventClose ? "" : 'data-close-backdrop="true"'}>
      <section class="modal-card" aria-modal="true" role="dialog">
        <div class="modal-header">
          <div>
            <h2>${escapeHtml(title)}</h2>
            <p>${escapeHtml(subtitle)}</p>
          </div>
          ${
            options.preventClose
              ? ""
              : `<button class="icon-button" data-action="close-modal" type="button" aria-label="Close dialog">x</button>`
          }
        </div>
        ${body}
      </section>
    </div>
  `;
}

function handleClick(event) {
  const backdrop = event.target.closest(".modal-backdrop[data-close-backdrop='true']");
  if (backdrop && event.target === backdrop) {
    closeModal();
    return;
  }

  const actionTarget = event.target.closest("[data-action]");

  if (!actionTarget) {
    if (state.ui.isCharacterMenuOpen && !event.target.closest(".toolbar-dropdown")) {
      state.ui.isCharacterMenuOpen = false;
      renderApp();
    }
    return;
  }

  const action = actionTarget.dataset.action;

  if (action === "toggle-character-menu") {
    state.ui.isCharacterMenuOpen = !state.ui.isCharacterMenuOpen;
    renderApp();
    return;
  }

  if (action === "open-create-modal") {
    state.ui.activeModal = { type: "create-character" };
    state.ui.isCharacterMenuOpen = false;
    renderApp();
    return;
  }

  if (action === "open-import-modal") {
    state.ui.activeModal = { type: "import-modal" };
    state.ui.isCharacterMenuOpen = false;
    renderApp();
    return;
  }

  if (action === "select-character") {
    state.ui.activeCharacterId = actionTarget.dataset.characterId;
    state.ui.isCharacterMenuOpen = false;
    persistState();
    renderApp();
    return;
  }

  if (action === "toggle-edit-mode") {
    state.ui.editMode = !state.ui.editMode;
    showToast(state.ui.editMode ? "Edit mode enabled." : "Edit mode locked.");
    renderApp();
    return;
  }

  if (action === "save-character") {
    persistState();
    showToast("Character data saved locally.");
    renderApp();
    return;
  }

  if (action === "open-share-modal") {
    state.ui.activeModal = { type: "share-character" };
    renderApp();
    return;
  }

  if (action === "open-link-modal") {
    state.ui.activeModal = { type: "link-campaign" };
    renderApp();
    return;
  }

  if (action === "unlink-campaign") {
    updateCurrentCharacter((character) => {
      character.campaign = { space: "", code: "" };
    });
    state.ui.activeModal = null;
    showToast("Campaign link cleared.");
    renderApp();
    return;
  }

  if (action === "open-delete-modal") {
    state.ui.activeModal = { type: "confirm-delete" };
    renderApp();
    return;
  }

  if (action === "confirm-delete-character") {
    deleteCurrentCharacter();
    return;
  }

  if (action === "switch-view") {
    const view = actionTarget.dataset.view;
    if (view === "world") {
      showToast("World view will unlock once the VTT layer exists.");
      return;
    }
    state.ui.activeView = view;
    renderApp();
    return;
  }

  if (action === "open-attribute-detail") {
    state.ui.activeModal = {
      type: "attribute-detail",
      payload: {
        sectionId: actionTarget.dataset.section,
        index: Number(actionTarget.dataset.index),
      },
    };
    renderApp();
    return;
  }

  if (action === "open-builder-modal") {
    state.ui.activeModal = { type: "build-roll" };
    renderApp();
    return;
  }

  if (action === "open-roll-history") {
    state.ui.activeModal = { type: "roll-history" };
    renderApp();
    return;
  }

  if (action === "copy-share-code" || action === "copy-share-link") {
    const value = actionTarget.dataset.copyValue;
    if (!value) {
      showToast("A hosted link is only available when this app is served over HTTP.");
      renderApp();
      return;
    }
    copyText(value)
      .then(() => {
        showToast(action === "copy-share-code" ? "Share code copied." : "Share link copied.");
        renderApp();
      })
      .catch(() => {
        showToast("Clipboard access was blocked. You can still copy the text manually.");
        renderApp();
      });
    return;
  }

  if (action === "confirm-import-shared") {
    const sharedPayload = state.ui.activeModal?.payload;
    if (sharedPayload) {
      importCharacter(sharedPayload);
    }
    return;
  }

  if (action === "dismiss-shared-import") {
    clearShareParam();
    state.ui.activeModal = state.characters.length ? null : { type: "create-character" };
    renderApp();
    return;
  }

  if (action === "close-modal") {
    closeModal();
  }
}

function handleSubmit(event) {
  const form = event.target.closest("[data-form]");
  if (!form) {
    return;
  }

  event.preventDefault();
  const formData = new FormData(form);
  const formName = form.dataset.form;

  if (formName === "create-character") {
    const name = String(formData.get("name") || "").trim();
    const avatar = String(formData.get("avatar") || "neutral");

    if (!name) {
      showToast("Character name is required.");
      renderApp();
      return;
    }

    const character = createCharacter(name, avatar);
    state.characters.unshift(character);
    state.ui.activeCharacterId = character.id;
    state.ui.editMode = true;
    state.ui.activeModal = null;
    state.ui.activeView = "sheet";
    persistState();
    showToast(`${name} created.`);
    renderApp();
    return;
  }

  if (formName === "link-campaign") {
    const space = String(formData.get("space") || "").trim();
    const code = String(formData.get("code") || "").trim();

    updateCurrentCharacter((character) => {
      character.campaign = { space, code };
    });

    state.ui.activeModal = null;
    showToast(code ? `Campaign linked to ${code}.` : "Campaign link saved.");
    renderApp();
    return;
  }

  if (formName === "attribute-detail") {
    const payload = state.ui.activeModal?.payload;
    if (!payload) {
      closeModal();
      return;
    }

    const detailName = String(formData.get("detailName") || "").trim();
    const detailDescription = String(formData.get("detailDescription") || "").trim();

    updateCurrentCharacter((character) => {
      character.sections[payload.sectionId].attributes[payload.index].subValue = {
        name: detailName,
        description: detailDescription,
      };
    });

    state.ui.activeModal = null;
    showToast(`${detailName || "Ability"} saved.`);
    renderApp();
    return;
  }

  if (formName === "build-roll") {
    const attributeRef = String(formData.get("attributeRef"));
    const skillRef = String(formData.get("skillRef"));
    const situationalBonus = clampNumber(formData.get("situationalBonus"), -100, 100);
    const specializationIndexes = formData.getAll("specialization").map((value) => Number(value));
    const roll = buildCharacterRoll(attributeRef, skillRef, specializationIndexes, situationalBonus);

    if (!roll) {
      showToast("Roll configuration could not be resolved.");
      renderApp();
      return;
    }

    state.ui.activeModal = null;
    finalizeRoll(roll);
    return;
  }

  if (formName === "custom-roll") {
    const label = String(formData.get("label") || "").trim() || "Custom Roll";
    const formula = String(formData.get("formula") || "").trim();

    try {
      const parsed = parseDiceFormula(formula);
      const roll = executeRoll({
        label,
        notation: parsed.notation,
        diceSides: parsed.diceSides,
        flatBonus: parsed.flatBonus,
        bonusParts: parsed.flatBonus ? [`Formula bonus ${formatSigned(parsed.flatBonus)}`] : [],
      });
      state.ui.activeModal = null;
      finalizeRoll(roll);
      return;
    } catch (error) {
      showToast(error.message);
      renderApp();
      return;
    }
  }

  if (formName === "import-code") {
    const shareCode = String(formData.get("shareCode") || "").trim();

    try {
      const character = parseShareCode(shareCode);
      importCharacter(character);
      return;
    } catch (error) {
      showToast(error.message);
      renderApp();
      return;
    }
  }
}

function createCharacter(name, avatar = "neutral") {
  const character = {
    id: createId(),
    name,
    avatar,
    campaign: { space: "", code: "" },
    sections: {},
    specializations: Array.from({ length: MAX_SPECIALIZATIONS }, (_, index) => ({
      id: createId(),
      name: getSpecializationLabel(index),
      value: 0,
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  SECTION_TEMPLATES.forEach((section) => {
    character.sections[section.id] = {
      health: { current: 24 },
      attributes: section.attributes.map((attribute) => ({
        ...attribute,
        score: 8,
        subValue: { name: "", description: "" },
      })),
      skills: section.skills.map((skill) => ({
        key: slugify(skill),
        label: skill,
        value: 0,
      })),
    };
  });

  return normalizeCharacter(character);
}

function normalizeCharacter(rawCharacter) {
  const base = createCharacterSkeleton(rawCharacter?.name || "Untitled Operative", rawCharacter?.avatar || "neutral");
  base.id = rawCharacter?.id || base.id;
  base.campaign = {
    space: String(rawCharacter?.campaign?.space || ""),
    code: String(rawCharacter?.campaign?.code || ""),
  };
  base.createdAt = rawCharacter?.createdAt || base.createdAt;
  base.updatedAt = rawCharacter?.updatedAt || base.updatedAt;

  SECTION_TEMPLATES.forEach((section) => {
    const sourceSection = rawCharacter?.sections?.[section.id];
    base.sections[section.id].attributes = section.attributes.map((attribute, index) => ({
      ...attribute,
      score: clampNumber(sourceSection?.attributes?.[index]?.score ?? 8, 4, 12),
      subValue: normalizeAttributeDetail(sourceSection?.attributes?.[index]?.subValue),
    }));
    base.sections[section.id].skills = section.skills.map((skill, index) => ({
      key: slugify(skill),
      label: skill,
      value: clampNumber(sourceSection?.skills?.[index]?.value ?? 0, 0, 100),
    }));
    const maxHealth = getSectionMax(base.sections[section.id]);
    base.sections[section.id].health.current = clampNumber(sourceSection?.health?.current ?? maxHealth, 0, maxHealth);
  });

  base.specializations = Array.from({ length: MAX_SPECIALIZATIONS }, (_, index) => ({
    id: rawCharacter?.specializations?.[index]?.id || createId(),
    name: String(rawCharacter?.specializations?.[index]?.name || getSpecializationLabel(index)),
    value: clampNumber(rawCharacter?.specializations?.[index]?.value ?? 0, 0, 100),
  }));

  return base;
}

function createCharacterSkeleton(name, avatar) {
  const skeleton = {
    id: createId(),
    name,
    avatar,
    campaign: { space: "", code: "" },
    sections: {},
    specializations: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  SECTION_TEMPLATES.forEach((section) => {
    skeleton.sections[section.id] = {
      health: { current: 24 },
      attributes: section.attributes.map((attribute) => ({
        ...attribute,
        score: 8,
        subValue: { name: "", description: "" },
      })),
      skills: section.skills.map((skill) => ({
        key: slugify(skill),
        label: skill,
        value: 0,
      })),
    };
  });

  return skeleton;
}

function closeModal() {
  if (state.ui.activeModal?.type === "create-character" && !state.characters.length) {
    return;
  }
  state.ui.activeModal = null;
  renderApp();
}

function normalizeAttributeDetail(rawValue) {
  if (rawValue && typeof rawValue === "object") {
    return {
      name: String(rawValue.name || ""),
      description: String(rawValue.description || ""),
    };
  }

  if (typeof rawValue === "string" && rawValue.trim()) {
    return {
      name: rawValue.trim(),
      description: "",
    };
  }

  return {
    name: "",
    description: "",
  };
}

function getBodyDerivedValue(attribute) {
  if (attribute.key === "power") {
    return attribute.score * 2;
  }

  if (attribute.key === "control") {
    return 12 - attribute.score;
  }

  return attribute.score;
}

function getSpecializationLabel(index) {
  return `Specialization ${index + 1}`;
}

function iconHistory() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 7h14"></path>
      <path d="M5 12h14"></path>
      <path d="M5 17h14"></path>
    </svg>
  `;
}
