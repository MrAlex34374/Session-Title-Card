/**
 * GM configuration window. The form is built with DOM calls (no template file) and drives the module's
 * public API, exactly like a macro would.
 */
import {MODULE_ID, LIMITS, t, getDefaults} from "./settings.mjs";
import {listPresets, getPreset, savePreset, deletePreset} from "./presets.mjs";

const {ApplicationV2, DialogV2} = foundry.applications.api;
const {FormDataExtended} = foundry.applications.ux;
const {HTMLFilePickerElement, HTMLRangePickerElement} = foundry.applications.elements;

const COUNTER_PATTERN = /\{\{\s*n\s*\}\}/;
const PRESET_NAME_MAX = 60;

/** Tabs of the window: id and label key. */
const TABS = [
  {id: "text", label: "VTC.Config.Section.Text"},
  {id: "media", label: "VTC.Config.Section.Media"},
  {id: "timing", label: "VTC.Config.Section.Timing"},
  {id: "audience", label: "VTC.Config.Section.Audience"},
  {id: "presets", label: "VTC.Config.Section.Presets"}
];

/** Card fields sent to the API and stored in presets. */
const CARD_FIELDS = ["mode", "title", "subtitle", "tagline", "image", "sound", "volume", "fadeIn", "hold", "fadeOut", "opacity"];

/* -------------------------------------------- */
/*  DOM helpers                                 */
/* -------------------------------------------- */

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function textInput(name, value, {max, placeholder} = {}) {
  const input = element("input");
  input.type = "text";
  input.name = name;
  input.id = `vtc-${name}`;
  input.value = value ?? "";
  input.autocomplete = "off";
  if (max) input.maxLength = max;
  if (placeholder) input.placeholder = placeholder;
  return input;
}

function numberInput(name, value, {min, max, step}) {
  const input = element("input");
  input.type = "number";
  input.name = name;
  input.id = `vtc-${name}`;
  input.min = min;
  input.max = max;
  input.step = step;
  input.value = value;
  return input;
}

function checkbox(name, checked) {
  const input = element("input");
  input.type = "checkbox";
  input.name = name;
  input.id = `vtc-${name}`;
  input.checked = Boolean(checked);
  return input;
}

function formGroup(labelKey, input, hintKey) {
  const group = element("div", "form-group");
  const label = element("label", "", t(labelKey));
  if (input.id) label.htmlFor = input.id;
  const fields = element("div", "form-fields");
  fields.append(input);
  group.append(label, fields);
  if (hintKey) group.append(element("p", "hint", t(hintKey)));
  return group;
}

function fieldset(legendKey, ...children) {
  const box = element("fieldset");
  box.append(element("legend", "", t(legendKey)), ...children);
  return box;
}

function button(action, labelKey, icon, className) {
  const node = element("button", className);
  node.type = "button";
  node.dataset.action = action;
  const symbol = element("i", icon);
  symbol.setAttribute("aria-hidden", "true");
  node.append(symbol, document.createTextNode(` ${t(labelKey)}`));
  return node;
}

/** Serialize a text as a safe HTML paragraph for DialogV2 content. */
function paragraphHtml(text) {
  return element("p", "", text).outerHTML;
}

/** Number field value, or undefined when empty so the API falls back to the world defaults. */
function optionalNumber(value) {
  if (value === "" || value === null || value === undefined) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function pickCard(state) {
  return Object.fromEntries(CARD_FIELDS.filter(key => state[key] !== undefined).map(key => [key, state[key]]));
}

const getApi = () => game.modules.get(MODULE_ID).api;

/* -------------------------------------------- */
/*  Application                                 */
/* -------------------------------------------- */

export class TitleCardConfig extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "vyrmhal-title-card-config",
    classes: ["vtc-config"],
    window: {title: "VTC.Config.Title", icon: "fa-solid fa-clapperboard"},
    position: {width: 600},
    actions: {
      switchTab: TitleCardConfig.#onSwitchTab,
      preload: TitleCardConfig.#onPreload,
      audienceAll: TitleCardConfig.#onAudienceAll,
      audienceNone: TitleCardConfig.#onAudienceNone,
      showAll: TitleCardConfig.#onShowAll,
      preview: TitleCardConfig.#onPreview,
      closeAll: TitleCardConfig.#onCloseAll,
      loadPreset: TitleCardConfig.#onLoadPreset,
      savePreset: TitleCardConfig.#onSavePreset,
      deletePreset: TitleCardConfig.#onDeletePreset
    }
  };

  static #instance = null;

  #form = null;
  #presetSelect = null;
  #tab = "text";
  #mode = "full";
  #audienceList = null;
  /** Ids of users the GM unchecked. Kept while the window object lives, so the choice survives closing it. */
  #excluded = new Set();
  #tabButtons = new Map();
  #tabPanels = new Map();

  /** Open the window, or bring it to front without losing what is being typed. */
  static open() {
    if (!game.user.isGM) {
      ui.notifications.warn(t("VTC.Notify.GMOnly"));
      return null;
    }
    const app = TitleCardConfig.#instance ??= new TitleCardConfig();
    if (app.rendered) app.bringToFront();
    else app.render({force: true});
    return app;
  }

  /* ---------- Rendering ---------- */

  #initialState() {
    const last = game.settings.get(MODULE_ID, "lastCard") ?? {};
    const mode = last.mode === "banner" ? "banner" : "full";
    const defaults = getDefaults(mode);
    return {
      mode,
      title: "", subtitle: "", tagline: "", image: "", sound: "",
      volume: defaults.volume,
      fadeIn: defaults.fadeIn,
      hold: defaults.hold,
      fadeOut: defaults.fadeOut,
      opacity: defaults.opacity,
      useCounter: false,
      ...last,
      // The counter field always proposes the next session number.
      n: (game.settings.get(MODULE_ID, "sessionCounter") ?? 0) + 1
    };
  }

  /** @override */
  async _renderHTML() {
    const state = this.#initialState();
    const form = this.#form = element("form", "vtc-form standard-form");
    form.autocomplete = "off";
    form.addEventListener("submit", event => event.preventDefault());

    const panels = {
      text: [
        this.#buildModeGroup(state.mode),
        formGroup("VTC.Config.Field.Title",
          textInput("title", state.title, {max: LIMITS.title, placeholder: t("VTC.Config.Field.TitlePlaceholder")}),
          "VTC.Config.Field.TitleHint"),
        formGroup("VTC.Config.Field.Subtitle", textInput("subtitle", state.subtitle, {max: LIMITS.subtitle})),
        formGroup("VTC.Config.Field.Tagline", textInput("tagline", state.tagline, {max: LIMITS.tagline}),
          "VTC.Config.Field.TaglineHint"),
        fieldset("VTC.Config.Section.Counter",
          formGroup("VTC.Config.Field.UseCounter", checkbox("useCounter", state.useCounter),
            "VTC.Config.Field.UseCounterHint"),
          formGroup("VTC.Config.Field.Number", numberInput("n", state.n, {min: 0, max: 99999, step: 1})))
      ],
      media: [
        this.#withClass(formGroup("VTC.Config.Field.Image",
          HTMLFilePickerElement.create({name: "image", value: state.image, type: "image"})), "vtc-image-group"),
        formGroup("VTC.Config.Field.Sound",
          HTMLFilePickerElement.create({name: "sound", value: state.sound, type: "audio"})),
        formGroup("VTC.Config.Field.Volume",
          HTMLRangePickerElement.create({name: "volume", value: state.volume, min: 0, max: 1, step: 0.05})),
        this.#buildPreloadGroup()
      ],
      timing: [
        formGroup("VTC.Config.Field.FadeIn",
          numberInput("fadeIn", state.fadeIn, {min: LIMITS.fade.min, max: LIMITS.fade.max, step: 100})),
        formGroup("VTC.Config.Field.Hold",
          numberInput("hold", state.hold, {min: LIMITS.hold.min, max: LIMITS.hold.max, step: 100})),
        formGroup("VTC.Config.Field.FadeOut",
          numberInput("fadeOut", state.fadeOut, {min: LIMITS.fade.min, max: LIMITS.fade.max, step: 100})),
        formGroup("VTC.Config.Field.Opacity",
          HTMLRangePickerElement.create({name: "opacity", value: state.opacity, min: 0, max: 1, step: 0.01}))
      ],
      audience: this.#buildAudiencePanel(),
      presets: [this.#buildPresetGroup()]
    };

    // All panels stay in the form (hidden ones included) so every value is always read.
    const nav = element("nav", "vtc-tabs");
    nav.setAttribute("role", "tablist");
    const body = element("div", "vtc-panels");
    this.#tabButtons.clear();
    this.#tabPanels.clear();
    for (const tab of TABS) {
      const tabButton = element("button", "vtc-tab", t(tab.label));
      tabButton.type = "button";
      tabButton.id = `vtc-tab-${tab.id}`;
      tabButton.dataset.action = "switchTab";
      tabButton.dataset.tab = tab.id;
      tabButton.setAttribute("role", "tab");
      tabButton.setAttribute("aria-controls", `vtc-panel-${tab.id}`);
      nav.append(tabButton);
      this.#tabButtons.set(tab.id, tabButton);

      const panel = element("div", "vtc-panel");
      panel.id = `vtc-panel-${tab.id}`;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", tabButton.id);
      panel.append(...panels[tab.id]);
      body.append(panel);
      this.#tabPanels.set(tab.id, panel);
    }
    nav.addEventListener("keydown", event => this.#onTabKey(event));

    const footer = element("footer", "form-footer");
    footer.append(
      button("showAll", "VTC.Config.Button.ShowAll", "fa-solid fa-display", "bold"),
      button("preview", "VTC.Config.Button.Preview", "fa-solid fa-eye"),
      button("closeAll", "VTC.Config.Button.CloseAll", "fa-solid fa-xmark")
    );

    form.append(nav, body, footer);
    this.#syncMode();
    this.#showTab(this.#tab);
    this.#refreshPresets();
    return form;
  }

  #withClass(node, className) {
    node.classList.add(className);
    return node;
  }

  /** Full card or banner. Changing it swaps timing values that still hold the previous mode's defaults. */
  #buildModeGroup(mode) {
    const select = element("select");
    select.name = "mode";
    select.id = "vtc-mode";
    select.append(new Option(t("VTC.Config.Mode.Full"), "full"), new Option(t("VTC.Config.Mode.Banner"), "banner"));
    select.value = mode;
    select.addEventListener("change", () => this.#onModeChange());
    return formGroup("VTC.Config.Field.Mode", select, "VTC.Config.Field.ModeHint");
  }

  #onModeChange() {
    const next = this.#form.querySelector('[name="mode"]').value === "banner" ? "banner" : "full";
    const previous = getDefaults(this.#mode);
    const target = getDefaults(next);
    for (const key of ["fadeIn", "hold", "fadeOut", "opacity"]) {
      const field = this.#form.querySelector(`[name="${key}"]`);
      if (field && Number(field.value) === previous[key]) this.#setField(key, target[key]);
    }
    this.#syncMode();
  }

  /** Mirror the selected mode on the form, which hides the image field for banners. */
  #syncMode() {
    const mode = this.#form.querySelector('[name="mode"]')?.value === "banner" ? "banner" : "full";
    this.#mode = mode;
    this.#form.classList.toggle("vtc-mode-banner", mode === "banner");
  }

  #buildPreloadGroup() {
    const group = element("div", "form-group");
    const fields = element("div", "form-fields");
    fields.append(button("preload", "VTC.Config.Button.Preload", "fa-solid fa-cloud-arrow-down"));
    group.append(element("label", "", t("VTC.Config.Field.Preload")), fields,
      element("p", "hint", t("VTC.Config.Field.PreloadHint")));
    return group;
  }

  /** Recipient chooser: the list is rebuilt each time the tab is shown, so it follows who is connected. */
  #buildAudiencePanel() {
    const tools = element("div", "vtc-audience-tools");
    tools.append(
      button("audienceAll", "VTC.Config.Audience.All", "fa-solid fa-users"),
      button("audienceNone", "VTC.Config.Audience.None", "fa-solid fa-user-slash")
    );
    const list = this.#audienceList = element("div", "vtc-audience");
    list.setAttribute("role", "group");
    return [element("p", "hint", t("VTC.Config.Audience.Hint")), tools, list];
  }

  #otherUsers() {
    return game.users.filter(user => !user.isSelf);
  }

  #renderAudience() {
    const list = this.#audienceList;
    list.replaceChildren();
    const users = this.#otherUsers().sort((a, b) => (Number(b.active) - Number(a.active)) || a.name.localeCompare(b.name));
    if (!users.length) {
      list.append(element("p", "hint", t("VTC.Config.Audience.Empty")));
      return;
    }
    for (const user of users) {
      const row = element("label", "vtc-audience-row");
      if (!user.active) row.classList.add("offline");
      const box = element("input");
      box.type = "checkbox";
      box.checked = !this.#excluded.has(user.id);
      box.addEventListener("change", () => {
        if (box.checked) this.#excluded.delete(user.id);
        else this.#excluded.add(user.id);
      });
      row.append(box, element("span", "vtc-audience-name", user.name),
        element("span", "vtc-audience-status", t(user.active ? "VTC.Config.Audience.Online" : "VTC.Config.Audience.Offline")));
      if (user.isGM) row.append(element("span", "vtc-audience-tag", t("VTC.Config.Audience.GM")));
      list.append(row);
    }
  }

  #setAudience(everyone) {
    this.#excluded.clear();
    if (!everyone) for (const user of this.#otherUsers()) this.#excluded.add(user.id);
    this.#renderAudience();
  }

  /**
   * Connected users that should receive the card, or undefined when all of them do
   * (then no restriction is sent and players who join later are not affected).
   */
  #recipients() {
    const connected = this.#otherUsers().filter(user => user.active);
    const chosen = connected.filter(user => !this.#excluded.has(user.id));
    return chosen.length === connected.length ? undefined : chosen.map(user => user.id);
  }

  /** Preset selector and its buttons. */
  #buildPresetGroup() {
    const select = this.#presetSelect = element("select");
    select.name = "presetId";
    select.id = "vtc-presetId";
    const fields = element("div", "form-fields vtc-preset-row");
    fields.append(
      select,
      button("loadPreset", "VTC.Config.Presets.Load", "fa-solid fa-folder-open"),
      button("savePreset", "VTC.Config.Presets.Save", "fa-solid fa-floppy-disk"),
      button("deletePreset", "VTC.Config.Presets.Delete", "fa-solid fa-trash")
    );
    const group = element("div", "form-group");
    const label = element("label", "", t("VTC.Config.Presets.Select"));
    label.htmlFor = select.id;
    group.append(label, fields);
    return group;
  }

  #showTab(id, focus = false) {
    if (!this.#tabPanels.has(id)) return;
    this.#tab = id;
    for (const [tabId, tabButton] of this.#tabButtons) {
      const selected = tabId === id;
      tabButton.classList.toggle("active", selected);
      tabButton.setAttribute("aria-selected", String(selected));
      tabButton.tabIndex = selected ? 0 : -1;
      this.#tabPanels.get(tabId).hidden = !selected;
      if (selected && focus) tabButton.focus();
    }
    if (id === "audience") this.#renderAudience();
  }

  /** Left and right arrows move between tabs, as expected from a tab list. */
  #onTabKey(event) {
    const step = {ArrowLeft: -1, ArrowRight: 1}[event.key];
    if (!step) return;
    event.preventDefault();
    const ids = TABS.map(tab => tab.id);
    const next = ids[(ids.indexOf(this.#tab) + step + ids.length) % ids.length];
    this.#showTab(next, true);
  }

  /** @override */
  _replaceHTML(result, content) {
    content.replaceChildren(result);
  }

  /** @override */
  _onRender() {
    this.#form?.querySelector('[name="title"]')?.focus();
  }

  /** @override */
  async _preClose() {
    if (this.#form) this.#persistDraft(this.#read());
  }

  /* ---------- Form access ---------- */

  #read() {
    const raw = new FormDataExtended(this.#form).object;
    return {
      mode: raw.mode === "banner" ? "banner" : "full",
      title: String(raw.title ?? ""),
      subtitle: String(raw.subtitle ?? ""),
      tagline: String(raw.tagline ?? ""),
      image: String(raw.image ?? "").trim(),
      sound: String(raw.sound ?? "").trim(),
      volume: optionalNumber(raw.volume),
      fadeIn: optionalNumber(raw.fadeIn),
      hold: optionalNumber(raw.hold),
      fadeOut: optionalNumber(raw.fadeOut),
      opacity: optionalNumber(raw.opacity),
      useCounter: Boolean(raw.useCounter),
      n: Math.max(0, Math.trunc(Number(raw.n)) || 0)
    };
  }

  #setField(name, value) {
    const field = this.#form?.querySelector(`[name="${name}"]`);
    if (!field) return;
    if (field.type === "checkbox") field.checked = Boolean(value);
    else field.value = value;
  }

  #persistDraft(state) {
    const draft = {...pickCard(state), useCounter: state.useCounter};
    game.settings.set(MODULE_ID, "lastCard", draft).catch(err => console.warn(`${MODULE_ID} | Could not save draft`, err));
  }

  #refreshPresets(selectedId = "") {
    const select = this.#presetSelect;
    select.replaceChildren(new Option(t("VTC.Config.Presets.None"), ""));
    for (const preset of listPresets()) select.append(new Option(preset.name, preset.id));
    select.value = selectedId;
    if (select.value !== selectedId) select.value = "";
  }

  /* ---------- Actions ---------- */

  /**
   * Validate the form and display the card.
   * @param {boolean} everyone   True to broadcast, false for a local preview
   */
  async #send(everyone) {
    const state = this.#read();
    const texts = [state.title, state.subtitle, state.tagline];
    if (!texts.some(text => text.trim())) {
      ui.notifications.warn(t("VTC.Warn.Empty"));
      return;
    }
    if (!state.useCounter && texts.some(text => COUNTER_PATTERN.test(text))) {
      ui.notifications.warn(t("VTC.Warn.CounterDisabled"));
    }
    this.#persistDraft(state);

    const options = pickCard(state);
    if (state.useCounter) {
      options.n = state.n;
      if (everyone) options.incrementCounter = true;
    }
    if (everyone) {
      const recipients = this.#recipients();
      if (recipients) options.recipients = recipients;
    }
    const api = getApi();
    const shown = everyone ? await api.show(options) : await api.preview(options);
    if (shown && everyone && options.recipients) {
      ui.notifications.info(t("VTC.Config.Audience.SentTo", {count: options.recipients.length}));
    }
    // Propose the following number once a counted card has really been shown to everyone.
    if (shown && everyone && state.useCounter) this.#setField("n", state.n + 1);
  }

  static #onSwitchTab(event, target) {
    this.#showTab(target.dataset.tab);
  }

  static #onPreload() {
    const state = this.#read();
    const recipients = this.#recipients();
    const sent = getApi().preload({image: state.image, sound: state.sound, ...(recipients ? {recipients} : {})});
    if (sent) ui.notifications.info(t("VTC.Config.Preload.Sent"));
  }

  static #onAudienceAll() {
    this.#setAudience(true);
  }

  static #onAudienceNone() {
    this.#setAudience(false);
  }

  static async #onShowAll() {
    await this.#send(true);
  }

  static async #onPreview() {
    await this.#send(false);
  }

  static #onCloseAll() {
    getApi().close();
  }

  static #onLoadPreset() {
    const preset = getPreset(this.#presetSelect.value);
    if (!preset) {
      ui.notifications.warn(t("VTC.Config.Presets.NoSelection"));
      return;
    }
    for (const key of CARD_FIELDS) {
      if (preset.data[key] !== undefined) this.#setField(key, preset.data[key]);
    }
    this.#syncMode();
    ui.notifications.info(t("VTC.Config.Presets.Loaded", {name: preset.name}));
  }

  static async #onSavePreset() {
    const state = this.#read();
    const suggested = getPreset(this.#presetSelect.value)?.name ?? state.title.slice(0, PRESET_NAME_MAX);

    const group = element("div", "form-group");
    const label = element("label", "", t("VTC.Config.Presets.SaveLabel"));
    const fields = element("div", "form-fields");
    const input = element("input");
    input.type = "text";
    input.name = "name";
    input.maxLength = PRESET_NAME_MAX;
    input.setAttribute("value", suggested); // Attribute, so it survives serialization (and is escaped)
    fields.append(input);
    group.append(label, fields);

    const result = await DialogV2.input({
      classes: ["vtc-dialog"],
      window: {title: t("VTC.Config.Presets.SaveTitle"), icon: "fa-solid fa-floppy-disk"},
      content: group.outerHTML,
      ok: {label: t("VTC.Config.Presets.Save"), icon: "fa-solid fa-floppy-disk"},
      rejectClose: false
    });
    if (!result) return;

    const name = String(result.name ?? "").trim();
    if (!name) {
      ui.notifications.warn(t("VTC.Config.Presets.NameRequired"));
      return;
    }

    const data = pickCard(state);
    let outcome = await savePreset(name, data);
    if (outcome.status === "exists") {
      const confirmed = await DialogV2.confirm({
        classes: ["vtc-dialog"],
        window: {title: t("VTC.Config.Presets.OverwriteTitle")},
        content: paragraphHtml(t("VTC.Config.Presets.Overwrite", {name})),
        rejectClose: false
      });
      if (!confirmed) return;
      outcome = await savePreset(name, data, {overwrite: true});
    }

    if (outcome.status === "full") ui.notifications.warn(t("VTC.Config.Presets.Full"));
    else if (outcome.status === "invalid") ui.notifications.warn(t("VTC.Config.Presets.NameRequired"));
    else if (outcome.status === "saved") {
      this.#refreshPresets(outcome.preset.id);
      ui.notifications.info(t("VTC.Config.Presets.Saved", {name: outcome.preset.name}));
    }
  }

  static async #onDeletePreset() {
    const preset = getPreset(this.#presetSelect.value);
    if (!preset) {
      ui.notifications.warn(t("VTC.Config.Presets.NoSelection"));
      return;
    }
    const confirmed = await DialogV2.confirm({
      classes: ["vtc-dialog"],
      window: {title: t("VTC.Config.Presets.DeleteTitle")},
      content: paragraphHtml(t("VTC.Config.Presets.DeleteConfirm", {name: preset.name})),
      rejectClose: false
    });
    if (!confirmed) return;
    if (await deletePreset(preset.id)) {
      this.#refreshPresets();
      ui.notifications.info(t("VTC.Config.Presets.Deleted", {name: preset.name}));
    }
  }
}
