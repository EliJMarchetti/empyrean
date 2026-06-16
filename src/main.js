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
      { key: "power", label: "Power", subLabel: "Bulk" },
      { key: "control", label: "Control", subLabel: "Accuracy" },
      { key: "senses", label: "Senses", subLabel: "Focus" },
    ],
    skills: ["Awareness", "Craft", "Deftness", "Might", "Mobility", "Vigor"],
  },
  {
    id: "soul",
    title: "Soul",
    healthLabel: "Madness",
    tone: "soul",
    attributes: [
      { key: "mind", label: "Mind", subLabel: "Augment" },
      { key: "will", label: "Will", subLabel: "Augment" },
      { key: "emotion", label: "Emotion", subLabel: "Augment" },
    ],
    skills: ["Composure", "Information", "Manipulation", "Reason", "Rhetoric", "Systems"],
  },
  {
    id: "spirit",
    title: "Spirit",
    healthLabel: "Rift",
    tone: "spirit",
    attributes: [
      { key: "intuition", label: "Intuition", subLabel: "Tekhne" },
      { key: "conscience", label: "Conscience", subLabel: "Arkhemetry" },
      { key: "communion", label: "Communion", subLabel: "Cosmoglossia" },
    ],
    skills: ["Anima", "Character", "Discernment", "Discipline", "Faith", "Presence"],
  },
];

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
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
                ${renderDicePanel()}
                ${renderGearPanel()}
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
  return `
    <header class="toolbar">
      <div class="toolbar-group">
        <div class="toolbar-dropdown">
          <button class="toolbar-button toolbar-button-primary" data-action="toggle-character-menu" type="button">
            ${iconFolder()}
            <span>Characters</span>
            <span class="toolbar-caret">${state.ui.isCharacterMenuOpen ? "^" : "v"}</span>
          </button>
          ${
            state.ui.isCharacterMenuOpen
              ? `
                <div class="character-menu">
                  <div class="character-menu-actions">
                    <button class="menu-action" data-action="open-create-modal" type="button">New Character</button>
                    <button class="menu-action" data-action="open-import-modal" type="button">Import Code</button>
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
                        : `<div class="character-menu-empty">No saved characters yet.</div>`
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
      </div>
      <div class="toolbar-group">
        <button class="toolbar-button" data-action="open-link-modal" type="button" ${character ? "" : "disabled"}>
          ${iconLink()}
          <span>Link to Campaign</span>
        </button>
        <button
          class="toolbar-button toolbar-button-danger"
          data-action="open-delete-modal"
          type="button"
          ${character ? "" : "disabled"}
        >
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
        <h1>Build your first character.</h1>
        <p>The first pass is centered on the sheet, local saves, campaign linking, and the dice roller.</p>
        <button class="hero-button" data-action="open-create-modal" type="button">Create Character</button>
      </div>
    </section>
  `;
}

function renderCharacterHeader(character) {
  return `
    <section class="character-header">
      <button class="character-title-button" data-action="open-bio-modal" type="button">
        <h1>${escapeHtml(character.name)}</h1>
      </button>
      <div class="view-switcher">
        <button
          class="view-button ${state.ui.activeView === "sheet" ? "is-active" : ""}"
          data-action="switch-view"
          data-view="sheet"
          type="button"
          title="Character sheet"
        >
          ${iconAvatar(character.gender || "male")}
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
        <button class="view-button view-button-disabled" type="button" disabled title="World view arrives later.">
          ${iconWorld()}
        </button>
      </div>
    </section>
  `;
}

function renderPrimaryView(character) {
  if (state.ui.activeView === "inventory") {
    return renderInventoryView();
  }

  return `
    <div class="sheet-grid">
      ${SECTION_TEMPLATES.map((section) => renderSectionBlock(character, section)).join("")}
    </div>
    <section class="specializations-panel">
      <div class="specialization-strip">
        ${character.specializations
          .map(
            (specialization, index) => `
              <label class="specialization-box">
                <span>${getSpecializationLabel(index)}</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value="${specialization.value}"
                  data-input="specialization-value"
                  data-index="${index}"
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

function renderSectionBlock(character, template) {
  const section = character.sections[template.id];
  const maxHealth = getSectionMax(section);

  return `
    <section class="stat-block stat-block-${template.tone}">
      <div class="stat-header">
        <h2>${escapeHtml(template.title)}</h2>
        <div class="health-module">
          <span class="health-label">${escapeHtml(template.healthLabel)}</span>
          <div class="health-inline">
            <input
              class="health-input"
              type="number"
              min="0"
              max="${maxHealth}"
              value="${section.health.current}"
              data-input="health-current"
              data-section="${template.id}"
              ${state.ui.editMode ? "" : "disabled"}
            />
            <span>/</span>
            <span class="health-max">${maxHealth}</span>
          </div>
        </div>
      </div>
      <div class="attribute-strip">
        ${section.attributes.map((attribute, index) => renderAttributeCard(template, attribute, index)).join("")}
      </div>
      <div class="skills-grid">
        ${section.skills
          .map(
            (skill, index) => `
              <label class="skill-box">
                <span>${escapeHtml(skill.label)}</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value="${skill.value}"
                  data-input="skill-value"
                  data-section="${template.id}"
                  data-index="${index}"
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

function renderAttributeCard(template, attribute, index) {
  const detail = normalizeAttributeDetail(attribute.detail);

  return `
    <article class="attribute-card">
      <div class="attribute-name">${escapeHtml(attribute.label)}</div>
      <select
        class="attribute-score"
        data-input="attribute-score"
        data-section="${template.id}"
        data-index="${index}"
        ${state.ui.editMode ? "" : "disabled"}
      >
        ${ATTRIBUTE_SCORES.map(
          (value) => `<option value="${value}" ${value === attribute.score ? "selected" : ""}>${value}</option>`
        ).join("")}
      </select>
      <div class="attribute-dice">(${escapeHtml(formatDiceNotation(scoreToDice(attribute.score)))})</div>
      ${
        template.id === "body"
          ? `
            <div class="attribute-subbox attribute-subbox-static">
              <span>${escapeHtml(attribute.subLabel)} ${getBodyDerivedValue(attribute)}</span>
            </div>
          `
          : `
            <button
              class="attribute-subbox"
              data-action="open-attribute-detail"
              data-section="${template.id}"
              data-index="${index}"
              type="button"
            >
              <span>${escapeHtml(detail.name || attribute.subLabel)}</span>
            </button>
          `
      }
    </article>
  `;
}

function renderInventoryView() {
  return `
    <section class="inventory-panel">
      <div class="inventory-blank"></div>
    </section>
  `;
}

function renderDicePanel() {
  const lastRoll = state.ui.lastRoll;
  const dice = getDisplayedDice(lastRoll);

  return `
    <section class="utility-panel dice-panel">
      <div class="utility-title-row">
        <h2>Dice Roller</h2>
        <button class="icon-button" data-action="open-roll-history" type="button" aria-label="Open roll history">
          ${iconHistory()}
        </button>
      </div>
      <div class="dice-panel-surface ${state.ui.isRolling ? "is-rolling" : ""}" data-action="open-builder-modal">
        <div class="dice-stage">
          ${dice.map((die, index) => renderDie(die.value, die.sides, index)).join("")}
        </div>
        <div class="roll-summary">
          ${
            lastRoll
              ? `
                <div class="summary-total">${lastRoll.total}</div>
                <div class="summary-text">
                  <p>${escapeHtml(lastRoll.label)}</p>
                  <p>${escapeHtml(lastRoll.breakdown)}</p>
                </div>
              `
              : `
                <div class="summary-empty">
                  <p>No roll yet.</p>
                  <p>Left click to build a roll. Right click for custom dice.</p>
                </div>
              `
          }
        </div>
      </div>
    </section>
  `;
}

function renderDie(value, sides, index) {
  const spec = getDieSpec(sides);
  const displayValue = value === undefined || value === null ? "-" : String(value);

  return `
    <div class="die die-slot-${index + 1}">
      <svg class="die-svg die-svg-${spec.className}" viewBox="${spec.viewBox}" aria-hidden="true">
        <polygon points="${spec.points}"></polygon>
        <text x="${spec.textX}" y="${spec.textY}">${escapeHtml(displayValue)}</text>
      </svg>
    </div>
  `;
}

function renderGearPanel() {
  return `
    <section class="utility-panel gear-panel">
      <div class="utility-title-row">
        <h2>Gear</h2>
      </div>
      <div class="gear-blank"></div>
    </section>
  `;
}

function renderModal() {
  if (!state.ui.activeModal) {
    return "";
  }

  const { type, payload } = state.ui.activeModal;
  const character = getActiveCharacter();

  if (type === "create-character") {
    const preventClose = !state.characters.length;
    return renderModalShell(
      "New Character",
      "",
      `
        <form class="modal-form" data-form="create-character">
          <label>
            <span>Name</span>
            <input type="text" name="name" maxlength="48" placeholder="Rhea Sol" required />
          </label>
          <label>
            <span>Gender</span>
            <select name="gender">
              ${GENDER_OPTIONS.map((option) => `<option value="${option.value}">${escapeHtml(option.label)}</option>`).join("")}
            </select>
          </label>
          <div class="modal-actions">
            ${preventClose ? "" : `<button class="secondary-button" data-action="close-modal" type="button">Cancel</button>`}
            <button class="primary-button" type="submit">Create</button>
          </div>
        </form>
      `,
      { preventClose }
    );
  }

  if (type === "bio-info") {
    return renderModalShell(
      character?.name || "Character",
      "",
      `
        <div class="modal-copy">
          <p>Biography, biometrics, affiliations, and story details will live here in a later pass.</p>
          <div class="modal-actions">
            <button class="primary-button" data-action="close-modal" type="button">Close</button>
          </div>
        </div>
      `
    );
  }

  if (type === "link-campaign") {
    const sharePayload = buildSharePayload(character);

    return renderModalShell(
      "Link to Campaign",
      "",
      `
        <form class="modal-form" data-form="link-campaign">
          <label>
            <span>VTT Space</span>
            <input
              type="text"
              name="space"
              maxlength="40"
              placeholder="Foundry"
              value="${escapeAttribute(character?.campaign?.space || "")}"
            />
          </label>
          <label>
            <span>Campaign Code</span>
            <input
              type="text"
              name="code"
              maxlength="40"
              placeholder="GM supplied code"
              value="${escapeAttribute(character?.campaign?.code || "")}"
              required
            />
          </label>
          <div class="modal-actions">
            ${
              character?.campaign?.code
                ? `<button class="secondary-button" data-action="unlink-campaign" type="button">Clear Link</button>`
                : `<span></span>`
            }
            <button class="primary-button" type="submit">Save</button>
          </div>
        </form>
        <div class="modal-divider"></div>
        <div class="share-panel">
          <label>
            <span>Share Code</span>
            <textarea rows="3" readonly>${escapeHtml(sharePayload.code)}</textarea>
          </label>
          <div class="modal-actions modal-actions-start">
            <button
              class="secondary-button"
              data-action="copy-share-code"
              data-copy-value="${escapeAttribute(sharePayload.code)}"
              type="button"
            >
              Copy Code
            </button>
            <button
              class="secondary-button"
              data-action="copy-share-link"
              data-copy-value="${escapeAttribute(sharePayload.link || "")}"
              type="button"
              ${sharePayload.link ? "" : "disabled"}
            >
              Copy Link
            </button>
          </div>
        </div>
      `
    );
  }

  if (type === "confirm-delete") {
    return renderModalShell(
      "Delete Character",
      "",
      `
        <div class="modal-copy">
          <p>Delete ${escapeHtml(character?.name || "this character")}?</p>
          <div class="modal-actions">
            <button class="secondary-button" data-action="close-modal" type="button">Cancel</button>
            <button class="danger-button" data-action="confirm-delete-character" type="button">Delete</button>
          </div>
        </div>
      `
    );
  }

  if (type === "attribute-detail") {
    const sectionId = payload?.sectionId;
    const attributeIndex = Number(payload?.index);
    const template = SECTION_TEMPLATES.find((section) => section.id === sectionId);
    const attribute = character?.sections?.[sectionId]?.attributes?.[attributeIndex];

    if (!template || !attribute) {
      return "";
    }

    const detail = normalizeAttributeDetail(attribute.detail);

    return renderModalShell(
      detail.name || attribute.subLabel,
      "",
      `
        <form class="modal-form" data-form="attribute-detail">
          <input type="hidden" name="sectionId" value="${escapeAttribute(sectionId)}" />
          <input type="hidden" name="attributeIndex" value="${attributeIndex}" />
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
              rows="6"
              name="detailDescription"
              maxlength="600"
              placeholder="Ability text"
              ${state.ui.editMode ? "" : "readonly"}
            >${escapeHtml(detail.description)}</textarea>
          </label>
          <div class="modal-actions">
            <button class="secondary-button" data-action="close-modal" type="button">Close</button>
            ${state.ui.editMode ? `<button class="primary-button" type="submit">Save</button>` : ""}
          </div>
        </form>
      `
    );
  }

  if (type === "build-roll") {
    const attributeOptions = SECTION_TEMPLATES.flatMap((section) =>
      character.sections[section.id].attributes.map((attribute, index) => ({
        value: `${section.id}:${index}`,
        label: `${section.title} - ${attribute.label} (${attribute.score} / ${formatDiceNotation(scoreToDice(attribute.score))})`,
      }))
    );
    const skillOptions = SECTION_TEMPLATES.flatMap((section) =>
      character.sections[section.id].skills.map((skill, index) => ({
        value: `${section.id}:${index}`,
        label: `${section.title} - ${skill.label} (${formatSigned(skill.value)})`,
      }))
    );

    return renderModalShell(
      "Build Roll",
      "",
      `
        <form class="modal-form modal-form-tight" data-form="build-roll">
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
            <input type="number" name="situationalBonus" min="-100" max="100" value="0" placeholder="0" />
          </label>
          <fieldset class="checkbox-grid">
            <legend>Specializations</legend>
            ${character.specializations
              .map(
                (specialization, index) => `
                  <label class="check-row">
                    <input type="checkbox" name="specialization" value="${index}" ${
                      specialization.value === 0 ? "disabled" : ""
                    } />
                    <span>${getSpecializationLabel(index)}</span>
                    <strong>${formatSigned(specialization.value)}</strong>
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
      "",
      `
        <form class="modal-form modal-form-tight" data-form="custom-roll">
          <label>
            <span>Label</span>
            <input type="text" name="label" maxlength="48" placeholder="Weapon test" />
          </label>
          <label>
            <span>Dice Formula</span>
            <input type="text" name="formula" maxlength="60" placeholder="1d8 + 1d10 + 12" required />
          </label>
          <div class="modal-actions">
            <button class="secondary-button" data-action="close-modal" type="button">Cancel</button>
            <button class="primary-button" type="submit">Roll</button>
          </div>
        </form>
      `
    );
  }

  if (type === "roll-history") {
    return renderModalShell(
      "Recent Rolls",
      "",
      `
        <div class="roll-history">
          ${
            state.ui.rollHistory.length
              ? state.ui.rollHistory
                  .map(
                    (entry) => `
                      <div class="history-row">
                        <div class="history-copy">
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
          <div class="modal-actions">
            <button class="primary-button" data-action="close-modal" type="button">Close</button>
          </div>
        </div>
      `
    );
  }

  if (type === "import-modal") {
    return renderModalShell(
      "Import Share Code",
      "",
      `
        <form class="modal-form" data-form="import-code">
          <label>
            <span>Share Code</span>
            <textarea rows="6" name="shareCode" placeholder="Paste share code here." required></textarea>
          </label>
          <div class="modal-actions">
            <button class="secondary-button" data-action="close-modal" type="button">Cancel</button>
            <button class="primary-button" type="submit">Import</button>
          </div>
        </form>
      `
    );
  }

  if (type === "import-shared") {
    return renderModalShell(
      "Import Shared Character",
      "",
      `
        <div class="modal-copy">
          <p>Save ${escapeHtml(payload.name)} to your local character list?</p>
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
      <section class="modal-card" role="dialog" aria-modal="true">
        <div class="modal-header">
          <div>
            <h2>${escapeHtml(title)}</h2>
            ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
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

function renderToast() {
  if (!state.ui.toast) {
    return "";
  }

  return `<div class="toast">${escapeHtml(state.ui.toast)}</div>`;
}

function handleClick(event) {
  if (event.target.matches('.modal-backdrop[data-close-backdrop="true"]')) {
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
    state.ui.activeView = actionTarget.dataset.view;
    renderApp();
    return;
  }

  if (action === "open-bio-modal") {
    state.ui.activeModal = { type: "bio-info" };
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
    if (state.ui.activeModal?.payload) {
      importCharacter(state.ui.activeModal.payload);
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
      const sectionData = character.sections[section];
      sectionData.health.current = clampNumber(input.value, 0, getSectionMax(sectionData));
      return;
    }

    if (inputType === "attribute-score") {
      character.sections[section].attributes[Number(index)].score = clampNumber(input.value, 4, 12);
      return;
    }

    if (inputType === "skill-value") {
      character.sections[section].skills[Number(index)].value = clampNumber(input.value, 0, 100);
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
    const gender = String(formData.get("gender") || "male");

    if (!name) {
      showToast("Character name is required.");
      renderApp();
      return;
    }

    const character = createCharacter(name, gender);
    state.characters.unshift(character);
    state.ui.activeCharacterId = character.id;
    state.ui.activeView = "sheet";
    state.ui.editMode = true;
    state.ui.activeModal = null;
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
    const sectionId = String(formData.get("sectionId") || "");
    const attributeIndex = Number(formData.get("attributeIndex"));
    const detailName = String(formData.get("detailName") || "").trim();
    const detailDescription = String(formData.get("detailDescription") || "").trim();

    updateCurrentCharacter((character) => {
      character.sections[sectionId].attributes[attributeIndex].detail = {
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
    const attributeRef = String(formData.get("attributeRef") || "");
    const skillRef = String(formData.get("skillRef") || "");
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
      const imported = parseShareCode(shareCode);
      importCharacter(imported);
      return;
    } catch (error) {
      showToast(error.message);
      renderApp();
      return;
    }
  }
}

function handleContextMenu(event) {
  if (!event.target.closest(".dice-panel-surface")) {
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
    .map((index) => ({ index, specialization: character.specializations[index] }))
    .filter((entry) => Boolean(entry.specialization));

  const skillBonus = skill.value;
  const specializationBonus = selectedSpecializations.reduce(
    (total, entry) => total + entry.specialization.value,
    0
  );

  const bonusParts = [`${skill.label} ${formatSigned(skillBonus)}`];

  selectedSpecializations.forEach((entry) => {
    bonusParts.push(`${getSpecializationLabel(entry.index)} ${formatSigned(entry.specialization.value)}`);
  });

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
  const orderedResults = [...results].sort((left, right) => right - left);
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
  const detailParts = [`${notation} -> ${orderedResults.join(" / ")}`, `Base ${base}`];

  if (criticalLabel) {
    detailParts.push(criticalLabel);
  }

  if (bonusParts.length) {
    detailParts.push(bonusParts.join(" | "));
  }

  return {
    id: createId(),
    label,
    notation,
    diceSides,
    results,
    orderedResults,
    total,
    breakdown: detailParts.join(" | "),
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
  }, 900);
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
      for (let countIndex = 0; countIndex < count; countIndex += 1) {
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

function createCharacter(name, gender = "male") {
  const character = {
    id: createId(),
    name,
    gender,
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
        detail: { name: "", description: "" },
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
  const base = createCharacterSkeleton(rawCharacter?.name || "Untitled Character", rawCharacter?.gender || "male");
  base.id = rawCharacter?.id || base.id;
  base.campaign = {
    space: String(rawCharacter?.campaign?.space || ""),
    code: String(rawCharacter?.campaign?.code || ""),
  };
  base.createdAt = rawCharacter?.createdAt || base.createdAt;
  base.updatedAt = rawCharacter?.updatedAt || base.updatedAt;

  SECTION_TEMPLATES.forEach((section) => {
    const sourceSection =
      rawCharacter?.sections?.[section.id] ||
      (section.id === "spirit" ? rawCharacter?.sections?.rift : null);
    base.sections[section.id].attributes = section.attributes.map((attribute, index) => ({
      ...attribute,
      score: clampNumber(sourceSection?.attributes?.[index]?.score ?? 8, 4, 12),
      detail: normalizeAttributeDetail(
        sourceSection?.attributes?.[index]?.detail ?? sourceSection?.attributes?.[index]?.subValue
      ),
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

function createCharacterSkeleton(name, gender) {
  const skeleton = {
    id: createId(),
    name,
    gender,
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
        detail: { name: "", description: "" },
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
  state.ui.activeView = "sheet";
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

  return { name: "", description: "" };
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

function getDisplayedDice(lastRoll) {
  if (!lastRoll) {
    return [
      { value: "-", sides: 6 },
      { value: "-", sides: 6 },
    ];
  }

  const displayed = lastRoll.results.map((value, index) => ({
    value,
    sides: lastRoll.diceSides[index] || 6,
  }));

  while (displayed.length < 2) {
    displayed.push({ value: "-", sides: 6 });
  }

  return displayed.slice(0, 2);
}

function getDieSpec(sides) {
  if (sides <= 4) {
    return {
      className: "d4",
      viewBox: "0 0 100 90",
      points: "50,6 8,84 92,84",
      textX: "50",
      textY: "60",
    };
  }

  if (sides <= 6) {
    return {
      className: "d6",
      viewBox: "0 0 100 100",
      points: "14,14 86,14 86,86 14,86",
      textX: "50",
      textY: "56",
    };
  }

  if (sides <= 8) {
    return {
      className: "d8",
      viewBox: "0 0 100 100",
      points: "50,6 94,50 50,94 6,50",
      textX: "50",
      textY: "56",
    };
  }

  if (sides <= 10) {
    return {
      className: "d10",
      viewBox: "0 0 100 100",
      points: "50,4 80,14 96,42 86,78 62,96 38,96 14,78 4,42 20,14",
      textX: "50",
      textY: "58",
    };
  }

  return {
    className: "d12",
    viewBox: "0 0 100 100",
    points: "50,4 72,10 90,28 96,50 90,72 72,90 50,96 28,90 10,72 4,50 10,28 28,10",
    textX: "50",
    textY: "56",
  };
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

function getSpecializationLabel(index) {
  return `Specialization ${index + 1}`;
}

function showToast(message) {
  state.ui.toast = message;
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    state.ui.toast = null;
    renderApp();
  }, 2600);
}

function closeModal() {
  if (state.ui.activeModal?.type === "create-character" && !state.characters.length) {
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

  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="5.5" r="3"></circle>
      <path d="M12 8.8v4.2"></path>
      <path d="M9.3 19 12 13l2.7 6"></path>
      <path d="M8.3 11.5 12 9.4l3.7 2.1"></path>
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

function iconHistory() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 7h14"></path>
      <path d="M5 12h14"></path>
      <path d="M5 17h14"></path>
    </svg>
  `;
}
