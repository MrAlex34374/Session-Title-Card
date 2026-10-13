/** Shared constants, i18n helper and game.settings registration. */

export const MODULE_ID = "session-title-card";
export const SOCKET = `module.${MODULE_ID}`;
export const DEFAULT_FONT = "Signika";

/** Display modes: a full screen card, or a lower-third banner that leaves the game usable. */
export const MODES = Object.freeze(["full", "banner"]);

/** Banner timing and veil strength. Banners are shorter and lighter than full cards. */
export const BANNER_DEFAULTS = Object.freeze({fadeIn: 1000, hold: 3500, fadeOut: 1000, opacity: 0.75});

/** Hard limits enforced on every card, whatever its origin (dialog, macro or socket). */
export const LIMITS = Object.freeze({
  title: 200,
  subtitle: 300,
  tagline: 300,
  fade: Object.freeze({min: 0, max: 30000}),
  hold: Object.freeze({min: 0, max: 120000})
});

/** Localize a key, or format it when placeholder data is given. */
export function t(key, data) {
  return data ? game.i18n.format(key, data) : game.i18n.localize(key);
}

/** Build the font choices from the fonts currently registered in Foundry. */
function buildFontChoices() {
  const names = Object.keys(CONFIG.fontDefinitions ?? {});
  if (!names.includes(DEFAULT_FONT)) names.push(DEFAULT_FONT);
  names.sort((a, b) => a.localeCompare(b));
  return Object.fromEntries(names.map(name => [name, name]));
}

/** Shadow choices, labelled with the current language (i18n is not loaded yet during init). */
function buildShadowChoices() {
  return {
    none: t("VTC.Settings.Shadow.None"),
    soft: t("VTC.Settings.Shadow.Soft"),
    strong: t("VTC.Settings.Shadow.Strong")
  };
}

/**
 * The Foundry "init" hook runs before translations are loaded, and other packages may register fonts after
 * init. Choice lists are therefore rebuilt once the game is ready, before the settings window can be opened.
 */
export function refreshChoices() {
  const fonts = game.settings.settings.get(`${MODULE_ID}.fontFamily`);
  if (fonts) fonts.choices = buildFontChoices();
  const shadow = game.settings.settings.get(`${MODULE_ID}.shadow`);
  if (shadow) shadow.choices = buildShadowChoices();
}

export function registerSettings() {
  const fields = foundry.data.fields;
  const register = (key, config) => game.settings.register(MODULE_ID, key, config);

  /* ---------- World settings: visual style and defaults ---------- */

  register("fontFamily", {
    name: "VTC.Settings.FontFamily.Name",
    hint: "VTC.Settings.FontFamily.Hint",
    scope: "world",
    config: true,
    type: String,
    choices: buildFontChoices(),
    default: DEFAULT_FONT
  });

  register("titleColor", {
    name: "VTC.Settings.TitleColor.Name",
    hint: "VTC.Settings.TitleColor.Hint",
    scope: "world",
    config: true,
    type: new fields.ColorField({required: true, nullable: false, initial: "#f2e6c9"})
  });

  register("subtitleColor", {
    name: "VTC.Settings.SubtitleColor.Name",
    hint: "VTC.Settings.SubtitleColor.Hint",
    scope: "world",
    config: true,
    type: new fields.ColorField({required: true, nullable: false, initial: "#c9b98f"})
  });

  register("titleSize", {
    name: "VTC.Settings.TitleSize.Name",
    hint: "VTC.Settings.TitleSize.Hint",
    scope: "world",
    config: true,
    type: new fields.NumberField({required: true, nullable: false, integer: true, min: 24, max: 240, initial: 72})
  });

  register("shadow", {
    name: "VTC.Settings.Shadow.Name",
    hint: "VTC.Settings.Shadow.Hint",
    scope: "world",
    config: true,
    type: String,
    choices: {none: "none", soft: "soft", strong: "strong"}, // Labels are set in refreshChoices()
    default: "soft"
  });

  register("defaultFadeIn", {
    name: "VTC.Settings.DefaultFadeIn.Name",
    hint: "VTC.Settings.DefaultFadeIn.Hint",
    scope: "world",
    config: true,
    type: new fields.NumberField({
      required: true, nullable: false, integer: true, min: LIMITS.fade.min, max: LIMITS.fade.max, initial: 1500
    })
  });

  register("defaultHold", {
    name: "VTC.Settings.DefaultHold.Name",
    hint: "VTC.Settings.DefaultHold.Hint",
    scope: "world",
    config: true,
    type: new fields.NumberField({
      required: true, nullable: false, integer: true, min: LIMITS.hold.min, max: LIMITS.hold.max, initial: 5000
    })
  });

  register("defaultFadeOut", {
    name: "VTC.Settings.DefaultFadeOut.Name",
    hint: "VTC.Settings.DefaultFadeOut.Hint",
    scope: "world",
    config: true,
    type: new fields.NumberField({
      required: true, nullable: false, integer: true, min: LIMITS.fade.min, max: LIMITS.fade.max, initial: 1500
    })
  });

  register("defaultOpacity", {
    name: "VTC.Settings.DefaultOpacity.Name",
    hint: "VTC.Settings.DefaultOpacity.Hint",
    scope: "world",
    config: true,
    type: new fields.NumberField({required: true, nullable: false, min: 0, max: 1, step: 0.01, initial: 0.92})
  });

  register("autoCardEnabled", {
    name: "VTC.Settings.AutoCardEnabled.Name",
    hint: "VTC.Settings.AutoCardEnabled.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  register("combatCardEnabled", {
    name: "VTC.Settings.CombatCardEnabled.Name",
    hint: "VTC.Settings.CombatCardEnabled.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  register("combatStartTexts", {
    name: "VTC.Settings.CombatStartTexts.Name",
    hint: "VTC.Settings.CombatStartTexts.Hint",
    scope: "world",
    config: true,
    type: String,
    default: "Les armes sont tirées | Le calme se brise | L'affrontement commence"
  });

  register("combatEndTexts", {
    name: "VTC.Settings.CombatEndTexts.Name",
    hint: "VTC.Settings.CombatEndTexts.Hint",
    scope: "world",
    config: true,
    type: String,
    default: "Le silence retombe | La poussière retombe | Chacun reprend son souffle"
  });

  /* ---------- Client settings: each user's own preferences ---------- */

  register("autoCardClient", {
    name: "VTC.Settings.AutoCardClient.Name",
    hint: "VTC.Settings.AutoCardClient.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  register("combatCardClient", {
    name: "VTC.Settings.CombatCardClient.Name",
    hint: "VTC.Settings.CombatCardClient.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  register("autoCardGM", {
    name: "VTC.Settings.AutoCardGM.Name",
    hint: "VTC.Settings.AutoCardGM.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  register("muteSound", {
    name: "VTC.Settings.MuteSound.Name",
    hint: "VTC.Settings.MuteSound.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false
  });

  register("masterVolume", {
    name: "VTC.Settings.MasterVolume.Name",
    hint: "VTC.Settings.MasterVolume.Hint",
    scope: "client",
    config: true,
    type: new fields.NumberField({required: true, nullable: false, min: 0, max: 1, step: 0.05, initial: 0.8})
  });

  /* ---------- Hidden state ---------- */

  // Presets: array of {id, name, data}. See presets.mjs.
  register("presets", {
    scope: "world",
    config: false,
    type: new fields.ArrayField(new fields.ObjectField(), {required: true, initial: () => []})
  });

  // Number of the last session card shown to everyone with the counter enabled.
  register("sessionCounter", {
    scope: "world",
    config: false,
    type: new fields.NumberField({required: true, nullable: false, integer: true, min: 0, initial: 0})
  });

  // Set once the "Title Card" macro has been handled, so a deleted macro is not recreated.
  register("macroInitialized", {
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  // Last values typed in the GM window, restored when it is reopened.
  register("lastCard", {
    scope: "client",
    config: false,
    type: new fields.ObjectField({required: true, nullable: false, initial: () => ({})})
  });
}

/** Defaults for durations, opacity and volume. Full cards use the world settings, banners use fixed values. */
export function getDefaults(mode = "full") {
  const get = key => game.settings.get(MODULE_ID, key);
  const defaults = {
    fadeIn: get("defaultFadeIn"),
    hold: get("defaultHold"),
    fadeOut: get("defaultFadeOut"),
    opacity: get("defaultOpacity"),
    volume: 0.8
  };
  return mode === "banner" ? {...defaults, ...BANNER_DEFAULTS} : defaults;
}

/** Accept only plain hex colors, so a corrupted setting can never inject CSS. */
function safeColor(value, fallback) {
  const text = String(value ?? "");
  return /^#[0-9a-f]{3,8}$/i.test(text) ? text : fallback;
}

/** Visual style read from the world settings of the local client. */
export function getStyleSettings() {
  const get = key => game.settings.get(MODULE_ID, key);
  return {
    fontFamily: get("fontFamily"),
    titleColor: safeColor(get("titleColor"), "#f2e6c9"),
    subtitleColor: safeColor(get("subtitleColor"), "#c9b98f"),
    titleSize: Number(get("titleSize")) || 72,
    shadow: get("shadow")
  };
}
