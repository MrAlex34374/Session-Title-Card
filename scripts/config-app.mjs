/**
 * GM configuration window. The form is built with DOM calls (no template file) and drives the module's
 * public API, exactly like a macro would.
 */
import {MODULE_ID, DEFAULT_FONT, LIMITS, t, getDefaults, getStyleSettings} from "./settings.mjs";
import {cleanMedia, toUrl} from "./overlay.mjs";
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

/** Durations are stored and sent in milliseconds, but typed and shown in seconds in the advanced options. */
const SECOND_FIELDS = new Set(["fadeIn", "hold", "fadeOut"]);

/** "Quick launch" durations: multiplier applied to the defaults of the selected display mode. */
const DURATIONS = [
  {id: "short", label: "VTC.Config.Duration.Short", factor: 0.5},
  {id: "normal", label: "VTC.Config.Duration.Normal", factor: 1},
  {id: "long", label: "VTC.Config.Duration.Long", factor: 2}
];

const MIN_CONTRAST = 4.5;

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

/** Field typed in seconds, returned in milliseconds (or undefined when empty). */
function optionalSeconds(value) {
  const seconds = optionalNumber(value);
  return seconds === undefined ? undefined : Math.round(seconds * 1000);
}

function pickCard(state) {
  return Object.fromEntries(CARD_FIELDS.filter(key => state[key] !== undefined).map(key => [key, state[key]]));
}

/* ---------- Contrast (WCAG 2.x) ---------- */

/** Parse #rgb, #rgba, #rrggbb or #rrggbbaa. The alpha channel is ignored. */
function parseHex(value) {
  const match = /^#([0-9a-f]{3,8})$/i.exec(String(value ?? ""));
  if (!match) return null;
  let hex = match[1];
  if (hex.length === 3 || hex.length === 4) hex = [...hex].map(char => char + char).join("");
  if (hex.length !== 6 && hex.length !== 8) return null;
  return [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16));
}

function luminance([r, g, b]) {
  const [lr, lg, lb] = [r, g, b].map(channel => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

export function contrastRatio(foreground, background) {
  const [a, b] = [luminance(foreground), luminance(background)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

const getApi = () => game.modules.get(MODULE_ID).api;

/* -------------------------------------------- */
/*  Application                                 */
/* -------------------------------------------- */

export class TitleCardConfig extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "session-title-card-config",
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
      deletePreset: TitleCardConfig.#onDeletePreset,
      toggleAdvanced: TitleCardConfig.#onToggleAdvanced
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
  #advanced = false;
  #advancedBox = null;
  #advancedToggle = null;
  #durationBox = null;
  #durationNote = null;
  #mini = null;
  #contrast = null;

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
        formGroup("VTC.Config.Field.Tagline", textInput("tagline", state.tagline, {max: LIMITS.tagline}),
          "VTC.Config.Field.TaglineHint")
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
          numberInput("fadeIn", state.fadeIn / 1000, {min: LIMITS.fade.min / 1000, max: LIMITS.fade.max / 1000, step: 0.1})),
        formGroup("VTC.Config.Field.Hold",
          numberInput("hold", state.hold / 1000, {min: LIMITS.hold.min / 1000, max: LIMITS.hold.max / 1000, step: 0.1})),
        formGroup("VTC.Config.Field.FadeOut",
          numberInput("fadeOut", state.fadeOut / 1000, {min: LIMITS.fade.min / 1000, max: LIMITS.fade.max / 1000, step: 0.1})),
        formGroup("VTC.Config.Field.Opacity",
          HTMLRangePickerElement.create({name: "opacity", value: state.opacity, min: 0, max: 1, step: 0.01}))
      ],
      audience: this.#buildAudiencePanel(),
      presets: [this.#buildPresetGroup()]
    };

    // All panels stay in the form (hidden ones included) so every value is always read.
    const nav = element("nav", "vtc-tabs");
    nav.setAttribute("aria-label", t("VTC.Config.Quick.Advanced"));
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

    const advanced = this.#advancedBox = element("div", "vtc-advanced");
    advanced.id = "vtc-advanced";
    advanced.append(nav, body);

    form.append(this.#buildQuick(state), this.#buildAdvancedToggle(), advanced, footer);
    // The quick duration radios apply their own values, then refresh the form themselves. If the form listeners
    // ran first (a radio fires "input" before "change"), they would uncheck the radio before it could apply.
    const onFormEvent = event => {
      if (event.target?.name === "durationPreset") return;
      this.#onFormChange();
    };
    form.addEventListener("input", onFormEvent);
    form.addEventListener("change", onFormEvent);
    this.#syncMode();
    this.#showTab(this.#tab);
    this.#refreshPresets();
    this.#setAdvanced(this.#advanced);
    this.#syncDuration();
    this.#updatePreview();
    return form;
  }

  /* ---------- Quick launch view ---------- */

  #buildQuick(state) {
    const quick = element("section", "vtc-quick");
    quick.setAttribute("aria-label", t("VTC.Config.Quick.Heading"));

    const counterRow = element("div", "vtc-quick-row");
    counterRow.append(
      formGroup("VTC.Config.Field.UseCounter", checkbox("useCounter", state.useCounter), "VTC.Config.Field.UseCounterHint"),
      formGroup("VTC.Config.Field.Number", numberInput("n", state.n, {min: 0, max: 99999, step: 1}))
    );

    quick.append(
      formGroup("VTC.Config.Field.Title",
        textInput("title", state.title, {max: LIMITS.title, placeholder: t("VTC.Config.Field.TitlePlaceholder")}),
        "VTC.Config.Field.TitleHint"),
      formGroup("VTC.Config.Field.Subtitle", textInput("subtitle", state.subtitle, {max: LIMITS.subtitle})),
      counterRow,
      this.#buildModeGroup(state.mode),
      this.#buildDurationGroup(),
      this.#buildMini()
    );
    return quick;
  }

  /** Short / Normal / Long, applied to the three durations of the advanced options. */
  #buildDurationGroup() {
    const box = this.#durationBox = element("fieldset", "vtc-duration");
    box.append(element("legend", "", t("VTC.Config.Duration.Label")));
    const row = element("div", "vtc-duration-options");
    for (const choice of DURATIONS) {
      const label = element("label", "vtc-duration-choice");
      const radio = element("input");
      radio.type = "radio";
      radio.name = "durationPreset";
      radio.value = choice.id;
      radio.addEventListener("change", () => {
        if (radio.checked) this.#applyDuration(choice.id);
      });
      label.append(radio, element("span", "", t(choice.label)));
      row.append(label);
    }
    this.#durationNote = element("p", "hint vtc-duration-note", t("VTC.Config.Duration.Custom"));
    box.append(row, this.#durationNote);
    return box;
  }

  /** Live miniature of the card plus the contrast badge. Text is only ever set with textContent. */
  #buildMini() {
    const figure = element("figure", "vtc-preview");
    const mini = this.#mini = {
      root: element("div", "vtc-mini"),
      image: element("div", "vtc-mini-image"),
      veil: element("div", "vtc-mini-veil"),
      title: element("div", "vtc-mini-title"),
      subtitle: element("div", "vtc-mini-subtitle"),
      tagline: element("div", "vtc-mini-tagline")
    };
    const content = element("div", "vtc-mini-content");
    content.append(mini.title, mini.subtitle, mini.tagline);
    mini.root.append(mini.veil, mini.image, content);
    mini.root.setAttribute("role", "img");
    mini.root.setAttribute("aria-label", t("VTC.Config.Preview.Label"));

    const caption = element("figcaption", "vtc-preview-caption");
    caption.append(element("span", "vtc-preview-label", t("VTC.Config.Preview.Label")));
    const badge = this.#contrast = element("span", "vtc-contrast");
    badge.setAttribute("role", "status");
    caption.append(badge);
    figure.append(mini.root, caption);
    return figure;
  }

  #buildAdvancedToggle() {
    const toggle = this.#advancedToggle = element("button", "vtc-advanced-toggle");
    toggle.type = "button";
    toggle.dataset.action = "toggleAdvanced";
    toggle.setAttribute("aria-controls", "vtc-advanced");
    return toggle;
  }

  #setAdvanced(on) {
    this.#advanced = Boolean(on);
    this.#advancedBox.hidden = !this.#advanced;
    this.#form.classList.toggle("vtc-is-advanced", this.#advanced);
    const toggle = this.#advancedToggle;
    toggle.setAttribute("aria-expanded", String(this.#advanced));
    toggle.replaceChildren();
    const icon = element("i", this.#advanced ? "fa-solid fa-chevron-up" : "fa-solid fa-sliders");
    icon.setAttribute("aria-hidden", "true");
    toggle.append(icon, document.createTextNode(` ${t(this.#advanced ? "VTC.Config.Quick.Simple" : "VTC.Config.Quick.Advanced")}`));
    if (this.#advanced) this.#showTab(this.#tab);
  }

  /** Values (ms) of a quick duration for a display mode. */
  #durationValues(mode, id) {
    const factor = DURATIONS.find(choice => choice.id === id)?.factor ?? 1;
    const defaults = getDefaults(mode);
    const scale = (value, limit) => Math.min(limit.max, Math.max(limit.min, Math.round(value * factor / 100) * 100));
    return {
      fadeIn: scale(defaults.fadeIn, LIMITS.fade),
      hold: scale(defaults.hold, LIMITS.hold),
      fadeOut: scale(defaults.fadeOut, LIMITS.fade)
    };
  }

  /** Which quick duration matches the three fields for a mode, or "custom". */
  #detectDuration(mode) {
    const state = this.#read();
    for (const choice of DURATIONS) {
      const values = this.#durationValues(mode, choice.id);
      if (Object.keys(values).every(key => state[key] === values[key])) return choice.id;
    }
    return "custom";
  }

  #applyDuration(id) {
    const values = this.#durationValues(this.#mode, id);
    for (const [key, value] of Object.entries(values)) this.#setField(key, value);
    this.#onFormChange();
  }

  #syncDuration() {
    const detected = this.#detectDuration(this.#mode);
    for (const radio of this.#durationBox.querySelectorAll('input[type="radio"]')) radio.checked = radio.value === detected;
    this.#durationNote.hidden = detected !== "custom";
  }

  #onFormChange() {
    if (!this.#form || !this.#mini) return;
    this.#syncDuration();
    this.#updatePreview();
  }

  /** Redraw the miniature and the contrast badge from the current form values. */
  #updatePreview() {
    const mini = this.#mini;
    if (!mini) return;
    const state = this.#read();
    const style = getStyleSettings();
    const banner = state.mode === "banner";
    const resolve = text => (state.useCounter ? text.replace(/\{\{\s*n\s*\}\}/g, String(state.n)) : text);
    const texts = {title: resolve(state.title).trim(), subtitle: resolve(state.subtitle).trim(), tagline: resolve(state.tagline).trim()};
    const empty = !texts.title && !texts.subtitle && !texts.tagline;

    const font = Object.hasOwn(CONFIG.fontDefinitions ?? {}, style.fontFamily) ? style.fontFamily : DEFAULT_FONT;
    const opacity = state.opacity ?? getDefaults(state.mode).opacity;
    const root = mini.root;
    root.classList.toggle("vtc-mini-banner", banner);
    root.classList.toggle("vtc-mini-empty", empty);
    root.style.setProperty("--vtc-font", `"${font.replace(/["\\;{}]/g, "")}", "${DEFAULT_FONT}", sans-serif`);
    root.style.setProperty("--vtc-title-color", style.titleColor);
    root.style.setProperty("--vtc-subtitle-color", style.subtitleColor);
    root.style.setProperty("--vtc-title-size", String(style.titleSize));
    root.style.setProperty("--vtc-veil", String(opacity));

    mini.title.textContent = empty ? t("VTC.Config.Preview.Empty") : texts.title;
    mini.subtitle.textContent = texts.subtitle;
    mini.tagline.textContent = texts.tagline;

    const image = banner ? "" : cleanMedia({image: state.image}).image;
    mini.image.style.backgroundImage = image ? `url("${toUrl(image)}")` : "";
    mini.image.hidden = !image;

    // Worst case: the black veil sits on a white game scene. Text is checked against that background.
    const level = Math.round(255 * (1 - Math.min(1, Math.max(0, opacity))));
    const background = [level, level, level];
    const colors = [parseHex(style.titleColor), parseHex(style.subtitleColor)].filter(Boolean);
    const badge = this.#contrast;
    if (!colors.length) {
      badge.textContent = "";
      return;
    }
    const ratio = Math.min(...colors.map(color => contrastRatio(color, background)));
    const ok = ratio >= MIN_CONTRAST;
    const shown = ratio.toLocaleString(game.i18n.lang || undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1});
    badge.classList.toggle("ok", ok);
    badge.classList.toggle("low", !ok);
    badge.textContent = t(ok ? "VTC.Config.Contrast.Ok" : "VTC.Config.Contrast.Low", {ratio: shown})
      + (image ? ` ${t("VTC.Config.Contrast.Image")}` : "");
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
    const kind = this.#detectDuration(this.#mode);
    for (const key of ["fadeIn", "hold", "fadeOut", "opacity"]) {
      const field = this.#form.querySelector(`[name="${key}"]`);
      if (field && Number(field.value) === previous[key]) this.#setField(key, target[key]);
    }
    this.#syncMode();
    // A quick duration (short, normal, long) is kept when the display mode changes.
    if (kind !== "custom") this.#applyDuration(kind);
    else this.#onFormChange();
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
      fadeIn: optionalSeconds(raw.fadeIn),
      hold: optionalSeconds(raw.hold),
      fadeOut: optionalSeconds(raw.fadeOut),
      opacity: optionalNumber(raw.opacity),
      useCounter: Boolean(raw.useCounter),
      n: Math.max(0, Math.trunc(Number(raw.n)) || 0)
    };
  }

  #setField(name, value) {
    const field = this.#form?.querySelector(`[name="${name}"]`);
    if (!field) return;
    if (field.type === "checkbox") field.checked = Boolean(value);
    else if (SECOND_FIELDS.has(name) && Number.isFinite(Number(value))) field.value = Math.round(Number(value)) / 1000;
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

  static #onToggleAdvanced() {
    this.#setAdvanced(!this.#advanced);
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
    this.#onFormChange();
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
