const STORAGE_KEY = "empyrean.characters.v1";
const MAX_SPECIALIZATIONS = 16;
const BASE_SPECIALIZATION_SLOTS = 8;
const MAX_AUGMENT_SLOTS = 3;
const COSMOGLOSSIA_PANEL_COUNT = 8;
const ATTRIBUTE_CREATION_MIN = 4;
const ATTRIBUTE_CREATION_MAX = 12;
const SKILL_CREATION_MAX = 10;
const DEFAULT_SPECIALIZATION_CREATION_MAX = 10;
const ANDROID_SPECIALIZATION_CREATION_MAX = 20;
const ATTRIBUTE_SCORES = [4, 5, 6, 7, 8, 9, 10, 11, 12];
const NAME_HOVER_HINTS = ["Gender", "Lineage", "Affiliation", "Height", "Weight", "O.R.A.C.L.E. ID"];
const UI_ASSET_VERSION = "20260616f";
const NAME_PLACEHOLDER_SUGGESTIONS = [
  "Aster Wren",
  "Bellamy Knox",
  "Briar Vale",
  "Calder Nyx",
  "Carmen Quill",
  "Cato Sol",
  "Dara Voss",
  "Dorian Pike",
  "Eden Black",
  "Elara Finch",
  "Ember Rook",
  "Ezra Kade",
  "Farah Vey",
  "Galen Cross",
  "Hale Meridian",
  "Ilya Strake",
  "Iona Strake",
  "Jace Orison",
  "Juno Kestrel",
  "Kael Meridian",
  "Kira Ash",
  "Lena Sable",
  "Lio Argent",
  "Lyra Sable",
  "Mara Quell",
  "Mira Quell",
  "Nadia Sorn",
  "Nico Halcyon",
  "Nox Ardent",
  "Nyra Flint",
  "Oren Vanta",
  "Orin Voss",
  "Pax Calder",
  "Quin Aeris",
  "Rhea Sol",
  "Riven Locke",
  "Rowan Skye",
  "Sable Irons",
  "Cassian Vale",
  "Selene Vox",
  "Sera Myles",
  "Soren Halcyon",
  "Talon Vey",
  "Tamsin Reed",
  "Tessa Vire",
  "Theo Warden",
  "Vale Seren",
  "Veda Cain",
  "Vera Noct",
  "Wyn Cipher",
  "Xander Coil",
  "Yara Bloom",
  "Zane Icar",
];
const DIE_ART = {
  d4: { key: "d4", label: "d4", src: `./assets/dice/d4.png?v=${UI_ASSET_VERSION}` },
  d6: { key: "d6", label: "d6", src: `./assets/dice/d6.png?v=${UI_ASSET_VERSION}` },
  d8: { key: "d8", label: "d8", src: `./assets/dice/d8.png?v=${UI_ASSET_VERSION}` },
  d10: { key: "d10", label: "d10", src: `./assets/dice/d10.png?v=${UI_ASSET_VERSION}` },
  d12: { key: "d12", label: "d12", src: `./assets/dice/d12.png?v=${UI_ASSET_VERSION}` },
  d20: { key: "d20", label: "d20", src: `./assets/dice/d20.png?v=${UI_ASSET_VERSION}` },
};

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

const LINEAGE_OPTIONS = [
  {
    key: "terran",
    label: "Terran",
    specializations: ["Bureaucracy", "Urban Systems", "Old Earth History", "Public Records", "Civil Infrastructure", "Legacy Networks"],
  },
  {
    key: "exo",
    label: "Exo",
    specializations: ["Homeworld Politics", "Low-G Operations", "Terraforming", "Colonial Logistics", "EVA", "Planetology"],
  },
  {
    key: "voidborn",
    label: "Voidborn",
    specializations: ["Shipboard Life", "Zero-G Movement", "Vacuum Survival", "Salvage", "Station Culture", "Spacer Folklore"],
  },
  {
    key: "chimera",
    label: "Chimera",
    specializations: ["Animal Instincts", "Tracking", "Natural Weapons", "Pack Dynamics", "Environmental Adaptation", "Enhanced Senses"],
  },
  {
    key: "aberrant",
    label: "Aberrant",
    specializations: ["Mutation Control", "Biohazards", "Forbidden Research", "Anomaly Survival", "Containment", "Genetic Memory"],
  },
  {
    key: "ghoul",
    label: "Ghoul",
    specializations: ["Radiation Zones", "Scavenging", "Wasteland Medicine", "Hazard Survival", "Ruin Navigation", "Mutant Networks"],
  },
  {
    key: "android",
    label: "Android",
    specializations: ["Machine Logic", "Protocols", "Synthetic Culture", "Data Archives", "Precision Labor", "Maintenance"],
  },
  {
    key: "golem",
    label: "Golem",
    specializations: ["Heavy Labor", "Construction", "Industrial Tools", "Structural Analysis", "Hazard Work", "Fortress Tactics"],
  },
  {
    key: "cyborg",
    label: "Cyborg",
    specializations: ["Cybernetics", "Interface Systems", "Battlefield Systems", "Machine Maintenance", "Powered Movement", "Targeting"],
  },
];

const CORPORATION_OPTIONS = [
  { key: "none", label: "No Corporate Involvement", specializations: ["Independence", "Underground Contacts"], ability: "" },
  { key: "custom", label: "Lesser Corporation", specializations: [], ability: "" },
  { key: "vantis", label: "Vantis", specializations: ["Etiquette", "Coercion"], ability: "" },
  { key: "aphelion", label: "Aphelion Dynamics", specializations: ["Spacecrafts", "Experimental Tech"], ability: "" },
  { key: "nocturne", label: "Nocturne Solutions", specializations: ["Infiltration", "Nondetection"], ability: "" },
  { key: "cerberus", label: "Cerberus Security", specializations: ["Protection", "Negotiation"], ability: "" },
  { key: "omnisight", label: "Omnisight Data Core", specializations: ["Artificial Intelligence", "Surveillance"], ability: "" },
  {
    key: "helios",
    label: "Helios Energy Systems",
    specializations: ["Nuclear Technology", "Finance"],
    ability: "Company Transit: You can get free passage between districts and between planets, by contacting Helios at least 24 hours in advance.",
  },
  { key: "terra-synth", label: "Terra-Synth Agro Com", specializations: ["Agriculture", "Hab-Design"], ability: "" },
  { key: "aeternis", label: "Aeternis", specializations: ["Biochemistry", "Nanotechnology"], ability: "" },
  { key: "nynthe", label: "Nynthe", specializations: ["Bargaining", "Media"], ability: "" },
  { key: "oracle", label: "O.R.A.C.L.E.", specializations: ["Education", "Credibility"], ability: "" },
];

const EXO_HOMEWORLD_OPTIONS = [
  "Mars",
  "Saturn",
  "Venus",
  "Proxima Centauri b",
  "Barnard's Star b",
  "TRAPPIST-1e",
  "TRAPPIST-1f",
  "TRAPPIST-1g",
];

const HOMEWORLD_ABILITIES = {
  Mars:
    "Gaia's Edge Emissary: You have an official bill of travel which specifies a stated purpose or objective. While pursuing that directive, you have diplomatic immunity which major corporations are sworn to uphold so long as your presence doesn't pose an imminent threat.",
};

const BACKGROUND_OPTIONS = [
  { key: "custom", label: "Custom", specializations: [], ability: "" },
  {
    key: "cyber-infiltrator",
    label: "Cyber-Infiltrator",
    specializations: ["Hacking", "Security Systems", "Decryption", "Infiltration", "Stealth Technology", "Remote Tasks"],
    ability: "Well Connected: You have contacts in every major organization, who can help you get information, schematics, and records so long as doing so doesn't expose them to serious risk.",
  },
  {
    key: "paratrooper",
    label: "Paratrooper",
    specializations: ["Stealth", "Piloting", "Breach Actions", "Sharpshooting", "Fast Adapting", "Battlefield Conditioning"],
    ability: "Hardened Veteran: Whenever you fail a Combat Attrition Test, and black out a Skill, you may expend a Story Point to remain in the combat as though you hadn't failed.",
  },
  {
    key: "energy-weaponsmith",
    label: "Energy Weaponsmith",
    specializations: ["Fusion", "Fission", "Lasers", "Electromagnetism", "Explosives", "Weapons Engineering"],
    ability: "Weapons don't degrade or misfire while you use them.",
  },
  {
    key: "conscript",
    label: "Conscript",
    specializations: ["Firefights", "Field Medicine", "Fortification", "Bushcraft", "Streetwise", "Urban Warfare"],
    ability: "Pull Rank: You hold universal military credentials, which identify you personally, and may grant increased leniency to bring weapons into and operate within restricted areas.",
  },
];

const TEKHNE_OPTIONS = ["Time", "Space", "Mass", "Energy", "Information", "Entropy"];

const ARKHEMETRY_OPTIONS = [
  "Mechanical",
  "Biological",
  "Chemical",
  "Digital",
  "Structural",
  "Practical",
  "Relational",
  "Ornamental",
  "Metaphysical",
];

const COSMOGLOSSIA_COLORS = [
  { key: "C", label: "Cyan" },
  { key: "M", label: "Magenta" },
  { key: "Y", label: "Yellow" },
  { key: "K", label: "Black" },
  { key: "W", label: "White" },
  { key: "R", label: "Red" },
  { key: "G", label: "Green" },
  { key: "B", label: "Blue" },
];

const AUGMENT_OPTIONS = [
  {
    key: "custom",
    label: "Custom Augment",
    ability: "",
  },
  {
    key: "thermal-vision",
    label: "Thermal Vision",
    ability: "You can see heat signatures in darkness, including through up to four inches of non-metal and non-stone material.",
  },
  {
    key: "metabolic-control",
    label: "Metabolic Control",
    ability: "You can increase your recovery speed by double, at the cost of consuming twice as much food. You can also reduce your heat signature to nearly nothing as long as you remain motionless.",
  },
  {
    key: "enhanced-biology",
    label: "Enhanced Biology",
    ability: "You can spend a story point to add +10 on any Body test.",
  },
];

const BIOMETRIC_FIELDS = [
  { key: "height", label: "Height" },
  { key: "weight", label: "Weight" },
  { key: "eyeColor", label: "Eye Color" },
  { key: "hairColor", label: "Hair Color" },
  { key: "age", label: "Age" },
  { key: "oracleId", label: "ORACLE ID" },
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
    rollingDieIndexes: [],
    skillLossSelectionSection: null,
    isNameHoverHintVisible: false,
    nameHoverHintIndex: -1,
    createCharacterNameSuggestionIndex: -1,
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
  openCreateCharacterModal(false);
}

renderApp();

document.addEventListener("click", handleClick);
document.addEventListener("change", handleChange);
document.addEventListener("submit", handleSubmit);
document.addEventListener("contextmenu", handleContextMenu);
document.addEventListener("mouseover", handleMouseOver);
document.addEventListener("mouseout", handleMouseOut);
document.addEventListener("focusin", handleFocusIn);
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
          class="toolbar-button toolbar-icon-button ${state.ui.editMode ? "is-active" : ""}"
          data-action="toggle-edit-mode"
          type="button"
          title="${state.ui.editMode ? "Lock editing" : "Unlock editing"}"
          aria-label="${state.ui.editMode ? "Lock editing" : "Unlock editing"}"
          ${character ? "" : "disabled"}
        >
          ${iconLock(state.ui.editMode)}
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
  const hoverHint =
    NAME_HOVER_HINTS[
      ((state.ui.nameHoverHintIndex % NAME_HOVER_HINTS.length) + NAME_HOVER_HINTS.length) % NAME_HOVER_HINTS.length
    ] || NAME_HOVER_HINTS[0];
  const lineage = normalizeLineageRecord(character.lineage);
  const background = normalizeBackgroundRecord(character.background);

  return `
    <section class="character-header">
      <button class="character-title-button ${state.ui.activeView === "profile" ? "is-active" : ""}" data-action="open-profile-view" type="button">
        <h1>${escapeHtml(character.name)}</h1>
        <span class="character-title-meta">
          ${escapeHtml(lineage.label)} / ${escapeHtml(background.name)} / Profile & Creation Data
        </span>
        <span class="character-hover-hint ${state.ui.isNameHoverHintVisible ? "is-visible" : ""}" aria-hidden="true">
          ${escapeHtml(hoverHint)}
        </span>
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
  if (state.ui.activeView === "profile") {
    return renderProfileView(character);
  }

  if (state.ui.activeView === "inventory") {
    return renderInventoryView();
  }

  return `
    <div class="sheet-grid">
      ${SECTION_TEMPLATES.map((section) => renderSectionBlock(character, section)).join("")}
    </div>
    <section class="specializations-panel">
      <div class="subsection-title">Specializations</div>
      <div class="specialization-strip">
        ${getVisibleSpecializationEntries(character)
          .map(
            ({ specialization, index }) => `
              <label class="specialization-box">
                <span>${escapeHtml(getSpecializationName(specialization, index))}</span>
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
  const isSkillLossMode = state.ui.skillLossSelectionSection === template.id;

  return `
    <section class="stat-block stat-block-${template.tone}">
      <div class="stat-header">
        <div class="stat-title-cluster">
          <h2>${escapeHtml(template.title)}</h2>
          <button
            class="effect-toggle-button ${isSkillLossMode ? "is-active" : ""}"
            data-action="toggle-skill-loss-mode"
            data-section="${template.id}"
            type="button"
            aria-pressed="${isSkillLossMode ? "true" : "false"}"
            title="${template.healthLabel} long-term effects"
            aria-label="${template.healthLabel} long-term effects"
          >
            ${getSectionEffectIcon(template.id)}
          </button>
        </div>
        <div class="health-module">
          <span class="health-label">${escapeHtml(template.healthLabel)}</span>
          <div class="health-inline">
            <input
              class="health-input"
              type="number"
              min="0"
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
      <div class="subsection-title">Attributes</div>
      <div class="attribute-strip">
        ${section.attributes.map((attribute, index) => renderAttributeCard(character, template, attribute, index)).join("")}
      </div>
      <div class="subsection-title">Skills</div>
      <div class="skills-grid">
        ${section.skills.map((skill, index) => renderSkillCard(template.id, skill, index, isSkillLossMode)).join("")}
      </div>
    </section>
  `;
}

function renderSkillCard(sectionId, skill, index, isSkillLossMode) {
  const classes = `skill-box ${skill.redacted ? "is-redacted" : ""} ${isSkillLossMode ? "is-armed" : ""}`.trim();

  if (isSkillLossMode) {
    return `
      <button
        class="${classes}"
        data-action="toggle-redacted-skill"
        data-section="${sectionId}"
        data-index="${index}"
        type="button"
      >
        <span>${escapeHtml(skill.label)}</span>
        <div class="skill-value-display">${skill.value}</div>
      </button>
    `;
  }

  return `
    <label class="${classes}">
      <span>${escapeHtml(skill.label)}</span>
      <input
        type="number"
        min="0"
        max="100"
        value="${skill.value}"
        data-input="skill-value"
        data-section="${sectionId}"
        data-index="${index}"
        ${state.ui.editMode ? "" : "disabled"}
      />
    </label>
  `;
}

function renderAttributeCard(character, template, attribute, index) {
  const detail = normalizeAttributeDetail(attribute.detail);
  const subboxLabel =
    template.id === "body" ? `${attribute.subLabel} ${getBodyDerivedValue(attribute, character)}` : detail.name || attribute.subLabel;
  const isTight = attribute.label.length > 9 || subboxLabel.length > 11;

  return `
    <article class="attribute-card ${isTight ? "attribute-card-tight" : ""}">
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
              <span>${escapeHtml(subboxLabel)}</span>
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
              <span>${escapeHtml(subboxLabel)}</span>
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

function renderProfileView(character) {
  const lineage = normalizeLineageRecord(character.lineage);
  const background = normalizeBackgroundRecord(character.background);
  const features = normalizeFeatureList(character.features);
  const biometricGender = lineage.key === "golem" ? "N/A" : getGenderLabel(character.gender);

  return `
    <section class="profile-panel">
      <aside class="profile-image-panel">
        <div class="profile-image-slot ${character.profileImage ? "has-image" : ""}">
          ${
            character.profileImage
              ? `<img src="${escapeAttribute(character.profileImage)}" alt="${escapeAttribute(character.name)} portrait" />`
              : `<span>Character Image</span>`
          }
        </div>
        ${
          state.ui.editMode
            ? `
              <div class="profile-image-actions">
                <label class="secondary-button profile-upload-button">
                  <span>Upload</span>
                  <input data-input="profile-image" type="file" accept="image/*" />
                </label>
                <button
                  class="secondary-button"
                  data-action="remove-profile-image"
                  type="button"
                  ${character.profileImage ? "" : "disabled"}
                >
                  Remove
                </button>
              </div>
            `
            : ""
        }
      </aside>
      <div class="profile-stack">
        <details class="profile-detail" open>
          <summary>Biometrics</summary>
          <div class="profile-field-grid">
            <label>
              <span>Gender</span>
              <input type="text" value="${escapeAttribute(biometricGender)}" readonly />
            </label>
            ${BIOMETRIC_FIELDS.map(
              (field) => `
                <label>
                  <span>${escapeHtml(field.label)}</span>
                  <input
                    type="text"
                    maxlength="60"
                    value="${escapeAttribute(character.biometrics?.[field.key] || "")}"
                    data-input="biometric-field"
                    data-field="${field.key}"
                    ${state.ui.editMode ? "" : "readonly"}
                  />
                </label>
              `
            ).join("")}
          </div>
        </details>
        <details class="profile-detail" open>
          <summary>Character Data</summary>
          <div class="profile-field-grid">
            <label>
              <span>Name</span>
              <input
                type="text"
                maxlength="48"
                value="${escapeAttribute(character.name)}"
                data-input="profile-name"
                ${state.ui.editMode ? "" : "readonly"}
              />
            </label>
            <label>
              <span>Lineage</span>
              <input
                type="text"
                maxlength="48"
                value="${escapeAttribute(lineage.label)}"
                data-input="lineage-label"
                ${state.ui.editMode ? "" : "readonly"}
              />
            </label>
            <label>
              <span>Background</span>
              <input
                type="text"
                maxlength="60"
                value="${escapeAttribute(background.name)}"
                data-input="background-name"
                ${state.ui.editMode ? "" : "readonly"}
              />
            </label>
            ${
              lineage.key === "golem"
                ? `
                  <label>
                    <span>Recorded Gender</span>
                    <input type="text" value="${escapeAttribute(getGenderLabel(character.gender))}" readonly />
                  </label>
                `
                : `
                  <label>
                    <span>Gender</span>
                    <select data-input="profile-gender" ${state.ui.editMode ? "" : "disabled"}>
                      ${GENDER_OPTIONS.map(
                        (option) => `
                          <option value="${option.value}" ${option.value === character.gender ? "selected" : ""}>
                            ${escapeHtml(option.label)}
                          </option>
                        `
                      ).join("")}
                    </select>
                  </label>
                `
            }
          </div>
        </details>
        <details class="profile-detail" open>
          <summary>Features</summary>
          <div class="feature-editor-list">
            ${
              features.length
                ? features.map((feature, index) => renderFeatureEditor(feature, index)).join("")
                : `<div class="profile-empty">No feature data saved yet.</div>`
            }
          </div>
        </details>
        <details class="profile-detail">
          <summary>Creation Totals</summary>
          <div class="creation-total-grid">
            ${renderProfileTotalCard("Attributes", getAttributeTotal(character), character.creation?.attributeTotal)}
            ${renderProfileTotalCard("Skills", getSkillTotal(character), character.creation?.skillTotal)}
            ${renderProfileTotalCard(
              "Specializations",
              getSpecializationTotal(character),
              character.creation?.specializationTotal
            )}
          </div>
        </details>
        <details class="profile-detail">
          <summary>Specializations</summary>
          <div class="profile-specialization-grid">
            ${getVisibleSpecializationEntries(character)
              .map(
                ({ specialization, index }) => `
                  <label class="profile-specialization-row">
                    <span>${index + 1}</span>
                    <input
                      type="text"
                      maxlength="48"
                      value="${escapeAttribute(getSpecializationName(specialization, index))}"
                      data-input="specialization-name"
                      data-index="${index}"
                      ${state.ui.editMode ? "" : "readonly"}
                    />
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
        </details>
      </div>
    </section>
  `;
}

function renderFeatureEditor(feature, index) {
  return `
    <details class="feature-editor">
      <summary>
        <span>${escapeHtml(feature.name || "Feature")}</span>
        <small>${escapeHtml(feature.sourceLabel || feature.category || "Character")}</small>
      </summary>
      <div class="feature-editor-fields">
        <label>
          <span>Name</span>
          <input
            type="text"
            maxlength="72"
            value="${escapeAttribute(feature.name || "")}"
            data-input="feature-name"
            data-index="${index}"
            ${state.ui.editMode ? "" : "readonly"}
          />
        </label>
        <label>
          <span>Ability</span>
          <textarea
            rows="4"
            maxlength="900"
            data-input="feature-ability"
            data-index="${index}"
            ${state.ui.editMode ? "" : "readonly"}
          >${escapeHtml(feature.ability || "")}</textarea>
        </label>
      </div>
    </details>
  `;
}

function renderProfileTotalCard(label, current, expected) {
  const target = Number.isFinite(Number(expected)) ? Number(expected) : current;
  return `
    <div class="creation-total-card">
      <span>${escapeHtml(label)}</span>
      <strong>${current} / ${target}</strong>
    </div>
  `;
}

function renderAttributeDetailFields(kind, detail, attribute) {
  if (kind === "augment") {
    return renderAugmentPresetControls({
      selectedKey: detail.presetKey,
      keyField: "detailAugmentKey",
      nameField: "detailName",
      abilityField: "detailDescription",
      nameValue: detail.name,
      abilityValue: detail.description,
      namePlaceholder: attribute.subLabel,
      disabled: !state.ui.editMode,
    });
  }

  if (kind === "tekhne") {
    return renderNamedAbilityDetailFields("detailName", detail.name, TEKHNE_OPTIONS, detail.description);
  }

  if (kind === "arkhemetry") {
    return renderNamedAbilityDetailFields("detailName", detail.name, ARKHEMETRY_OPTIONS, detail.description);
  }

  if (kind === "cosmoglossia") {
    return `
      <input type="hidden" name="detailName" value="Cosmoglossia" />
      ${renderCosmoglossiaPanelFields("detailCosmoglossia", detail.cosmoglossiaPanels, !state.ui.editMode)}
    `;
  }

  return `
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
  `;
}

function renderNamedAbilityDetailFields(nameField, nameValue, options, abilityValue) {
  const selectedName = options.includes(nameValue) ? nameValue : options[0];
  return `
    <label>
      <span>Name</span>
      <select name="${escapeAttribute(nameField)}" ${state.ui.editMode ? "" : "disabled"}>
        ${options
          .map(
            (option) => `
              <option value="${escapeAttribute(option)}" ${option === selectedName ? "selected" : ""}>
                ${escapeHtml(option)}
              </option>
            `
          )
          .join("")}
      </select>
    </label>
    <label>
      <span>Ability</span>
      <textarea
        rows="6"
        name="detailDescription"
        maxlength="700"
        placeholder="Ability text"
        ${state.ui.editMode ? "" : "readonly"}
      >${escapeHtml(abilityValue)}</textarea>
    </label>
  `;
}

function renderCreateCharacterModal(payload, preventClose) {
  const draft = normalizeCreateCharacterDraft(payload);
  const totals = getCreationTotalsForLineage(draft.lineageKey);
  const specializationMax = getSpecializationCreationMax(draft.lineageKey);
  const adjustedSpecializationTotal = getAdjustedSpecializationTotal(totals.specializations, draft);

  return renderModalShell(
    "New Character",
    "",
    `
      <form class="modal-form create-character-form" data-form="create-character">
        <section class="create-section">
          <h3>Identity</h3>
          <div class="create-grid create-grid-three">
            <label>
              <span>Name</span>
              <input
                type="text"
                name="name"
                maxlength="48"
                value="${escapeAttribute(draft.name)}"
                placeholder="${escapeAttribute(getCreateCharacterNamePlaceholder())}"
              />
            </label>
            <label>
              <span>Lineage</span>
              <select name="lineage">
                ${LINEAGE_OPTIONS.map(
                  (option) => `
                    <option value="${option.key}" ${option.key === draft.lineageKey ? "selected" : ""}>
                      ${escapeHtml(option.label)}
                    </option>
                  `
                ).join("")}
              </select>
            </label>
            <label>
              <span>Gender</span>
              <select name="gender">
                ${GENDER_OPTIONS.map(
                  (option) => `
                    <option value="${option.value}" ${option.value === draft.gender ? "selected" : ""}>
                      ${escapeHtml(option.label)}
                    </option>
                  `
                ).join("")}
              </select>
            </label>
          </div>
        </section>
        ${renderLineageCreationFields(draft)}
        ${renderBackgroundCreationFields(draft, "primary")}
        ${draft.lineageKey === "aberrant" ? renderBackgroundCreationFields(draft, "secondary") : ""}
        ${renderOptionalCreationFeatureFields(draft)}
        <section class="create-section">
          <div class="create-section-heading">
            <h3>Attributes</h3>
            ${renderCreationPointStatus(getArrayTotal(draft.attributeScores), totals.attributes)}
          </div>
          <div class="create-attribute-grid">
            ${getCreationAttributeEntries()
              .map(
                (entry, index) => `
                  <label class="create-compact-field">
                    <span>${escapeHtml(entry.label)}</span>
                    <select name="${escapeAttribute(entry.inputName)}">
                      ${ATTRIBUTE_SCORES.map(
                        (score) => `
                          <option value="${score}" ${score === draft.attributeScores[index] ? "selected" : ""}>
                            ${score}
                          </option>
                        `
                      ).join("")}
                    </select>
                  </label>
                `
              )
              .join("")}
          </div>
        </section>
        <section class="create-section">
          <div class="create-section-heading">
            <h3>Skills</h3>
            ${renderCreationPointStatus(getArrayTotal(draft.skillValues), totals.skills)}
          </div>
          <div class="create-skill-grid">
            ${getCreationSkillEntries()
              .map(
                (entry, index) => `
                  <label class="create-skill-row">
                    ${
                      draft.lineageKey === "ghoul"
                        ? `
                          <input
                            type="checkbox"
                            name="ghoulRedactedSkill"
                            value="${escapeAttribute(entry.ref)}"
                            ${draft.ghoulRedactedSkillRefs.includes(entry.ref) ? "checked" : ""}
                          />
                        `
                        : ""
                    }
                    <span>${escapeHtml(entry.label)}</span>
                    <input
                      type="number"
                      min="0"
                      max="${SKILL_CREATION_MAX}"
                      value="${draft.skillValues[index]}"
                      name="${escapeAttribute(entry.inputName)}"
                      ${totals.skills === 0 ? "disabled" : ""}
                    />
                  </label>
                `
              )
              .join("")}
          </div>
        </section>
        <section class="create-section">
          <div class="create-section-heading">
            <h3>Specializations</h3>
            ${renderCreationPointStatus(getArrayTotal(draft.specializationValues), adjustedSpecializationTotal)}
          </div>
          ${renderCreateSpecializationFields(draft, specializationMax, totals.specializations)}
        </section>
        <div class="modal-actions">
          ${preventClose ? "" : `<button class="secondary-button" data-action="close-modal" type="button">Cancel</button>`}
          <button class="primary-button" type="submit">Create</button>
        </div>
      </form>
    `,
    { preventClose, wide: true }
  );
}

function renderLineageCreationFields(draft) {
  if (draft.lineageKey === "terran") {
    const corporation = getCorporationOption(draft.corporationKey);
    return `
      <section class="create-section">
        <h3>Corporate Ties</h3>
        <div class="create-grid create-grid-two">
          <label>
            <span>Corporation</span>
            <select name="corporation">
              ${CORPORATION_OPTIONS.map(
                (option) => `
                  <option value="${option.key}" ${option.key === draft.corporationKey ? "selected" : ""}>
                    ${escapeHtml(option.label)}
                  </option>
                `
              ).join("")}
            </select>
          </label>
          ${
            draft.corporationKey === "custom"
              ? `
                <label>
                  <span>Lesser Corporation</span>
                  <input
                    type="text"
                    name="customCorporationName"
                    maxlength="60"
                    value="${escapeAttribute(draft.customCorporationName)}"
                    placeholder="Corporation name"
                  />
                </label>
              `
              : ""
          }
        </div>
        <label>
          <span>Ability</span>
          <textarea rows="3" maxlength="700" name="corporateAbility">${escapeHtml(draft.corporateAbility)}</textarea>
        </label>
        ${
          corporation.specializations.length
            ? `<div class="create-note">${escapeHtml(corporation.specializations.join(" / "))}</div>`
            : ""
        }
      </section>
    `;
  }

  if (draft.lineageKey === "exo") {
    return `
      <section class="create-section">
        <h3>Homeworld</h3>
        <div class="create-grid create-grid-two">
          <label>
            <span>World</span>
            <select name="homeworld">
              ${EXO_HOMEWORLD_OPTIONS.map(
                (homeworld) => `
                  <option value="${escapeAttribute(homeworld)}" ${homeworld === draft.homeworld ? "selected" : ""}>
                    ${escapeHtml(homeworld)}
                  </option>
                `
              ).join("")}
            </select>
          </label>
        </div>
        <label>
          <span>Ability</span>
          <textarea rows="3" maxlength="700" name="homeworldAbility">${escapeHtml(draft.homeworldAbility)}</textarea>
        </label>
      </section>
    `;
  }

  if (["voidborn", "aberrant", "ghoul", "cyborg"].includes(draft.lineageKey)) {
    const titleByLineage = {
      voidborn: "Natural Augment",
      aberrant: "Bio-Augment",
      ghoul: "Radio-Augment",
      cyborg: "Mech-Augment",
    };
    return renderLineageAugmentFields(draft, titleByLineage[draft.lineageKey]);
  }

  if (draft.lineageKey === "golem") {
    return renderCreationFeatureFields({
      title: "Configuration",
      nameField: "lineageFeatureName",
      abilityField: "lineageFeatureAbility",
      nameValue: draft.lineageFeatureName,
      abilityValue: draft.lineageFeatureAbility,
      namePlaceholder: "Configuration",
    });
  }

  if (draft.lineageKey === "android") {
    return renderCreationFeatureFields({
      title: "Protocol",
      nameField: "lineageFeatureName",
      abilityField: "lineageFeatureAbility",
      nameValue: draft.lineageFeatureName,
      abilityValue: draft.lineageFeatureAbility,
      namePlaceholder: "Protocol",
    });
  }

  if (draft.lineageKey === "chimera") {
    return renderCreationFeatureFields({
      title: "Hybrid Animal",
      nameField: "lineageFeatureName",
      abilityField: "lineageFeatureAbility",
      nameValue: draft.lineageFeatureName,
      abilityValue: draft.lineageFeatureAbility,
      namePlaceholder: "Hybrid Animal",
    });
  }

  return "";
}

function renderLineageAugmentFields(draft, title) {
  return `
    <section class="create-section">
      <h3>${escapeHtml(title)}</h3>
      ${renderAugmentPresetControls({
        selectedKey: draft.lineageAugmentKey,
        keyField: "lineageAugmentKey",
        nameField: "lineageFeatureName",
        abilityField: "lineageFeatureAbility",
        nameValue: draft.lineageFeatureName,
        abilityValue: draft.lineageFeatureAbility,
        namePlaceholder: title,
      })}
    </section>
  `;
}

function renderAugmentPresetControls({
  selectedKey,
  keyField,
  nameField,
  abilityField,
  nameValue,
  abilityValue,
  namePlaceholder = "Augment",
  disabled = false,
}) {
  const augment = getAugmentOption(selectedKey);
  return `
    <div class="create-grid create-grid-two">
      <label>
        <span>Preset</span>
        <select name="${escapeAttribute(keyField)}" ${disabled ? "disabled" : ""}>
          ${AUGMENT_OPTIONS.map(
            (option) => `
              <option value="${option.key}" ${option.key === augment.key ? "selected" : ""}>
                ${escapeHtml(option.label)}
              </option>
            `
          ).join("")}
        </select>
      </label>
      <label>
        <span>Name</span>
        <input
          type="text"
          name="${escapeAttribute(nameField)}"
          maxlength="72"
          value="${escapeAttribute(nameValue || augment.label)}"
          placeholder="${escapeAttribute(namePlaceholder)}"
          ${disabled ? "disabled" : ""}
        />
      </label>
    </div>
    <label>
      <span>Ability</span>
      <textarea
        rows="3"
        maxlength="700"
        name="${escapeAttribute(abilityField)}"
        ${disabled ? "disabled" : ""}
      >${escapeHtml(abilityValue || augment.ability)}</textarea>
    </label>
  `;
}

function renderCreationFeatureFields({ title, nameField, abilityField, nameValue, abilityValue, namePlaceholder }) {
  return `
    <section class="create-section">
      <h3>${escapeHtml(title)}</h3>
      <div class="create-grid create-grid-two">
        <label>
          <span>Name</span>
          <input
            type="text"
            name="${escapeAttribute(nameField)}"
            maxlength="72"
            value="${escapeAttribute(nameValue)}"
            placeholder="${escapeAttribute(namePlaceholder)}"
          />
        </label>
      </div>
      <label>
        <span>Ability</span>
        <textarea rows="3" maxlength="700" name="${escapeAttribute(abilityField)}">${escapeHtml(abilityValue)}</textarea>
      </label>
    </section>
  `;
}

function renderBackgroundCreationFields(draft, slot) {
  const prefix = slot === "secondary" ? "secondary" : "background";
  const key = slot === "secondary" ? draft.secondaryBackgroundKey : draft.backgroundKey;
  const title = slot === "secondary" ? "Second Background" : "Background";
  const name = slot === "secondary" ? draft.secondaryBackgroundName : draft.backgroundName;
  const ability = slot === "secondary" ? draft.secondaryBackgroundAbility : draft.backgroundAbility;

  return `
    <section class="create-section">
      <h3>${escapeHtml(title)}</h3>
      <div class="create-grid create-grid-two">
        <label>
          <span>Type</span>
          <select name="${prefix}Key">
            ${BACKGROUND_OPTIONS.map(
              (option) => `
                <option value="${option.key}" ${option.key === key ? "selected" : ""}>
                  ${escapeHtml(option.label)}
                </option>
              `
            ).join("")}
          </select>
        </label>
        <label>
          <span>Name</span>
          <input
            type="text"
            name="${prefix}Name"
            maxlength="60"
            value="${escapeAttribute(name)}"
            placeholder="${escapeAttribute(getBackgroundOption(key).label)}"
          />
        </label>
      </div>
      ${renderBackgroundAbilityFields(draft, slot, key, ability)}
    </section>
  `;
}

function renderBackgroundAbilityFields(draft, slot, key, ability) {
  const prefix = slot === "secondary" ? "secondary" : "background";

  return `
    <label>
      <span>Ability</span>
      <textarea rows="3" maxlength="700" name="${prefix}Ability">${escapeHtml(ability)}</textarea>
    </label>
  `;
}

function renderOptionalCreationFeatureFields(draft) {
  const baseTotal = getCreationTotalsForLineage(draft.lineageKey).specializations;
  const isDisabled = baseTotal < 10;
  const augmentCapacity = getAvailableCreationAugmentSlots(draft.lineageKey);

  return `
    <section class="create-section">
      <div class="create-section-heading">
        <h3>Optional Creation Features</h3>
        <span class="creation-cost-note">-10 Specializations each</span>
      </div>
      <div class="create-note">Extra augment slots available: ${augmentCapacity}.</div>
      <div class="optional-feature-grid">
        ${renderOptionalAugmentFields(draft, isDisabled)}
        ${renderOptionalAbilityFields({
          checkedName: "takeTekhne",
          checked: draft.takeTekhne,
          title: "Tekhne",
          nameField: "creationTekhneName",
          abilityField: "creationTekhneAbility",
          nameValue: draft.creationTekhneName,
          abilityValue: draft.creationTekhneAbility,
          options: TEKHNE_OPTIONS,
          disabled: isDisabled,
        })}
        ${renderOptionalAbilityFields({
          checkedName: "takeArkhemetry",
          checked: draft.takeArkhemetry,
          title: "Arkhemetry",
          nameField: "creationArkhemetryName",
          abilityField: "creationArkhemetryAbility",
          nameValue: draft.creationArkhemetryName,
          abilityValue: draft.creationArkhemetryAbility,
          options: ARKHEMETRY_OPTIONS,
          disabled: isDisabled,
        })}
        ${renderOptionalCosmoglossiaFields(draft, isDisabled)}
      </div>
    </section>
  `;
}

function renderOptionalAugmentFields(draft, disabled) {
  const capacity = getAvailableCreationAugmentSlots(draft.lineageKey);

  if (!capacity) {
    return "";
  }

  return Array.from({ length: capacity }, (_, index) => renderOptionalAugmentCard(draft, index, disabled)).join("");
}

function renderOptionalAugmentCard(draft, index, disabled) {
  const augment = draft.creationAugments[index] || createDefaultCreationAugment(index);
  const isEditable = augment.enabled && !disabled;

  return `
    <div class="optional-feature-card ${augment.enabled ? "is-active" : ""}">
      <label class="inline-toggle">
        <input
          type="checkbox"
          name="creationAugmentEnabled${index}"
          ${augment.enabled ? "checked" : ""}
          ${disabled ? "disabled" : ""}
        />
        <span>Augment ${index + 1}</span>
      </label>
      ${renderAugmentPresetControls({
        selectedKey: augment.key,
        keyField: `creationAugmentKey${index}`,
        nameField: `creationAugmentName${index}`,
        abilityField: `creationAugmentAbility${index}`,
        nameValue: augment.name,
        abilityValue: augment.ability,
        namePlaceholder: `Augment ${index + 1}`,
        disabled: !isEditable,
      })}
    </div>
  `;
}

function renderOptionalAbilityFields({
  checkedName,
  checked,
  title,
  nameField,
  abilityField,
  nameValue,
  abilityValue,
  options = null,
  disabled = false,
}) {
  return `
    <div class="optional-feature-card ${checked ? "is-active" : ""}">
      <label class="inline-toggle">
        <input type="checkbox" name="${escapeAttribute(checkedName)}" ${checked ? "checked" : ""} ${
          disabled ? "disabled" : ""
        } />
        <span>${escapeHtml(title)}</span>
      </label>
      <label>
        <span>Name</span>
        ${
          options
            ? `
              <select name="${escapeAttribute(nameField)}" ${checked && !disabled ? "" : "disabled"}>
                ${options
                  .map(
                    (option) => `
                      <option value="${escapeAttribute(option)}" ${option === nameValue ? "selected" : ""}>
                        ${escapeHtml(option)}
                      </option>
                    `
                  )
                  .join("")}
              </select>
            `
            : `
              <input
                type="text"
                name="${escapeAttribute(nameField)}"
                maxlength="72"
                value="${escapeAttribute(nameValue)}"
                placeholder="${escapeAttribute(title)}"
                ${checked && !disabled ? "" : "disabled"}
              />
            `
        }
      </label>
      <label>
        <span>Ability</span>
        <textarea
          rows="3"
          maxlength="700"
          name="${escapeAttribute(abilityField)}"
          ${checked && !disabled ? "" : "disabled"}
        >${escapeHtml(abilityValue)}</textarea>
      </label>
    </div>
  `;
}

function renderOptionalCosmoglossiaFields(draft, disabled) {
  const isEditable = draft.takeCosmoglossia && !disabled;

  return `
    <div class="optional-feature-card optional-feature-card-wide ${draft.takeCosmoglossia ? "is-active" : ""}">
      <label class="inline-toggle">
        <input type="checkbox" name="takeCosmoglossia" ${draft.takeCosmoglossia ? "checked" : ""} ${
          disabled ? "disabled" : ""
        } />
        <span>Cosmoglossia</span>
      </label>
      ${renderCosmoglossiaPanelFields("creationCosmoglossia", draft.creationCosmoglossiaPanels, !isEditable)}
    </div>
  `;
}

function renderCosmoglossiaPanelFields(prefix, panels, disabled = false) {
  return `
    <div class="cosmoglossia-tile" aria-label="Cosmoglossia Einstein tile">
      ${normalizeCosmoglossiaPanels(panels)
        .map(
          (panel, index) => `
            <label class="cosmoglossia-panel cosmoglossia-panel-${escapeAttribute(panel.color.toLowerCase())}">
              <span>${index + 1}</span>
              <select name="${escapeAttribute(prefix)}Color${index}" ${disabled ? "disabled" : ""}>
                ${COSMOGLOSSIA_COLORS.map(
                  (color) => `
                    <option value="${color.key}" ${color.key === panel.color ? "selected" : ""}>
                      ${escapeHtml(color.key)}
                    </option>
                  `
                ).join("")}
              </select>
              <input
                type="text"
                name="${escapeAttribute(prefix)}Word${index}"
                maxlength="24"
                value="${escapeAttribute(panel.word)}"
                placeholder="Word"
                ${disabled ? "disabled" : ""}
              />
            </label>
          `
        )
        .join("")}
    </div>
  `;
}

function renderCreateSpecializationFields(draft, specializationMax, baseSpecializationTotal) {
  const slots = getDraftSpecializationSlots(draft);
  const activeSlots = slots.filter((slot) => slot.active);
  const adjustedTotal = getAdjustedSpecializationTotal(baseSpecializationTotal, draft);

  if (!activeSlots.length) {
    return `<div class="create-note">This lineage starts with no specialization points.</div>`;
  }

  return `
    <div class="create-note">Active slots: ${activeSlots.length}. Pool after feature costs: ${adjustedTotal}.</div>
    <div class="create-specialization-groups">
      ${renderCreateSpecializationGroup("Background Slots 1-6", slots.slice(0, 6), draft, specializationMax)}
      ${renderCreateSpecializationGroup("Lineage Slots 7-8", slots.slice(6, 8), draft, specializationMax)}
      ${renderCreateSpecializationGroup("Feature Slots 9-16", slots.slice(8), draft, specializationMax)}
    </div>
  `;
}

function renderCreateSpecializationGroup(title, slots, draft, specializationMax) {
  const activeSlots = slots.filter((slot) => slot.active);
  if (!activeSlots.length) {
    return "";
  }

  return `
    <section class="create-specialization-group">
      <h4>${escapeHtml(title)}</h4>
      <div class="create-specialization-grid">
        ${activeSlots.map((slot) => renderCreateSpecializationSlot(slot, draft, specializationMax)).join("")}
      </div>
    </section>
  `;
}

function renderCreateSpecializationSlot(slot, draft, specializationMax) {
  const nameControl = renderCreateSpecializationNameControl(slot, draft);
  return `
    <label class="create-specialization-row">
      <span>${slot.index + 1}</span>
      ${nameControl}
      <input
        type="number"
        min="0"
        max="${specializationMax}"
        value="${draft.specializationValues[slot.index] || 0}"
        name="specializationValue${slot.index}"
        ${specializationMax === 0 ? "disabled" : ""}
      />
    </label>
  `;
}

function renderCreateSpecializationNameControl(slot, draft) {
  if (slot.kind === "background-custom") {
    return `
      <input
        type="text"
        maxlength="48"
        value="${escapeAttribute(slot.name)}"
        name="backgroundSpecializationName${slot.index}"
        placeholder="${escapeAttribute(getSpecializationLabel(slot.index))}"
      />
    `;
  }

  if (slot.kind === "background-choice") {
    return `
      <select name="backgroundSpecializationName${slot.index}">
        ${(slot.options || [])
          .map(
            (option) => `
              <option value="${escapeAttribute(option)}" ${option === slot.name ? "selected" : ""}>
                ${escapeHtml(option)}
              </option>
            `
          )
          .join("")}
      </select>
    `;
  }

  if (slot.kind === "lineage") {
    const options = getLineageOption(draft.lineageKey).specializations;
    return `
      <select name="lineageSpecialization${slot.index - 6}">
        ${options
          .map(
            (option) => `
              <option value="${escapeAttribute(option)}" ${option === slot.name ? "selected" : ""}>
                ${escapeHtml(option)}
              </option>
            `
          )
          .join("")}
      </select>
    `;
  }

  if (slot.kind === "corporate-custom") {
    return `
      <input
        type="text"
        maxlength="48"
        value="${escapeAttribute(slot.name)}"
        name="corporateSpecializationName${slot.index - 8}"
        placeholder="${escapeAttribute(slot.sourceLabel)}"
      />
    `;
  }

  return `<input type="text" value="${escapeAttribute(slot.name)}" readonly />`;
}

function renderCreationPointStatus(current, expected) {
  const isExact = current === expected;
  return `<span class="creation-point-status ${isExact ? "is-complete" : "is-off"}">${current} / ${expected}</span>`;
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
          ${dice
            .map((die, index) => renderDie(die, index, Boolean(lastRoll?.results && index < lastRoll.results.length)))
            .join("")}
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

function renderDie(die, index, canReroll) {
  const displayValue = die.value === undefined || die.value === null ? "-" : String(die.value);
  const art = getDieArt(die.sides);
  const toneClass = `die-tone-${die.tone || "specialization"}`;
  const isRolling = state.ui.isRolling && state.ui.rollingDieIndexes.includes(index);
  const className = `die die-slot-${index + 1} ${canReroll ? "die-button" : "die-static"} ${
    isRolling ? "is-rolling" : ""
  }`.trim();
  const artMarkup = `
    <div class="die-figure">
      <span
        class="die-art die-art-${art.key} ${toneClass}"
        style="${escapeAttribute(`--die-art-mask: url('${art.src}')`)}"
        aria-hidden="true"
      ></span>
      <span class="die-value-chip">${escapeHtml(displayValue)}</span>
    </div>
  `;

  if (canReroll) {
    return `
      <button
        class="${className}"
        data-action="reroll-die"
        data-die-index="${index}"
        type="button"
        title="Reroll this ${art.label}"
        aria-label="Reroll this ${art.label}"
      >
        ${artMarkup}
      </button>
    `;
  }

  return `<div class="${className}" aria-hidden="true">${artMarkup}</div>`;
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
    return renderCreateCharacterModal(payload, preventClose);
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
    const detailKind = getAttributeDetailKind(sectionId, attributeIndex);

    return renderModalShell(
      detail.name || attribute.subLabel,
      "",
      `
        <form class="modal-form" data-form="attribute-detail">
          <input type="hidden" name="sectionId" value="${escapeAttribute(sectionId)}" />
          <input type="hidden" name="attributeIndex" value="${attributeIndex}" />
          <input type="hidden" name="detailFallback" value="${escapeAttribute(attribute.subLabel)}" />
          ${renderAttributeDetailFields(detailKind, detail, attribute)}
          <div class="modal-actions">
            <button class="secondary-button" data-action="close-modal" type="button">Close</button>
            ${state.ui.editMode ? `<button class="primary-button" type="submit">Save</button>` : ""}
          </div>
        </form>
      `
    );
  }

  if (type === "build-roll") {
    const rollState = getBuildRollState(character, payload);

    return renderModalShell(
      "Build Roll",
      "",
      `
        <form class="modal-form modal-form-tight" data-form="build-roll">
          <label>
            <span>Attribute</span>
            <select name="attributeRef" required>
              ${rollState.attributeOptions
                .map(
                  (option) => `
                    <option value="${option.value}" ${option.value === rollState.attributeRef ? "selected" : ""}>
                      ${escapeHtml(option.label)}
                    </option>
                  `
                )
                .join("")}
            </select>
          </label>
          <div class="modal-label-row">
            <span>Skill</span>
            <label class="inline-toggle">
              <input type="checkbox" name="outsideIdentity" ${rollState.outsideIdentity ? "checked" : ""} />
              <span>Outside of Identity</span>
            </label>
          </div>
          <label>
            <select name="skillRef" required>
              ${rollState.skillOptions
                .map(
                  (option) => `
                    <option value="${option.value}" ${option.value === rollState.skillRef ? "selected" : ""}>
                      ${escapeHtml(option.label)}
                    </option>
                  `
                )
                .join("")}
            </select>
          </label>
          <label>
            <span>Situational Bonus</span>
            <input
              type="number"
              name="situationalBonus"
              min="-100"
              max="100"
              value="${rollState.situationalBonus}"
              placeholder="0"
            />
          </label>
          <fieldset class="checkbox-grid">
            <legend>Specializations</legend>
            ${getVisibleSpecializationEntries(character)
              .map(
                ({ specialization, index }) => `
                  <label class="check-row">
                    <input
                      type="checkbox"
                      name="specialization"
                      value="${index}"
                      ${specialization.value === 0 ? "disabled" : ""}
                      ${rollState.specializationIndexes.includes(index) ? "checked" : ""}
                    />
                    <span>${escapeHtml(getSpecializationName(specialization, index))}</span>
                    <strong>${formatSigned(specialization.value)}</strong>
                  </label>
                `
              )
              .join("")}
          </fieldset>
          <div class="modal-actions modal-actions-end">
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
          <div class="modal-actions modal-actions-end">
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
      <section class="modal-card ${options.wide ? "modal-card-wide" : ""}" role="dialog" aria-modal="true">
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
    openCreateCharacterModal();
    renderApp();
    return;
  }

  if (action === "open-import-modal") {
    state.ui.skillLossSelectionSection = null;
    state.ui.activeModal = { type: "import-modal" };
    state.ui.isCharacterMenuOpen = false;
    renderApp();
    return;
  }

  if (action === "select-character") {
    state.ui.activeCharacterId = actionTarget.dataset.characterId;
    state.ui.isCharacterMenuOpen = false;
    state.ui.skillLossSelectionSection = null;
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
    state.ui.skillLossSelectionSection = null;
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
    state.ui.skillLossSelectionSection = null;
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
    state.ui.skillLossSelectionSection = null;
    renderApp();
    return;
  }

  if (action === "open-profile-view") {
    state.ui.skillLossSelectionSection = null;
    state.ui.activeView = "profile";
    renderApp();
    return;
  }

  if (action === "remove-profile-image") {
    updateCurrentCharacter((character) => {
      character.profileImage = "";
    });
    showToast("Character image removed.");
    renderApp();
    return;
  }

  if (action === "open-attribute-detail") {
    state.ui.skillLossSelectionSection = null;
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

  if (action === "toggle-skill-loss-mode") {
    const sectionId = String(actionTarget.dataset.section || "");
    const isCancelling = state.ui.skillLossSelectionSection === sectionId;
    state.ui.skillLossSelectionSection = isCancelling ? null : sectionId;
    showToast(
      isCancelling
        ? "Long-term effect selection cancelled."
        : `Select a ${getSectionTitle(sectionId)} skill to black out, or click the icon again to cancel.`
    );
    renderApp();
    return;
  }

  if (action === "toggle-redacted-skill") {
    const sectionId = String(actionTarget.dataset.section || "");
    const skillIndex = Number(actionTarget.dataset.index);
    if (state.ui.skillLossSelectionSection !== sectionId || !Number.isInteger(skillIndex)) {
      return;
    }

    const activeCharacter = getActiveCharacter();
    const skillLabel = activeCharacter?.sections?.[sectionId]?.skills?.[skillIndex]?.label || "Skill";

    let isNowRedacted = false;
    updateCurrentCharacter((character) => {
      const skill = character.sections?.[sectionId]?.skills?.[skillIndex];
      if (!skill) {
        return;
      }
      skill.redacted = !Boolean(skill.redacted);
      isNowRedacted = skill.redacted;
    });

    state.ui.skillLossSelectionSection = null;
    showToast(isNowRedacted ? `${skillLabel} has been blacked out.` : `${skillLabel} has been restored.`);
    renderApp();
    return;
  }

  if (action === "reroll-die") {
    const dieIndex = Number(actionTarget.dataset.dieIndex);
    const rerolledRoll = rerollLastRollDie(dieIndex);
    if (!rerolledRoll) {
      return;
    }

    finalizeRoll(rerolledRoll, { rollingDieIndexes: [dieIndex] });
    return;
  }

  if (action === "open-builder-modal") {
    state.ui.skillLossSelectionSection = null;
    state.ui.activeModal = { type: "build-roll", payload: getDefaultBuildRollPayload(getActiveCharacter()) };
    renderApp();
    return;
  }

  if (action === "open-roll-history") {
    state.ui.skillLossSelectionSection = null;
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
  const createCharacterForm = event.target.closest('[data-form="create-character"]');
  if (createCharacterForm && state.ui.activeModal?.type === "create-character") {
    const resetAllocationInputs = [
      "lineage",
      "homeworld",
      "backgroundKey",
      "secondaryKey",
      "corporation",
      "lineageAugmentKey",
      "takeTekhne",
      "takeArkhemetry",
      "takeCosmoglossia",
    ];
    const isAugmentToggle = event.target.name?.startsWith("creationAugmentEnabled");
    state.ui.activeModal = {
      type: "create-character",
      payload: getCreateCharacterDraftFromForm(createCharacterForm, {
        resetAllocation: resetAllocationInputs.includes(event.target.name) || isAugmentToggle,
      }),
    };
    renderApp();
    return;
  }

  const buildRollForm = event.target.closest('[data-form="build-roll"]');
  if (
    buildRollForm &&
    state.ui.activeModal?.type === "build-roll" &&
    ["attributeRef", "skillRef", "outsideIdentity", "situationalBonus", "specialization"].includes(event.target.name)
  ) {
    const currentCharacter = getActiveCharacter();
    if (!currentCharacter) {
      return;
    }

    const liveFormData = new FormData(buildRollForm);
    const nextPayload = {
      attributeRef: String(liveFormData.get("attributeRef") || ""),
      skillRef: String(liveFormData.get("skillRef") || ""),
      outsideIdentity: liveFormData.get("outsideIdentity") === "on",
      situationalBonus: clampNumber(liveFormData.get("situationalBonus"), -100, 100),
      specializationIndexes: liveFormData.getAll("specialization").map((value) => Number(value)),
    };

    const normalizedPayload = getBuildRollState(currentCharacter, nextPayload);
    state.ui.activeModal = {
      type: "build-roll",
      payload: {
        attributeRef: normalizedPayload.attributeRef,
        skillRef: normalizedPayload.skillRef,
        outsideIdentity: normalizedPayload.outsideIdentity,
        situationalBonus: normalizedPayload.situationalBonus,
        specializationIndexes: normalizedPayload.specializationIndexes,
      },
    };
    renderApp();
    return;
  }

  const attributeDetailForm = event.target.closest('[data-form="attribute-detail"]');
  if (attributeDetailForm && event.target.name === "detailAugmentKey") {
    updateAugmentDetailFields(attributeDetailForm, event.target.value);
    return;
  }

  const input = event.target.closest("[data-input]");
  if (!input) {
    return;
  }

  if (input.dataset.input === "profile-image") {
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    readImageFileAsDataUrl(file)
      .then((dataUrl) => {
        updateCurrentCharacter((character) => {
          character.profileImage = dataUrl;
        });
        showToast("Character image saved.");
        renderApp();
      })
      .catch(() => {
        showToast("That image could not be loaded.");
        renderApp();
      });
    return;
  }

  updateCurrentCharacter((character) => {
    const { input: inputType, section, index, field } = input.dataset;

    if (inputType === "health-current") {
      const sectionData = character.sections[section];
      sectionData.health.current = clampMinimum(input.value, 0);
      return;
    }

    if (inputType === "attribute-score") {
      character.sections[section].attributes[Number(index)].score = clampNumber(
        input.value,
        ATTRIBUTE_CREATION_MIN,
        ATTRIBUTE_CREATION_MAX
      );
      return;
    }

    if (inputType === "skill-value") {
      character.sections[section].skills[Number(index)].value = clampNumber(input.value, 0, 100);
      return;
    }

    if (inputType === "specialization-value") {
      character.specializations[Number(index)].value = clampNumber(input.value, 0, 100);
      return;
    }

    if (inputType === "specialization-name") {
      character.specializations[Number(index)].name = String(input.value || "").trim() || getSpecializationLabel(Number(index));
      return;
    }

    if (inputType === "profile-name") {
      character.name = String(input.value || "").trim() || character.name;
      return;
    }

    if (inputType === "profile-gender") {
      character.gender = normalizeGender(input.value);
      return;
    }

    if (inputType === "lineage-label") {
      character.lineage.label = String(input.value || "").trim() || getLineageOption(character.lineage.key).label;
      return;
    }

    if (inputType === "background-name") {
      character.background.name = String(input.value || "").trim() || getBackgroundOption(character.background.key).label;
      return;
    }

    if (inputType === "biometric-field" && field) {
      character.biometrics[field] = String(input.value || "").trim();
      return;
    }

    if (inputType === "feature-name") {
      const feature = character.features[Number(index)];
      if (feature) {
        feature.name = String(input.value || "").trim() || feature.name;
      }
      return;
    }

    if (inputType === "feature-ability") {
      const feature = character.features[Number(index)];
      if (feature) {
        feature.ability = String(input.value || "").trim();
      }
    }
  });

  renderApp();
}

function updateAugmentDetailFields(form, augmentKey) {
  const augment = getAugmentOption(augmentKey);
  const nameInput = form.elements.detailName;
  const abilityInput = form.elements.detailDescription;
  const knownNames = AUGMENT_OPTIONS.map((option) => option.label);
  const knownAbilities = AUGMENT_OPTIONS.map((option) => option.ability);

  if (nameInput && (!nameInput.value || knownNames.includes(nameInput.value))) {
    nameInput.value = augment.key === "custom" ? String(form.elements.detailFallback?.value || "Augment") : augment.label;
  }

  if (abilityInput && (!abilityInput.value || knownAbilities.includes(abilityInput.value))) {
    abilityInput.value = augment.ability;
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
    const draft = getCreateCharacterDraftFromForm(form);
    const validationMessage = validateCreationDraft(draft);

    if (validationMessage) {
      state.ui.activeModal = { type: "create-character", payload: draft };
      showToast(validationMessage);
      renderApp();
      return;
    }

    const character = createCharacterFromDraft(draft);
    state.characters.unshift(character);
    state.ui.activeCharacterId = character.id;
    state.ui.activeView = "sheet";
    state.ui.editMode = true;
    state.ui.activeModal = null;
    state.ui.skillLossSelectionSection = null;
    persistState();
    showToast(`${character.name} created.`);
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
    const detail = buildAttributeDetailFromFormData(formData);

    updateCurrentCharacter((character) => {
      character.sections[sectionId].attributes[attributeIndex].detail = detail;
    });

    state.ui.activeModal = null;
    showToast(`${detail.name || "Ability"} saved.`);
    renderApp();
    return;
  }

  if (formName === "build-roll") {
    const attributeRef = String(formData.get("attributeRef") || "");
    const skillRef = String(formData.get("skillRef") || "");
    const outsideIdentity = formData.get("outsideIdentity") === "on";
    const situationalBonus = clampNumber(formData.get("situationalBonus"), -100, 100);
    const specializationIndexes = formData.getAll("specialization").map((value) => Number(value));
    const roll = buildCharacterRoll(
      attributeRef,
      skillRef,
      specializationIndexes,
      situationalBonus,
      outsideIdentity
    );

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
        tone: "specialization",
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

function handleMouseOver(event) {
  const createNameInput = event.target.closest('form[data-form="create-character"] input[name="name"]');
  if (createNameInput) {
    rotateCreateCharacterNameSuggestion(event, createNameInput);
  }

  const titleButton = event.target.closest(".character-title-button");
  if (!titleButton) {
    return;
  }

  if (event.relatedTarget instanceof Node && titleButton.contains(event.relatedTarget)) {
    return;
  }

  state.ui.nameHoverHintIndex = (state.ui.nameHoverHintIndex + 1) % NAME_HOVER_HINTS.length;
  state.ui.isNameHoverHintVisible = true;
  const hint = titleButton.querySelector(".character-hover-hint");
  if (hint) {
    hint.textContent = NAME_HOVER_HINTS[state.ui.nameHoverHintIndex];
    hint.classList.add("is-visible");
  }
}

function handleMouseOut(event) {
  const titleButton = event.target.closest(".character-title-button");
  if (!titleButton) {
    return;
  }

  if (event.relatedTarget instanceof Node && titleButton.contains(event.relatedTarget)) {
    return;
  }

  if (!state.ui.isNameHoverHintVisible) {
    return;
  }

  state.ui.isNameHoverHintVisible = false;
  const hint = titleButton.querySelector(".character-hover-hint");
  if (hint) {
    hint.classList.remove("is-visible");
  }
}

function handleFocusIn(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) {
    return;
  }

  keepFocusedModalFieldInView(target);

  const createNameInput = target.closest('form[data-form="create-character"] input[name="name"]');
  if (!createNameInput) {
    return;
  }

  rotateCreateCharacterNameSuggestion(event, createNameInput);
}

function keepFocusedModalFieldInView(target) {
  if (!target.matches("input, select, textarea") || !target.closest(".modal-card")) {
    return;
  }

  window.requestAnimationFrame(() => {
    target.scrollIntoView({ block: "center", inline: "nearest" });
  });
}

function handleKeydown(event) {
  if (event.key === "Escape" && state.ui.activeModal) {
    closeModal();
  }
}

function buildCharacterRoll(attributeRef, skillRef, specializationIndexes, situationalBonus, outsideIdentity = false) {
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

  const skillBonus = skill.redacted && character.lineage?.key !== "ghoul" ? 0 : skill.value;
  const specializationBonus = selectedSpecializations.reduce(
    (total, entry) => total + entry.specialization.value,
    0
  );

  const bonusParts = [
    skill.redacted && character.lineage?.key !== "ghoul"
      ? `${skill.label} redacted +0`
      : `${skill.label} ${formatSigned(skillBonus)}`,
  ];

  selectedSpecializations.forEach((entry) => {
    bonusParts.push(`${getSpecializationName(entry.specialization, entry.index)} ${formatSigned(entry.specialization.value)}`);
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
    tone: getCharacterRollTone(attributeSectionId, skillSectionId, outsideIdentity),
  });
}

function getDefaultBuildRollPayload(character) {
  if (!character) {
    return {
      attributeRef: "",
      skillRef: "",
      outsideIdentity: false,
      situationalBonus: 0,
      specializationIndexes: [],
    };
  }

  const firstSection = SECTION_TEMPLATES[0];
  return {
    attributeRef: `${firstSection.id}:0`,
    skillRef: `${firstSection.id}:0`,
    outsideIdentity: false,
    situationalBonus: 0,
    specializationIndexes: [],
  };
}

function getBuildRollState(character, payload = {}) {
  const attributeOptions = SECTION_TEMPLATES.flatMap((section) =>
    character.sections[section.id].attributes.map((attribute, index) => ({
      value: `${section.id}:${index}`,
      label: attribute.label,
      sectionId: section.id,
    }))
  );

  const fallbackAttributeRef = payload.attributeRef || attributeOptions[0]?.value || "";
  const selectedAttributeRef = attributeOptions.some((option) => option.value === fallbackAttributeRef)
    ? fallbackAttributeRef
    : attributeOptions[0]?.value || "";
  const selectedAttributeSection = selectedAttributeRef.split(":")[0];
  const outsideIdentity = Boolean(payload.outsideIdentity);

  const skillOptions = SECTION_TEMPLATES.flatMap((section) =>
    character.sections[section.id].skills
      .filter(() => outsideIdentity || section.id === selectedAttributeSection)
      .map((skill, index) => ({
        value: `${section.id}:${index}`,
        label: skill.label,
      }))
  );

  const fallbackSkillRef = payload.skillRef || skillOptions[0]?.value || "";
  const selectedSkillRef = skillOptions.some((option) => option.value === fallbackSkillRef)
    ? fallbackSkillRef
    : skillOptions[0]?.value || "";
  const situationalBonus = clampNumber(payload.situationalBonus ?? 0, -100, 100);
  const specializationIndexes = Array.isArray(payload.specializationIndexes)
    ? payload.specializationIndexes
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value >= 0 && value < MAX_SPECIALIZATIONS)
    : [];

  return {
    attributeOptions,
    skillOptions,
    attributeRef: selectedAttributeRef,
    skillRef: selectedSkillRef,
    outsideIdentity,
    situationalBonus,
    specializationIndexes,
  };
}

function executeRoll({ label, notation, diceSides, flatBonus = 0, bonusParts = [], tone = "specialization" }) {
  const results = diceSides.map((sides) => randomInt(1, sides));
  return resolveRoll({ label, notation, diceSides, results, flatBonus, bonusParts, tone });
}

function resolveRoll({ label, notation, diceSides, results, flatBonus = 0, bonusParts = [], tone = "specialization" }) {
  const scoredPair = selectScoredDice(results, diceSides);
  const total = scoredPair.total + flatBonus;
  const detailLead =
    results.length > 2
      ? `${notation} -> Best pair ${scoredPair.orderedResults.join(" / ")}`
      : `${notation} -> ${scoredPair.orderedResults.join(" / ")}`;
  const detailParts = [detailLead, `Base ${scoredPair.base}`];

  if (scoredPair.criticalLabel) {
    detailParts.push(scoredPair.criticalLabel);
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
    orderedResults: scoredPair.orderedResults,
    displayedDice: scoredPair.displayedDice,
    displayedResultIndexes: scoredPair.displayedResultIndexes,
    criticalBonus: scoredPair.criticalBonus,
    flatBonus,
    bonusParts,
    tone,
    total,
    breakdown: detailParts.join(" | "),
    createdAt: new Date().toISOString(),
  };
}

function rerollLastRollDie(dieIndex) {
  const roll = state.ui.lastRoll;
  if (
    !roll ||
    !Number.isInteger(dieIndex) ||
    dieIndex < 0 ||
    dieIndex >= (roll.displayedResultIndexes?.length || 0)
  ) {
    return null;
  }

  const resultIndex = roll.displayedResultIndexes[dieIndex];
  if (!Number.isInteger(resultIndex) || resultIndex < 0 || resultIndex >= roll.results.length) {
    return null;
  }

  const nextResults = [...roll.results];
  nextResults[resultIndex] = randomInt(1, roll.diceSides[resultIndex]);

  return resolveRoll({
    label: roll.label,
    notation: roll.notation,
    diceSides: [...roll.diceSides],
    results: nextResults,
    flatBonus: roll.flatBonus || 0,
    bonusParts: Array.isArray(roll.bonusParts) ? [...roll.bonusParts] : [],
    tone: roll.tone || "specialization",
  });
}

function finalizeRoll(roll, options = {}) {
  window.clearTimeout(finalizeRoll.timeoutId);
  state.ui.lastRoll = roll;
  state.ui.rollHistory = [roll, ...state.ui.rollHistory].slice(0, 6);
  state.ui.isRolling = true;
  state.ui.rollingDieIndexes = Array.isArray(options.rollingDieIndexes)
    ? options.rollingDieIndexes.filter((index) => Number.isInteger(index))
    : (roll.displayedDice || []).map((_, index) => index);
  renderApp();
  finalizeRoll.timeoutId = window.setTimeout(() => {
    state.ui.isRolling = false;
    state.ui.rollingDieIndexes = [];
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
  return normalizeCharacter(createCharacterSkeleton(name, gender));
}

function normalizeCharacter(rawCharacter) {
  const base = createCharacterSkeleton(rawCharacter?.name || "Untitled Character", rawCharacter?.gender || "male");
  base.id = rawCharacter?.id || base.id;
  base.name = String(rawCharacter?.name || base.name);
  base.gender = normalizeGender(rawCharacter?.gender || base.gender);
  base.campaign = {
    space: String(rawCharacter?.campaign?.space || ""),
    code: String(rawCharacter?.campaign?.code || ""),
  };
  base.lineage = normalizeLineageRecord(rawCharacter?.lineage);
  base.background = normalizeBackgroundRecord(rawCharacter?.background);
  base.creation = normalizeCreationRecord(rawCharacter?.creation, base.lineage.key);
  base.biometrics = normalizeBiometrics(rawCharacter?.biometrics);
  base.profileImage = String(rawCharacter?.profileImage || "");
  base.features = normalizeFeatureList(rawCharacter?.features);
  base.createdAt = rawCharacter?.createdAt || base.createdAt;
  base.updatedAt = rawCharacter?.updatedAt || base.updatedAt;

  SECTION_TEMPLATES.forEach((section) => {
    const sourceSection =
      rawCharacter?.sections?.[section.id] ||
      (section.id === "spirit" ? rawCharacter?.sections?.rift : null);
    base.sections[section.id].attributes = section.attributes.map((attribute, index) => ({
      ...attribute,
      score: clampNumber(sourceSection?.attributes?.[index]?.score ?? 8, ATTRIBUTE_CREATION_MIN, ATTRIBUTE_CREATION_MAX),
      detail: normalizeAttributeDetail(
        sourceSection?.attributes?.[index]?.detail ?? sourceSection?.attributes?.[index]?.subValue
      ),
    }));
    base.sections[section.id].skills = section.skills.map((skill, index) => ({
      key: slugify(skill),
      label: skill,
      value: clampNumber(sourceSection?.skills?.[index]?.value ?? 0, 0, 100),
      redacted: Boolean(sourceSection?.skills?.[index]?.redacted),
    }));
    base.sections[section.id].health.current = clampMinimum(sourceSection?.health?.current ?? 0, 0);
  });

  base.specializations = Array.from({ length: MAX_SPECIALIZATIONS }, (_, index) => ({
    id: rawCharacter?.specializations?.[index]?.id || createId(),
    name: String(rawCharacter?.specializations?.[index]?.name || getSpecializationLabel(index)),
    value: clampNumber(rawCharacter?.specializations?.[index]?.value ?? 0, 0, 100),
    active:
      rawCharacter?.specializations?.[index]?.active === undefined
        ? index < BASE_SPECIALIZATION_SLOTS
        : Boolean(rawCharacter?.specializations?.[index]?.active),
    source: String(rawCharacter?.specializations?.[index]?.source || ""),
    sourceLabel: String(rawCharacter?.specializations?.[index]?.sourceLabel || ""),
  }));

  return base;
}

function createCharacterSkeleton(name, gender) {
  const lineage = normalizeLineageRecord();
  const background = normalizeBackgroundRecord();
  const skeleton = {
    id: createId(),
    name: String(name || "Untitled Character"),
    gender: normalizeGender(gender),
    campaign: { space: "", code: "" },
    lineage,
    background,
    creation: normalizeCreationRecord(null, lineage.key),
    biometrics: normalizeBiometrics(),
    profileImage: "",
    features: [],
    sections: {},
    specializations: Array.from({ length: MAX_SPECIALIZATIONS }, (_, index) => ({
      id: createId(),
      name: getSpecializationLabel(index),
      value: 0,
      active: index < BASE_SPECIALIZATION_SLOTS,
      source: index < 6 ? "background" : index < 8 ? "lineage" : "",
      sourceLabel: "",
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  SECTION_TEMPLATES.forEach((section) => {
    skeleton.sections[section.id] = {
      health: { current: 0 },
      attributes: section.attributes.map((attribute) => ({
        ...attribute,
        score: 8,
        detail: { name: "", description: "" },
      })),
      skills: section.skills.map((skill) => ({
        key: slugify(skill),
        label: skill,
        value: 0,
        redacted: false,
      })),
    };
  });

  return skeleton;
}

function normalizeGender(value) {
  const normalized = String(value || "male");
  return GENDER_OPTIONS.some((option) => option.value === normalized) ? normalized : "male";
}

function normalizeLineageRecord(rawValue = {}) {
  const raw = typeof rawValue === "string" ? { key: rawValue } : rawValue || {};
  const option = getLineageOption(raw.key);

  return {
    key: option.key,
    label: String(raw.label || option.label),
    details: normalizeRecordDetails(raw.details),
  };
}

function normalizeBackgroundRecord(rawValue = {}) {
  const raw = typeof rawValue === "string" ? { key: rawValue } : rawValue || {};
  const option = getBackgroundOption(raw.key);

  return {
    key: option.key,
    name: String(raw.name || option.label),
    ability: String(raw.ability || ""),
    secondary: raw.secondary ? normalizeBackgroundSummary(raw.secondary) : null,
  };
}

function normalizeBackgroundSummary(rawValue = {}) {
  const raw = typeof rawValue === "string" ? { key: rawValue } : rawValue || {};
  const option = getBackgroundOption(raw.key);

  return {
    key: option.key,
    name: String(raw.name || option.label),
    ability: String(raw.ability || ""),
  };
}

function normalizeCreationRecord(rawValue = {}, lineageKey = "terran") {
  const raw = rawValue || {};
  const totals = getCreationTotalsForLineage(lineageKey);

  return {
    attributeTotal: clampMinimum(raw.attributeTotal ?? totals.attributes, 0),
    skillTotal: clampMinimum(raw.skillTotal ?? totals.skills, 0),
    specializationTotal: clampMinimum(raw.specializationTotal ?? totals.specializations, 0),
    skillMax: clampMinimum(raw.skillMax ?? SKILL_CREATION_MAX, 0),
    specializationMax: clampMinimum(raw.specializationMax ?? getSpecializationCreationMax(lineageKey), 0),
  };
}

function normalizeBiometrics(rawValue = {}) {
  const raw = rawValue || {};

  return BIOMETRIC_FIELDS.reduce((fields, field) => {
    fields[field.key] = String(raw[field.key] || "");
    return fields;
  }, {});
}

function normalizeFeatureList(rawValue = []) {
  if (!Array.isArray(rawValue)) {
    return [];
  }

  return rawValue.map((feature) => ({
    id: feature?.id || createId(),
    source: String(feature?.source || "character"),
    sourceLabel: String(feature?.sourceLabel || ""),
    category: String(feature?.category || "Feature"),
    name: String(feature?.name || "Feature"),
    ability: String(feature?.ability || ""),
    slot: String(feature?.slot || ""),
    details: normalizeRecordDetails(feature?.details),
  }));
}

function normalizeRecordDetails(rawValue = {}) {
  if (!rawValue || typeof rawValue !== "object") {
    return {};
  }

  return Object.entries(rawValue).reduce((details, [key, value]) => {
    if (value === null || value === undefined) {
      details[key] = "";
      return details;
    }
    details[key] = typeof value === "string" ? value : JSON.stringify(value);
    return details;
  }, {});
}

function normalizeCreateCharacterDraft(rawValue = {}, options = {}) {
  const raw = rawValue || {};
  const lineageKey = getLineageOption(raw.lineageKey || raw.lineage).key;
  const backgroundKey = getBackgroundOption(raw.backgroundKey).key;
  const secondaryBackgroundKey = getBackgroundOption(raw.secondaryBackgroundKey).key;
  const corporationKey = getCorporationOption(raw.corporationKey).key;
  const backgroundOption = getBackgroundOption(backgroundKey);
  const secondaryBackgroundOption = getBackgroundOption(secondaryBackgroundKey);
  const corporationOption = getCorporationOption(corporationKey);
  const lineageAugmentOption = getAugmentOption(raw.lineageAugmentKey);
  const totals = getCreationTotalsForLineage(lineageKey);
  const specializationMax = getSpecializationCreationMax(lineageKey);
  const homeworld = EXO_HOMEWORLD_OPTIONS.includes(raw.homeworld) ? raw.homeworld : EXO_HOMEWORLD_OPTIONS[0];
  const isLineageAugment = hasLineageAugment(lineageKey);
  const defaultLineageFeatureName = getDefaultLineageFeatureName(lineageKey);
  const defaultAttributes = createBalancedValues(
    getCreationAttributeEntries().length,
    totals.attributes,
    ATTRIBUTE_CREATION_MIN,
    ATTRIBUTE_CREATION_MAX
  );
  const defaultSkills = createBalancedValues(getCreationSkillEntries().length, totals.skills, 0, SKILL_CREATION_MAX);
  const shouldResetAllocation = Boolean(options.resetAllocation);
  const ghoulDefaults = getCreationSkillEntries()
    .map((entry) => entry.ref)
    .slice(0, 9);
  const draft = {
    name: getDraftString(raw, "name", ""),
    gender: normalizeGender(raw.gender || "male"),
    lineageKey,
    backgroundKey,
    secondaryBackgroundKey,
    corporationKey,
    customCorporationName: getDraftString(raw, "customCorporationName", ""),
    corporateAbility: normalizePresetText(raw.corporateAbility, corporationOption.ability, CORPORATION_OPTIONS.map((option) => option.ability)),
    corporateSpecializationNames: normalizeFixedLengthStringList(raw.corporateSpecializationNames, 2, (index) =>
      corporationOption.specializations[index] || `Corporate Tie ${index + 1}`
    ),
    homeworld,
    homeworldAbility: normalizePresetText(
      raw.homeworldAbility,
      getHomeworldAbility(homeworld),
      Object.values(HOMEWORLD_ABILITIES)
    ),
    lineageAugmentKey: isLineageAugment ? lineageAugmentOption.key : "custom",
    lineageFeatureName: isLineageAugment
      ? normalizePresetName(
          raw.lineageFeatureName,
          lineageAugmentOption.key === "custom" ? defaultLineageFeatureName : lineageAugmentOption.label,
          [...AUGMENT_OPTIONS.map((option) => option.label), defaultLineageFeatureName]
        )
      : getDraftString(raw, "lineageFeatureName", defaultLineageFeatureName),
    lineageFeatureAbility: isLineageAugment
      ? normalizePresetText(raw.lineageFeatureAbility, lineageAugmentOption.ability, AUGMENT_OPTIONS.map((option) => option.ability))
      : getDraftString(raw, "lineageFeatureAbility", ""),
    backgroundName: normalizePresetName(raw.backgroundName, backgroundOption.label, BACKGROUND_OPTIONS.map((option) => option.label)),
    backgroundAbility: normalizePresetText(raw.backgroundAbility, backgroundOption.ability, BACKGROUND_OPTIONS.map((option) => option.ability)),
    backgroundSpecializationNames: normalizeFixedLengthStringList(raw.backgroundSpecializationNames, 6, (index) =>
      backgroundOption.specializations[index] || `Background ${index + 1}`
    ),
    secondaryBackgroundName: normalizePresetName(
      raw.secondaryBackgroundName,
      secondaryBackgroundOption.label,
      BACKGROUND_OPTIONS.map((option) => option.label)
    ),
    secondaryBackgroundAbility: normalizePresetText(
      raw.secondaryBackgroundAbility,
      secondaryBackgroundOption.ability,
      BACKGROUND_OPTIONS.map((option) => option.ability)
    ),
    lineageSpecializations: normalizeLineageSpecializationChoices(raw.lineageSpecializations, lineageKey),
    creationAugments: normalizeCreationAugments(raw.creationAugments, lineageKey, raw),
    takeTekhne: normalizeBoolean(raw.takeTekhne),
    creationTekhneName: TEKHNE_OPTIONS.includes(raw.creationTekhneName) ? raw.creationTekhneName : TEKHNE_OPTIONS[0],
    creationTekhneAbility: getDraftString(raw, "creationTekhneAbility", ""),
    takeArkhemetry: normalizeBoolean(raw.takeArkhemetry),
    creationArkhemetryName: ARKHEMETRY_OPTIONS.includes(raw.creationArkhemetryName)
      ? raw.creationArkhemetryName
      : ARKHEMETRY_OPTIONS[0],
    creationArkhemetryAbility: getDraftString(raw, "creationArkhemetryAbility", ""),
    takeCosmoglossia: normalizeBoolean(raw.takeCosmoglossia),
    creationCosmoglossiaName: "Cosmoglossia",
    creationCosmoglossiaPanels: normalizeCosmoglossiaPanels(raw.creationCosmoglossiaPanels),
    attributeScores: shouldResetAllocation
      ? defaultAttributes
      : normalizeNumberList(raw.attributeScores, defaultAttributes, ATTRIBUTE_CREATION_MIN, ATTRIBUTE_CREATION_MAX),
    skillValues: shouldResetAllocation
      ? defaultSkills
      : normalizeNumberList(raw.skillValues, defaultSkills, 0, SKILL_CREATION_MAX),
    ghoulRedactedSkillRefs:
      lineageKey === "ghoul"
        ? normalizeSkillRefs(raw.ghoulRedactedSkillRefs, ghoulDefaults)
        : [],
  };

  draft.specializationNames = getDraftSpecializationSlots(draft).map((slot) => slot.name);
  draft.specializationValues = normalizeDraftSpecializationValues(raw.specializationValues, draft, specializationMax, {
    reset: shouldResetAllocation,
  });

  return draft;
}

function getCreateCharacterDraftFromForm(form, options = {}) {
  const formData = new FormData(form);

  return normalizeCreateCharacterDraft(
    {
      name: formData.get("name"),
      gender: formData.get("gender"),
      lineageKey: formData.get("lineage"),
      corporationKey: formData.get("corporation"),
      customCorporationName: formData.get("customCorporationName"),
      corporateAbility: formData.get("corporateAbility"),
      corporateSpecializationNames: [formData.get("corporateSpecializationName0"), formData.get("corporateSpecializationName1")],
      homeworld: formData.get("homeworld"),
      homeworldAbility: formData.get("homeworldAbility"),
      lineageAugmentKey: formData.get("lineageAugmentKey"),
      lineageFeatureName: formData.get("lineageFeatureName"),
      lineageFeatureAbility: formData.get("lineageFeatureAbility"),
      backgroundKey: formData.get("backgroundKey"),
      backgroundName: formData.get("backgroundName"),
      backgroundAbility: formData.get("backgroundAbility"),
      backgroundSpecializationNames: Array.from({ length: 6 }, (_, index) =>
        formData.get(`backgroundSpecializationName${index}`)
      ),
      secondaryBackgroundKey: formData.get("secondaryKey"),
      secondaryBackgroundName: formData.get("secondaryName"),
      secondaryBackgroundAbility: formData.get("secondaryAbility"),
      lineageSpecializations: [formData.get("lineageSpecialization0"), formData.get("lineageSpecialization1")],
      creationAugments: Array.from({ length: MAX_AUGMENT_SLOTS }, (_, index) => ({
        enabled: formData.get(`creationAugmentEnabled${index}`),
        key: formData.get(`creationAugmentKey${index}`),
        name: formData.get(`creationAugmentName${index}`),
        ability: formData.get(`creationAugmentAbility${index}`),
      })),
      takeTekhne: formData.get("takeTekhne"),
      creationTekhneName: formData.get("creationTekhneName"),
      creationTekhneAbility: formData.get("creationTekhneAbility"),
      takeArkhemetry: formData.get("takeArkhemetry"),
      creationArkhemetryName: formData.get("creationArkhemetryName"),
      creationArkhemetryAbility: formData.get("creationArkhemetryAbility"),
      takeCosmoglossia: formData.get("takeCosmoglossia"),
      creationCosmoglossiaPanels: getCosmoglossiaPanelsFromFormData(formData, "creationCosmoglossia"),
      attributeScores: getCreationAttributeEntries().map((entry) => formData.get(entry.inputName)),
      skillValues: getCreationSkillEntries().map((entry) => formData.get(entry.inputName)),
      specializationValues: Array.from({ length: MAX_SPECIALIZATIONS }, (_, index) =>
        formData.get(`specializationValue${index}`)
      ),
      ghoulRedactedSkillRefs: formData.getAll("ghoulRedactedSkill"),
    },
    options
  );
}

function validateCreationDraft(draft) {
  const totals = getCreationTotalsForLineage(draft.lineageKey);
  const specializationMax = getSpecializationCreationMax(draft.lineageKey);
  const attributeTotal = getArrayTotal(draft.attributeScores);
  const skillTotal = getArrayTotal(draft.skillValues);
  const specializationTotal = getArrayTotal(draft.specializationValues);
  const adjustedSpecializationTotal = getAdjustedSpecializationTotal(totals.specializations, draft);

  if (attributeTotal !== totals.attributes) {
    return `Attributes must total ${totals.attributes}.`;
  }

  if (skillTotal !== totals.skills) {
    return `Skills must total ${totals.skills}.`;
  }

  if (draft.skillValues.some((value) => value > SKILL_CREATION_MAX)) {
    return `No starting skill can exceed ${SKILL_CREATION_MAX}.`;
  }

  if (getOptionalCreationFeatureCount(draft) * 10 > totals.specializations) {
    return "This lineage does not have enough specialization points for those optional features.";
  }

  if (specializationTotal !== adjustedSpecializationTotal) {
    return `Specializations must total ${adjustedSpecializationTotal}.`;
  }

  if (draft.specializationValues.some((value) => value > specializationMax)) {
    return `No starting specialization can exceed ${specializationMax}.`;
  }

  if (draft.lineageKey === "ghoul" && draft.ghoulRedactedSkillRefs.length !== 9) {
    return "Ghoul characters must black out exactly 9 skills.";
  }

  if (draft.lineageSpecializations[0] === draft.lineageSpecializations[1]) {
    return "Lineage specialization slots 7 and 8 must be different.";
  }

  return "";
}

function createCharacterFromDraft(draft) {
  const finalName = draft.name.trim() || getCreateCharacterNamePlaceholder();
  const lineageOption = getLineageOption(draft.lineageKey);
  const backgroundOption = getBackgroundOption(draft.backgroundKey);
  const totals = getCreationTotalsForLineage(draft.lineageKey);
  const adjustedSpecializationTotal = getAdjustedSpecializationTotal(totals.specializations, draft);
  const character = createCharacter(finalName, draft.gender);

  character.lineage = normalizeLineageRecord({
    key: lineageOption.key,
    label: lineageOption.label,
    details: buildLineageDetails(draft),
  });
  character.background = normalizeBackgroundRecord({
    key: backgroundOption.key,
    name: draft.backgroundName || backgroundOption.label,
    ability: draft.backgroundAbility || backgroundOption.ability,
    secondary:
      draft.lineageKey === "aberrant"
        ? {
            key: draft.secondaryBackgroundKey,
            name: draft.secondaryBackgroundName || getBackgroundOption(draft.secondaryBackgroundKey).label,
            ability: draft.secondaryBackgroundAbility || getBackgroundOption(draft.secondaryBackgroundKey).ability,
          }
        : null,
  });
  character.creation = normalizeCreationRecord(
    {
      attributeTotal: totals.attributes,
      skillTotal: totals.skills,
      specializationTotal: adjustedSpecializationTotal,
      skillMax: SKILL_CREATION_MAX,
      specializationMax: getSpecializationCreationMax(draft.lineageKey),
    },
    draft.lineageKey
  );

  getCreationAttributeEntries().forEach((entry, index) => {
    character.sections[entry.sectionId].attributes[entry.attributeIndex].score = draft.attributeScores[index];
  });

  getCreationSkillEntries().forEach((entry, index) => {
    const skill = character.sections[entry.sectionId].skills[entry.skillIndex];
    skill.value = draft.skillValues[index];
    skill.redacted = draft.lineageKey === "ghoul" && draft.ghoulRedactedSkillRefs.includes(entry.ref);
  });

  character.specializations = getDraftSpecializationSlots(draft).map((slot) => ({
    id: character.specializations[slot.index]?.id || createId(),
    name: slot.name || getSpecializationLabel(slot.index),
    value: draft.specializationValues[slot.index] || 0,
    active: slot.active,
    source: slot.source,
    sourceLabel: slot.sourceLabel,
  }));

  character.features = buildCreationFeatures(draft);
  applyFeatureSlotsToSheet(character);

  return normalizeCharacter(character);
}

function buildLineageDetails(draft) {
  if (draft.lineageKey === "terran") {
    const corporation = getCorporationOption(draft.corporationKey);
    return {
      corporationKey: corporation.key,
      corporationName: getCorporateDisplayName(draft),
      optionalSpecializations: corporation.specializations.join(", "),
    };
  }

  if (draft.lineageKey === "exo") {
    return { homeworld: draft.homeworld };
  }

  return {};
}

function buildCreationFeatures(draft) {
  return [
    ...buildLineageFeatures(draft),
    ...buildBackgroundFeatures(draft, "primary"),
    ...(draft.lineageKey === "aberrant" ? buildBackgroundFeatures(draft, "secondary") : []),
    ...buildOptionalCreationFeatures(draft),
  ].map((feature) => ({
    id: createId(),
    ...feature,
  }));
}

function buildLineageFeatures(draft) {
  const lineage = getLineageOption(draft.lineageKey);

  if (draft.lineageKey === "terran") {
    return [
      createFeatureRecord({
        source: "lineage",
        sourceLabel: lineage.label,
        category: "Corporate Ties",
        name: `Corporate Ties: ${getCorporateDisplayName(draft)}`,
        ability: draft.corporateAbility,
        details: buildLineageDetails(draft),
      }),
    ];
  }

  if (draft.lineageKey === "exo") {
    return [
      createFeatureRecord({
        source: "lineage",
        sourceLabel: lineage.label,
        category: "Homeworld",
        name: `Homeworld: ${draft.homeworld}`,
        ability: draft.homeworldAbility,
        details: { homeworld: draft.homeworld },
      }),
    ];
  }

  if (["voidborn", "aberrant", "ghoul", "cyborg"].includes(draft.lineageKey)) {
    const categoryByLineage = {
      voidborn: "Natural Augment",
      aberrant: "Bio-Augment",
      ghoul: "Radio-Augment",
      cyborg: "Mech-Augment",
    };
    return [
      createFeatureRecord({
        source: "lineage",
        sourceLabel: lineage.label,
        category: categoryByLineage[draft.lineageKey],
        name: draft.lineageFeatureName || categoryByLineage[draft.lineageKey],
        ability: draft.lineageFeatureAbility,
        slot: "augment",
        details: { presetKey: draft.lineageAugmentKey },
      }),
    ];
  }

  if (draft.lineageKey === "golem") {
    return [
      createFeatureRecord({
        source: "lineage",
        sourceLabel: lineage.label,
        category: "Configuration",
        name: draft.lineageFeatureName || "Configuration",
        ability: draft.lineageFeatureAbility,
        slot: "configuration",
      }),
    ];
  }

  if (draft.lineageKey === "android") {
    return [
      createFeatureRecord({
        source: "lineage",
        sourceLabel: lineage.label,
        category: "Protocol",
        name: draft.lineageFeatureName || "Protocol",
        ability: draft.lineageFeatureAbility,
        slot: "protocol",
      }),
    ];
  }

  if (draft.lineageKey === "chimera") {
    return [
      createFeatureRecord({
        source: "lineage",
        sourceLabel: lineage.label,
        category: "Hybrid Animal",
        name: draft.lineageFeatureName || "Hybrid Animal",
        ability: draft.lineageFeatureAbility,
        slot: "hybrid",
      }),
    ];
  }

  return [];
}

function buildBackgroundFeatures(draft, slot) {
  const isSecondary = slot === "secondary";
  const key = isSecondary ? draft.secondaryBackgroundKey : draft.backgroundKey;
  const option = getBackgroundOption(key);
  const backgroundName = isSecondary
    ? draft.secondaryBackgroundName || option.label
    : draft.backgroundName || option.label;
  const ability =
    (isSecondary ? draft.secondaryBackgroundAbility : draft.backgroundAbility) || option.ability;
  const sourceLabel = isSecondary ? `Second Background: ${backgroundName}` : `Background: ${backgroundName}`;

  return [
    createFeatureRecord({
      source: isSecondary ? "secondary-background" : "background",
      sourceLabel,
      category: "Background",
      name: backgroundName,
      ability,
    }),
  ];
}

function buildOptionalCreationFeatures(draft) {
  const features = [];

  getEnabledCreationAugments(draft).forEach((augment) => {
    features.push(
      createFeatureRecord({
        source: "creation-feature",
        sourceLabel: "Creation Feature",
        category: "Augment",
        name: augment.name,
        ability: augment.ability,
        slot: "augment",
        details: { presetKey: augment.key },
      })
    );
  });

  if (draft.takeTekhne) {
    features.push(
      createFeatureRecord({
        source: "creation-feature",
        sourceLabel: "Creation Feature",
        category: "Tekhne",
        name: `Tekhne: ${draft.creationTekhneName}`,
        ability: draft.creationTekhneAbility,
        slot: "tekhne",
      })
    );
  }

  if (draft.takeArkhemetry) {
    features.push(
      createFeatureRecord({
        source: "creation-feature",
        sourceLabel: "Creation Feature",
        category: "Arkhemetry",
        name: draft.creationArkhemetryName || "Arkhemetry",
        ability: draft.creationArkhemetryAbility,
        slot: "arkhemetry",
      })
    );
  }

  if (draft.takeCosmoglossia) {
    const panels = normalizeCosmoglossiaPanels(draft.creationCosmoglossiaPanels);
    features.push(
      createFeatureRecord({
        source: "creation-feature",
        sourceLabel: "Creation Feature",
        category: "Cosmoglossia",
        name: draft.creationCosmoglossiaName || "Cosmoglossia",
        ability: formatCosmoglossiaPanels(panels),
        slot: "cosmoglossia",
        details: { cosmoglossiaPanels: serializeCosmoglossiaPanels(panels) },
      })
    );
  }

  return features;
}

function createFeatureRecord({ source, sourceLabel, category, name, ability, slot = "", details = {} }) {
  return {
    source,
    sourceLabel,
    category,
    name: name || category,
    ability: ability || "",
    slot,
    details,
  };
}

function applyFeatureSlotsToSheet(character) {
  const augmentAttributes = character.sections.soul.attributes;

  character.features.forEach((feature) => {
    if (feature.slot === "augment") {
      const target = augmentAttributes.find((attribute) => !normalizeAttributeDetail(attribute.detail).name);
      if (target) {
        target.detail = {
          name: feature.name,
          description: feature.ability,
          presetKey: feature.details?.presetKey || "custom",
        };
      }
      return;
    }

    if (feature.slot === "tekhne") {
      character.sections.spirit.attributes[0].detail = { name: feature.name, description: feature.ability };
      return;
    }

    if (feature.slot === "arkhemetry") {
      character.sections.spirit.attributes[1].detail = { name: feature.name, description: feature.ability };
      return;
    }

    if (feature.slot === "cosmoglossia") {
      character.sections.spirit.attributes[2].detail = {
        name: feature.name,
        description: feature.ability,
        cosmoglossiaPanels: feature.details?.cosmoglossiaPanels || "",
      };
    }
  });
}

function getCreationTotalsForLineage(lineageKey) {
  if (lineageKey === "golem") {
    return { attributes: 90, skills: 0, specializations: 0 };
  }

  if (lineageKey === "android") {
    return { attributes: 72, skills: 50, specializations: 100 };
  }

  if (lineageKey === "cyborg") {
    return { attributes: 72, skills: 150, specializations: 0 };
  }

  return { attributes: 72, skills: 100, specializations: 50 };
}

function getSpecializationCreationMax(lineageKey) {
  return lineageKey === "android" ? ANDROID_SPECIALIZATION_CREATION_MAX : DEFAULT_SPECIALIZATION_CREATION_MAX;
}

function getCreationAttributeEntries() {
  return SECTION_TEMPLATES.flatMap((section) =>
    section.attributes.map((attribute, attributeIndex) => ({
      sectionId: section.id,
      attributeIndex,
      label: attribute.label,
      inputName: `attribute-${section.id}-${attributeIndex}`,
    }))
  );
}

function getCreationSkillEntries() {
  return SECTION_TEMPLATES.flatMap((section) =>
    section.skills.map((skill, skillIndex) => ({
      sectionId: section.id,
      skillIndex,
      label: skill,
      ref: `${section.id}:${skillIndex}`,
      inputName: `skill-${section.id}-${skillIndex}`,
    }))
  );
}

function createBalancedValues(count, total, minimum, maximum) {
  const values = Array.from({ length: count }, () => minimum);
  let remaining = Math.max(0, total - minimum * count);

  values.forEach((_, index) => {
    if (remaining <= 0) {
      return;
    }
    const slotsRemaining = count - index;
    const increment = Math.min(maximum - minimum, Math.ceil(remaining / slotsRemaining));
    values[index] += increment;
    remaining -= increment;
  });

  return values;
}

function normalizeNumberList(rawValues, fallbackValues, minimum, maximum) {
  const source = Array.isArray(rawValues) ? rawValues : [];

  return fallbackValues.map((fallback, index) => {
    const rawValue = source[index];
    if (rawValue === undefined || rawValue === null || rawValue === "") {
      return fallback;
    }
    return clampNumber(rawValue, minimum, maximum);
  });
}

function normalizeSkillRefs(rawValues, fallbackValues) {
  const validRefs = new Set(getCreationSkillEntries().map((entry) => entry.ref));
  const source = Array.isArray(rawValues) && rawValues.length ? rawValues : fallbackValues;

  return [...new Set(source.map((value) => String(value)).filter((value) => validRefs.has(value)))];
}

function getDraftString(raw, key, fallback) {
  if (Object.prototype.hasOwnProperty.call(raw, key) && raw[key] !== null && raw[key] !== undefined) {
    return String(raw[key]);
  }
  return fallback;
}

function getLineageOption(key) {
  return LINEAGE_OPTIONS.find((option) => option.key === key) || LINEAGE_OPTIONS[0];
}

function getCorporationOption(key) {
  return CORPORATION_OPTIONS.find((option) => option.key === key) || CORPORATION_OPTIONS[0];
}

function getBackgroundOption(key) {
  return BACKGROUND_OPTIONS.find((option) => option.key === key) || BACKGROUND_OPTIONS[0];
}

function getCorporateDisplayName(draft) {
  const corporation = getCorporationOption(draft.corporationKey);
  if (corporation.key === "custom") {
    return draft.customCorporationName || corporation.label;
  }
  return corporation.label;
}

function getDefaultLineageFeatureName(lineageKey) {
  const names = {
    voidborn: "Natural Augment",
    aberrant: "Bio-Augment",
    ghoul: "Radio-Augment",
    cyborg: "Mech-Augment",
    golem: "Configuration",
    android: "Protocol",
    chimera: "Hybrid Animal",
  };

  return names[lineageKey] || "";
}

function getAugmentOption(key) {
  return AUGMENT_OPTIONS.find((option) => option.key === key) || AUGMENT_OPTIONS[0];
}

function getHomeworldAbility(homeworld) {
  return HOMEWORLD_ABILITIES[homeworld] || "";
}

function hasLineageAugment(lineageKey) {
  return ["voidborn", "aberrant", "ghoul", "cyborg"].includes(lineageKey);
}

function getAvailableCreationAugmentSlots(lineageKey) {
  return Math.max(0, MAX_AUGMENT_SLOTS - (hasLineageAugment(lineageKey) ? 1 : 0));
}

function createDefaultCreationAugment(index = 0) {
  return {
    enabled: false,
    key: "custom",
    name: `Augment ${index + 1}`,
    ability: "",
  };
}

function normalizeCreationAugments(rawAugments, lineageKey, legacyRaw = {}) {
  const capacity = getAvailableCreationAugmentSlots(lineageKey);
  let source = Array.isArray(rawAugments) ? rawAugments : [];

  if (!source.length && normalizeBoolean(legacyRaw.takeAugment)) {
    source = [
      {
        enabled: true,
        key: legacyRaw.creationAugmentKey,
        name: legacyRaw.creationAugmentName,
        ability: legacyRaw.creationAugmentAbility,
      },
    ];
  }

  return Array.from({ length: capacity }, (_, index) => normalizeCreationAugment(source[index], index));
}

function normalizeCreationAugment(rawValue, index) {
  const raw = rawValue || {};
  const option = getAugmentOption(raw.key);
  const fallbackName = option.key === "custom" ? `Augment ${index + 1}` : option.label;

  return {
    enabled: normalizeBoolean(raw.enabled),
    key: option.key,
    name: normalizePresetName(raw.name, fallbackName, [
      ...AUGMENT_OPTIONS.map((augment) => augment.label),
      `Augment ${index + 1}`,
    ]),
    ability: normalizePresetText(raw.ability, option.ability, AUGMENT_OPTIONS.map((augment) => augment.ability)),
  };
}

function getEnabledCreationAugments(draft) {
  return (draft.creationAugments || []).filter((augment) => augment.enabled);
}

function getCosmoglossiaColor(key) {
  return COSMOGLOSSIA_COLORS.find((color) => color.key === key) || COSMOGLOSSIA_COLORS[0];
}

function normalizeSingleWord(value) {
  return String(value || "").trim().split(/\s+/)[0] || "";
}

function parseCosmoglossiaPanels(rawValue) {
  if (Array.isArray(rawValue)) {
    return rawValue;
  }

  if (typeof rawValue === "string" && rawValue.trim()) {
    try {
      const parsed = JSON.parse(rawValue);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function normalizeCosmoglossiaPanels(rawValue) {
  const source = parseCosmoglossiaPanels(rawValue);
  return Array.from({ length: COSMOGLOSSIA_PANEL_COUNT }, (_, index) => {
    const panel = source[index] || {};
    const defaultColor = COSMOGLOSSIA_COLORS[index % COSMOGLOSSIA_COLORS.length].key;
    const color = getCosmoglossiaColor(panel.color || defaultColor).key;
    return {
      color,
      word: normalizeSingleWord(panel.word),
    };
  });
}

function serializeCosmoglossiaPanels(panels) {
  return JSON.stringify(normalizeCosmoglossiaPanels(panels));
}

function formatCosmoglossiaPanels(panels) {
  const filledPanels = normalizeCosmoglossiaPanels(panels)
    .filter((panel) => panel.word)
    .map((panel) => `${panel.color}: ${panel.word}`);
  return filledPanels.join("; ");
}

function getCosmoglossiaPanelsFromFormData(formData, prefix) {
  return Array.from({ length: COSMOGLOSSIA_PANEL_COUNT }, (_, index) => ({
    color: formData.get(`${prefix}Color${index}`),
    word: formData.get(`${prefix}Word${index}`),
  }));
}

function normalizeBoolean(value) {
  return value === true || value === "true" || value === "on";
}

function normalizePresetName(rawValue, presetValue, knownValues) {
  const value = String(rawValue || "").trim();
  if (!value || knownValues.some((knownValue) => knownValue && knownValue === value && value !== presetValue)) {
    return presetValue || "";
  }
  return value;
}

function normalizePresetText(rawValue, presetValue, knownValues) {
  const value = String(rawValue || "").trim();
  if (!value || knownValues.some((knownValue) => knownValue && knownValue === value && value !== presetValue)) {
    return presetValue || "";
  }
  return value;
}

function normalizeFixedLengthStringList(rawValues, length, fallbackFactory) {
  const source = Array.isArray(rawValues) ? rawValues : [];
  return Array.from({ length }, (_, index) => {
    const value = String(source[index] || "").trim();
    return value || fallbackFactory(index);
  });
}

function normalizeLineageSpecializationChoices(rawValues, lineageKey) {
  const options = getLineageOption(lineageKey).specializations;
  const source = Array.isArray(rawValues) ? rawValues : [];
  const first = options.includes(source[0]) ? source[0] : options[0];
  const fallbackSecond = options.find((option) => option !== first) || options[1] || first;
  const second = options.includes(source[1]) && source[1] !== first ? source[1] : fallbackSecond;
  return [first, second];
}

function getOptionalCreationFeatureCount(draft) {
  return (
    getEnabledCreationAugments(draft).length +
    [draft.takeTekhne, draft.takeArkhemetry, draft.takeCosmoglossia].filter(Boolean).length
  );
}

function getAdjustedSpecializationTotal(baseTotal, draft) {
  return Math.max(0, baseTotal - getOptionalCreationFeatureCount(draft) * 10);
}

function getBackgroundSpecializationOptionsForDraft(draft) {
  const primary = getBackgroundOption(draft.backgroundKey).specializations;
  const secondary = draft.lineageKey === "aberrant" ? getBackgroundOption(draft.secondaryBackgroundKey).specializations : [];
  return [...new Set([...primary, ...secondary].filter(Boolean))];
}

function getDraftSpecializationSlots(draft) {
  const baseTotal = getCreationTotalsForLineage(draft.lineageKey).specializations;
  const backgroundOption = getBackgroundOption(draft.backgroundKey);
  const corporation = getCorporationOption(draft.corporationKey);
  const hasSpecializationPool = baseTotal > 0;
  const backgroundChoiceOptions = getBackgroundSpecializationOptionsForDraft(draft);
  const usesBackgroundChoices = draft.lineageKey === "aberrant" && backgroundChoiceOptions.length > 0;
  const slots = Array.from({ length: MAX_SPECIALIZATIONS }, (_, index) => ({
    index,
    active: false,
    name: getSpecializationLabel(index),
    source: "",
    sourceLabel: "",
    kind: "static",
  }));

  if (!hasSpecializationPool) {
    return slots;
  }

  for (let index = 0; index < 6; index += 1) {
    const isCustom = draft.backgroundKey === "custom";
    const savedName = draft.backgroundSpecializationNames[index] || "";
    const presetName = backgroundOption.specializations[index] || getSpecializationLabel(index);
    const backgroundChoiceName = backgroundChoiceOptions.includes(savedName)
      ? savedName
      : backgroundChoiceOptions[index % backgroundChoiceOptions.length] || presetName;
    slots[index] = {
      index,
      active: true,
      name: usesBackgroundChoices
        ? backgroundChoiceName
        : isCustom
          ? savedName || getSpecializationLabel(index)
          : presetName,
      source: "background",
      sourceLabel: usesBackgroundChoices ? "Aberrant Backgrounds" : draft.backgroundName || backgroundOption.label,
      kind: usesBackgroundChoices ? "background-choice" : isCustom ? "background-custom" : "background",
      options: usesBackgroundChoices ? backgroundChoiceOptions : [],
    };
  }

  draft.lineageSpecializations.forEach((name, offset) => {
    const index = 6 + offset;
    slots[index] = {
      index,
      active: true,
      name,
      source: "lineage",
      sourceLabel: getLineageOption(draft.lineageKey).label,
      kind: "lineage",
    };
  });

  if (draft.lineageKey === "terran") {
    const corporateNames = corporation.specializations.length
      ? corporation.specializations
      : draft.corporateSpecializationNames;
    for (let offset = 0; offset < 2; offset += 1) {
      const index = 8 + offset;
      slots[index] = {
        index,
        active: true,
        name: corporateNames[offset] || `Corporate Tie ${offset + 1}`,
        source: "corporate",
        sourceLabel: getCorporateDisplayName(draft),
        kind: corporation.specializations.length ? "corporate" : "corporate-custom",
      };
    }
  }

  getDraftAugmentSpecializationNames(draft).forEach((name, offset) => {
    const index = 10 + offset;
    if (index > 12) {
      return;
    }
    slots[index] = {
      index,
      active: true,
      name,
      source: "augment",
      sourceLabel: name,
      kind: "feature",
    };
  });

  if (draft.takeTekhne) {
    slots[13] = {
      index: 13,
      active: true,
      name: draft.creationTekhneName,
      source: "tekhne",
      sourceLabel: draft.creationTekhneName,
      kind: "feature",
    };
  }

  if (draft.takeArkhemetry) {
    slots[14] = {
      index: 14,
      active: true,
      name: draft.creationArkhemetryName || "Arkhemetry",
      source: "arkhemetry",
      sourceLabel: draft.creationArkhemetryName || "Arkhemetry",
      kind: "feature",
    };
  }

  if (draft.takeCosmoglossia) {
    slots[15] = {
      index: 15,
      active: true,
      name: draft.creationCosmoglossiaName || "Cosmoglossia",
      source: "cosmoglossia",
      sourceLabel: draft.creationCosmoglossiaName || "Cosmoglossia",
      kind: "feature",
    };
  }

  return slots;
}

function getDraftAugmentSpecializationNames(draft) {
  const names = [];
  if (hasLineageAugment(draft.lineageKey)) {
    names.push(draft.lineageFeatureName || getDefaultLineageFeatureName(draft.lineageKey));
  }
  getEnabledCreationAugments(draft).forEach((augment) => {
    names.push(augment.name || getAugmentOption(augment.key).label);
  });
  return names.slice(0, 3);
}

function normalizeDraftSpecializationValues(rawValues, draft, specializationMax, options = {}) {
  const activeIndexes = getDraftSpecializationSlots(draft)
    .filter((slot) => slot.active)
    .map((slot) => slot.index);
  const adjustedTotal = getAdjustedSpecializationTotal(
    getCreationTotalsForLineage(draft.lineageKey).specializations,
    draft
  );
  const fallback = createSpecializationValueDefaults(activeIndexes, adjustedTotal, specializationMax);

  if (options.reset || !Array.isArray(rawValues)) {
    return fallback;
  }

  return Array.from({ length: MAX_SPECIALIZATIONS }, (_, index) => {
    if (!activeIndexes.includes(index)) {
      return 0;
    }
    const rawValue = rawValues[index];
    if (rawValue === undefined || rawValue === null || rawValue === "") {
      return fallback[index];
    }
    return clampNumber(rawValue, 0, specializationMax);
  });
}

function createSpecializationValueDefaults(activeIndexes, total, maximum) {
  const values = Array.from({ length: MAX_SPECIALIZATIONS }, () => 0);
  if (!activeIndexes.length || total <= 0) {
    return values;
  }

  let remaining = total;
  activeIndexes.forEach((slotIndex, orderIndex) => {
    if (remaining <= 0) {
      return;
    }
    const slotsRemaining = activeIndexes.length - orderIndex;
    const value = Math.min(maximum, Math.ceil(remaining / slotsRemaining));
    values[slotIndex] = value;
    remaining -= value;
  });

  return values;
}

function getVisibleSpecializationEntries(character) {
  return character.specializations
    .map((specialization, index) => ({ specialization, index }))
    .filter((entry) => entry.specialization.active || entry.specialization.value > 0);
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
  if (state.characters.length) {
    state.ui.activeModal = null;
  } else {
    openCreateCharacterModal(false);
  }
  state.ui.skillLossSelectionSection = null;
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
  state.ui.skillLossSelectionSection = null;
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
      presetKey: String(rawValue.presetKey || "custom"),
      cosmoglossiaPanels: normalizeCosmoglossiaPanels(rawValue.cosmoglossiaPanels),
    };
  }

  if (typeof rawValue === "string" && rawValue.trim()) {
    return {
      name: rawValue.trim(),
      description: "",
      presetKey: "custom",
      cosmoglossiaPanels: normalizeCosmoglossiaPanels([]),
    };
  }

  return { name: "", description: "", presetKey: "custom", cosmoglossiaPanels: normalizeCosmoglossiaPanels([]) };
}

function getAttributeDetailKind(sectionId, attributeIndex) {
  if (sectionId === "soul") {
    return "augment";
  }

  if (sectionId === "spirit" && attributeIndex === 0) {
    return "tekhne";
  }

  if (sectionId === "spirit" && attributeIndex === 1) {
    return "arkhemetry";
  }

  if (sectionId === "spirit" && attributeIndex === 2) {
    return "cosmoglossia";
  }

  return "generic";
}

function buildAttributeDetailFromFormData(formData) {
  const sectionId = String(formData.get("sectionId") || "");
  const attributeIndex = Number(formData.get("attributeIndex"));
  const fallbackName = String(formData.get("detailFallback") || "Ability");
  const kind = getAttributeDetailKind(sectionId, attributeIndex);

  if (kind === "augment") {
    const option = getAugmentOption(formData.get("detailAugmentKey"));
    return {
      name: normalizePresetName(
        formData.get("detailName"),
        option.key === "custom" ? fallbackName : option.label,
        AUGMENT_OPTIONS.map((augment) => augment.label)
      ),
      description: normalizePresetText(
        formData.get("detailDescription"),
        option.ability,
        AUGMENT_OPTIONS.map((augment) => augment.ability)
      ),
      presetKey: option.key,
      cosmoglossiaPanels: normalizeCosmoglossiaPanels([]),
    };
  }

  if (kind === "tekhne") {
    const name = TEKHNE_OPTIONS.includes(formData.get("detailName")) ? formData.get("detailName") : TEKHNE_OPTIONS[0];
    return {
      name,
      description: String(formData.get("detailDescription") || "").trim(),
      presetKey: "custom",
      cosmoglossiaPanels: normalizeCosmoglossiaPanels([]),
    };
  }

  if (kind === "arkhemetry") {
    const name = ARKHEMETRY_OPTIONS.includes(formData.get("detailName"))
      ? formData.get("detailName")
      : ARKHEMETRY_OPTIONS[0];
    return {
      name,
      description: String(formData.get("detailDescription") || "").trim(),
      presetKey: "custom",
      cosmoglossiaPanels: normalizeCosmoglossiaPanels([]),
    };
  }

  if (kind === "cosmoglossia") {
    const panels = normalizeCosmoglossiaPanels(getCosmoglossiaPanelsFromFormData(formData, "detailCosmoglossia"));
    return {
      name: "Cosmoglossia",
      description: formatCosmoglossiaPanels(panels),
      presetKey: "custom",
      cosmoglossiaPanels: panels,
    };
  }

  return {
    name: String(formData.get("detailName") || "").trim(),
    description: String(formData.get("detailDescription") || "").trim(),
    presetKey: "custom",
    cosmoglossiaPanels: normalizeCosmoglossiaPanels([]),
  };
}

function getBodyDerivedValue(attribute, character) {
  const lineageKey = character?.lineage?.key || "";

  if (attribute.key === "power") {
    const bulk = attribute.score * 2;
    return lineageKey === "golem" ? bulk * 2 : bulk;
  }
  if (attribute.key === "control") {
    const accuracy = 12 - attribute.score;
    return lineageKey === "cyborg" ? Math.floor(accuracy / 2) : accuracy;
  }
  return lineageKey === "android" ? attribute.score + 2 : attribute.score;
}

function getDisplayedDice(lastRoll) {
  if (!lastRoll) {
    return [
      { value: "-", sides: 6, tone: "specialization" },
      { value: "-", sides: 6, tone: "specialization" },
    ];
  }

  if (Array.isArray(lastRoll.displayedDice) && lastRoll.displayedDice.length) {
    return lastRoll.displayedDice.map((die) => ({
      value: die.value,
      sides: die.sides,
      tone: die.tone || lastRoll.tone || "specialization",
    }));
  }

  return lastRoll.results.map((value, index) => ({
    value,
    sides: lastRoll.diceSides[index] || 6,
    tone: lastRoll.tone || "specialization",
  }));
}

function getDieArt(sides) {
  if (sides <= 4) {
    return DIE_ART.d4;
  }

  if (sides <= 6) {
    return DIE_ART.d6;
  }

  if (sides <= 8) {
    return DIE_ART.d8;
  }

  if (sides <= 10) {
    return DIE_ART.d10;
  }

  if (sides <= 12) {
    return DIE_ART.d12;
  }

  return DIE_ART.d20;
}

function getCharacterRollTone(attributeSectionId, skillSectionId, outsideIdentity) {
  if (outsideIdentity || attributeSectionId !== skillSectionId) {
    return "specialization";
  }

  if (attributeSectionId === "body" || attributeSectionId === "soul" || attributeSectionId === "spirit") {
    return attributeSectionId;
  }

  return "specialization";
}

function selectScoredDice(results, diceSides) {
  if (!results.length) {
    return {
      base: 0,
      criticalBonus: 0,
      criticalLabel: "",
      total: 0,
      orderedResults: ["-"],
      displayedDice: [],
      displayedResultIndexes: [],
    };
  }

  if (results.length === 1) {
    return {
      base: Number(results[0]),
      criticalBonus: 0,
      criticalLabel: "",
      total: Number(results[0]),
      orderedResults: [String(results[0])],
      displayedDice: [{ resultIndex: 0, value: results[0], sides: diceSides[0] || 6 }],
      displayedResultIndexes: [0],
    };
  }

  let bestPair = null;

  for (let leftIndex = 0; leftIndex < results.length - 1; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < results.length; rightIndex += 1) {
      const pair = evaluateDicePair(results, diceSides, leftIndex, rightIndex);
      if (!bestPair || pair.total > bestPair.total || (pair.total === bestPair.total && pair.base > bestPair.base)) {
        bestPair = pair;
      }
    }
  }

  return bestPair;
}

function evaluateDicePair(results, diceSides, leftIndex, rightIndex) {
  const pair = [
    { resultIndex: leftIndex, value: results[leftIndex], sides: diceSides[leftIndex] || 6 },
    { resultIndex: rightIndex, value: results[rightIndex], sides: diceSides[rightIndex] || 6 },
  ].sort((left, right) => right.value - left.value || left.resultIndex - right.resultIndex);

  const orderedResults = pair.map((entry) => entry.value);
  const base = Number(orderedResults.join(""));
  let criticalBonus = 0;
  let criticalLabel = "";

  if (orderedResults[0] === 2 && orderedResults[1] === 1) {
    criticalBonus = 100;
    criticalLabel = "21 surge +100";
  } else if (orderedResults[0] === orderedResults[1]) {
    criticalBonus = 50;
    criticalLabel = "Double match +50";
  }

  return {
    base,
    criticalBonus,
    criticalLabel,
    total: base + criticalBonus,
    orderedResults,
    displayedDice: pair,
    displayedResultIndexes: pair.map((entry) => entry.resultIndex),
  };
}

function clampNumber(value, minimum, maximum) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return minimum;
  }
  return Math.min(maximum, Math.max(minimum, numeric));
}

function clampMinimum(value, minimum) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return minimum;
  }
  return Math.max(minimum, numeric);
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

function getSpecializationName(specialization, index) {
  return String(specialization?.name || "").trim() || getSpecializationLabel(index);
}

function getGenderLabel(value) {
  return GENDER_OPTIONS.find((option) => option.value === value)?.label || "Male";
}

function getArrayTotal(values) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

function getAttributeTotal(character) {
  return SECTION_TEMPLATES.reduce(
    (total, section) =>
      total + character.sections[section.id].attributes.reduce((sectionTotal, attribute) => sectionTotal + attribute.score, 0),
    0
  );
}

function getSkillTotal(character) {
  return SECTION_TEMPLATES.reduce(
    (total, section) =>
      total + character.sections[section.id].skills.reduce((sectionTotal, skill) => sectionTotal + skill.value, 0),
    0
  );
}

function getSpecializationTotal(character) {
  return character.specializations.reduce((total, specialization) => total + specialization.value, 0);
}

function readImageFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", reject);
    reader.readAsDataURL(file);
  });
}

function getSectionTitle(sectionId) {
  return SECTION_TEMPLATES.find((section) => section.id === sectionId)?.title || "Section";
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

function openCreateCharacterModal(shouldCloseMenu = true) {
  state.ui.skillLossSelectionSection = null;
  state.ui.activeModal = { type: "create-character" };
  if (shouldCloseMenu) {
    state.ui.isCharacterMenuOpen = false;
  }
  advanceCreateCharacterNameSuggestion();
}

function advanceCreateCharacterNameSuggestion() {
  state.ui.createCharacterNameSuggestionIndex = pickNextNameSuggestionIndex(
    state.ui.createCharacterNameSuggestionIndex
  );
}

function pickNextNameSuggestionIndex(currentIndex) {
  if (NAME_PLACEHOLDER_SUGGESTIONS.length <= 1) {
    return 0;
  }

  const usedNames = new Set((state?.characters || []).map((character) => character.name.toLowerCase()));
  const availableIndexes = NAME_PLACEHOLDER_SUGGESTIONS.map((name, index) => ({ name, index }))
    .filter((entry) => entry.index !== currentIndex)
    .filter((entry) => !usedNames.has(entry.name.toLowerCase()))
    .map((entry) => entry.index);
  const fallbackIndexes = NAME_PLACEHOLDER_SUGGESTIONS.map((_, index) => index).filter((index) => index !== currentIndex);
  const candidates = availableIndexes.length ? availableIndexes : fallbackIndexes;

  return candidates[Math.floor(Math.random() * candidates.length)] ?? 0;
}

function getCreateCharacterNamePlaceholder() {
  const index = state.ui.createCharacterNameSuggestionIndex;
  if (index < 0 || index >= NAME_PLACEHOLDER_SUGGESTIONS.length) {
    return NAME_PLACEHOLDER_SUGGESTIONS[0];
  }
  return NAME_PLACEHOLDER_SUGGESTIONS[index];
}

function rotateCreateCharacterNameSuggestion(event, input) {
  if (event.relatedTarget instanceof Node && input.contains(event.relatedTarget)) {
    return;
  }

  advanceCreateCharacterNameSuggestion();
  input.placeholder = getCreateCharacterNamePlaceholder();
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

function getSectionEffectIcon(sectionId) {
  if (sectionId === "body") {
    return iconBrokenBone();
  }
  if (sectionId === "soul") {
    return iconBrain();
  }
  return iconSpiral();
}

function iconBrokenBone() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.3 7.3a2.1 2.1 0 1 1-3-3l1 1 .8-.8-.8-.8 1-1a2.1 2.1 0 1 1 3 3l-1 1 4.2 4.2-1.6 1.6-4.2-4.2Z"></path>
      <path d="m15.3 13.3 4.2 4.2-1 1a2.1 2.1 0 1 0 3 3l1-1-.8-.8.8-.8-1-1a2.1 2.1 0 1 0-3-3l-1 1-4.2-4.2Z"></path>
    </svg>
  `;
}

function iconBrain() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 5.3A2.8 2.8 0 0 0 5.4 8a3 3 0 0 0 .5 5.8A3.3 3.3 0 0 0 9.5 18v1"></path>
      <path d="M14 5.3A2.8 2.8 0 0 1 18.6 8a3 3 0 0 1-.5 5.8 3.3 3.3 0 0 1-3.6 4.2v1"></path>
      <path d="M10 5.3v13.7"></path>
      <path d="M14 5.3v13.7"></path>
      <path d="M9.8 9.5A2.5 2.5 0 0 1 7.4 12"></path>
      <path d="M14.2 9.5A2.5 2.5 0 0 0 16.6 12"></path>
    </svg>
  `;
}

function iconSpiral() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 19.3a7.3 7.3 0 1 1 6.1-3.4"></path>
      <path d="M12 15.9a3.9 3.9 0 1 1 3.3-1.9"></path>
      <path d="M12 12.4a.2.2 0 1 1 0-.4"></path>
    </svg>
  `;
}
