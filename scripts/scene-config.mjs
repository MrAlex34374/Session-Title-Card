/** Per-scene automatic card: a fieldset injected in the scene configuration, stored in a scene flag. */
import {MODULE_ID, LIMITS, getDefaults, t} from "./settings.mjs";

export const AUTO_FLAG = "autoCard";

const {HTMLFilePickerElement} = foundry.applications.elements;
const FIELD_PREFIX = `flags.${MODULE_ID}.${AUTO_FLAG}`;
const PREVIEW_KEYS = ["mode", "duration", "title", "subtitle", "tagline", "image", "sound"];

/** Same Short / Normal / Long as the GM window: a multiplier of the defaults of the display mode. */
const DURATIONS = Object.freeze({short: 0.5, normal: 1, long: 2});
const TOKEN = /\s*\{\{\s*n\s*\}\}/g;

/**
 * Turn the scene flag into the options of a card: the scene name is the fallback title, the mode defaults to a
 * banner, the duration choice becomes fade and hold times, and {{n}} is replaced by the saved session number,
 * or removed when there is none yet.
 */
export function resolveAutoCard(data, sceneName) {
  const counter = game.settings.get(MODULE_ID, "sessionCounter");
  const options = {...data, title: data.title || sceneName, mode: data.mode === "full" ? "full" : "banner"};

  const factor = DURATIONS[data.duration] ?? 1;
  if (factor !== 1) {
    const defaults = getDefaults(options.mode);
    const scale = (value, limit) => Math.min(limit.max, Math.max(limit.min, Math.round(value * factor / 100) * 100));
    options.fadeIn = scale(defaults.fadeIn, LIMITS.fade);
    options.hold = scale(defaults.hold, LIMITS.hold);
    options.fadeOut = scale(defaults.fadeOut, LIMITS.fade);
  }

  if (counter > 0) {
    options.n = counter;
  } else {
    for (const key of ["title", "subtitle", "tagline"]) {
      if (typeof options[key] === "string") options[key] = options[key].replace(TOKEN, "").trim();
    }
  }
  return options;
}

function field(label, input, hint) {
  const group = document.createElement("div");
  group.className = "form-group";
  const labelElement = document.createElement("label");
  labelElement.textContent = label;
  if (input.id) labelElement.htmlFor = input.id;
  const fields = document.createElement("div");
  fields.className = "form-fields";
  fields.append(input);
  group.append(labelElement, fields);
  if (hint) {
    const hintElement = document.createElement("p");
    hintElement.className = "hint";
    hintElement.id = `${input.id}-hint`;
    hintElement.textContent = hint;
    input.setAttribute("aria-describedby", hintElement.id);
    group.append(hintElement);
  }
  return group;
}

function buildFieldset(scene) {
  const data = scene.getFlag(MODULE_ID, AUTO_FLAG) ?? {};
  const id = key => `vtc-scene-${scene.id}-${key}`;
  const name = key => `${FIELD_PREFIX}.${key}`;

  const fieldset = document.createElement("fieldset");
  fieldset.className = "vtc-scene-card";
  const legend = document.createElement("legend");
  legend.textContent = t("VTC.Scene.Legend");
  fieldset.append(legend);

  const text = (key, max, placeholder = "") => {
    const input = document.createElement("input");
    input.type = "text";
    input.id = id(key);
    input.name = name(key);
    input.value = data[key] ?? "";
    input.maxLength = max;
    input.placeholder = placeholder;
    return input;
  };

  const checkbox = key => {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = id(key);
    input.name = name(key);
    input.checked = data[key] === true;
    return input;
  };

  const enabled = checkbox("enabled");
  fieldset.append(field(t("VTC.Scene.Enabled"), enabled, t("VTC.Scene.Hint")));

  if (!game.settings.get(MODULE_ID, "autoCardEnabled")) {
    const warning = document.createElement("p");
    warning.className = "notes";
    warning.textContent = t("VTC.Scene.GloballyOff");
    fieldset.append(warning);
  }

  // Fields are hidden, never disabled: disabled fields are left out of the form and their content would be lost.
  const body = document.createElement("div");
  body.className = "vtc-scene-fields";

  const mode = document.createElement("select");
  mode.id = id("mode");
  mode.name = name("mode");
  for (const value of ["banner", "full"]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = t(`VTC.Scene.Mode.${value}`);
    option.selected = (data.mode === "full" ? "full" : "banner") === value;
    mode.append(option);
  }

  const duration = document.createElement("select");
  duration.id = id("duration");
  duration.name = name("duration");
  for (const value of Object.keys(DURATIONS)) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = t(`VTC.Config.Duration.${value[0].toUpperCase()}${value.slice(1)}`);
    option.selected = (Object.hasOwn(DURATIONS, data.duration) ? data.duration : "normal") === value;
    duration.append(option);
  }

  const image = HTMLFilePickerElement.create({name: name("image"), value: data.image ?? "", type: "image"});
  image.id = id("image");
  const sound = HTMLFilePickerElement.create({name: name("sound"), value: data.sound ?? "", type: "audio"});
  sound.id = id("sound");

  const imageGroup = field(t("VTC.Scene.Image"), image);
  const syncMode = () => { imageGroup.hidden = mode.value !== "full"; };
  mode.addEventListener("change", syncMode);
  syncMode();

  const preview = document.createElement("button");
  preview.type = "button";
  const icon = document.createElement("i");
  icon.className = "fa-solid fa-eye";
  icon.setAttribute("aria-hidden", "true");
  preview.append(icon, ` ${t("VTC.Scene.Preview")}`);
  preview.addEventListener("click", () => {
    const options = {};
    for (const key of PREVIEW_KEYS) options[key] = fieldset.querySelector(`[name="${name(key)}"]`)?.value ?? "";
    game.modules.get(MODULE_ID).api.preview(resolveAutoCard(options, scene.name));
  });
  const previewGroup = document.createElement("div");
  previewGroup.className = "form-group";
  const previewFields = document.createElement("div");
  previewFields.className = "form-fields";
  previewFields.append(preview);
  previewGroup.append(previewFields);

  body.append(
    field(t("VTC.Scene.Title"), text("title", LIMITS.title, scene.name)),
    field(t("VTC.Scene.Subtitle"), text("subtitle", LIMITS.subtitle)),
    field(t("VTC.Scene.Tagline"), text("tagline", LIMITS.tagline)),
    field(t("VTC.Scene.ModeLabel"), mode),
    field(t("VTC.Scene.DurationLabel"), duration, t("VTC.Scene.DurationHint")),
    imageGroup,
    field(t("VTC.Scene.Sound"), sound),
    field(t("VTC.Scene.Once"), checkbox("once"), t("VTC.Scene.OnceHint")),
    previewGroup
  );

  const syncEnabled = () => { body.hidden = !enabled.checked; };
  enabled.addEventListener("change", syncEnabled);
  syncEnabled();

  fieldset.append(body);
  return fieldset;
}

/** Inject the fieldset in the scene configuration (ApplicationV2). Fragile by nature: falls back to the form. */
export function onRenderSceneConfig(app, html) {
  if (!game.user.isGM) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  const form = root?.matches?.("form") ? root : root?.querySelector("form");
  if (!form || form.querySelector(".vtc-scene-card")) return;

  const fieldset = buildFieldset(app.document);
  const target = form.querySelector('.tab[data-tab="basic"]') ?? form.querySelector(".tab") ?? form;
  target.append(fieldset);
}

/** Mark the scenes that have an automatic card in the scene directory, so the GM can see them at a glance. */
export function onRenderSceneDirectory(app, html) {
  if (!game.user.isGM) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;
  const off = !game.settings.get(MODULE_ID, "autoCardEnabled");
  for (const entry of root.querySelectorAll("[data-entry-id]")) {
    if (entry.querySelector(".vtc-scene-icon")) continue;
    const scene = game.scenes.get(entry.dataset.entryId);
    const data = scene?.getFlag(MODULE_ID, AUTO_FLAG);
    if (!data?.enabled) continue;

    const label = t(off ? "VTC.Scene.IconOff" : "VTC.Scene.Icon");
    const icon = document.createElement("i");
    icon.className = `fa-solid ${off ? "fa-clapperboard fa-fade" : "fa-clapperboard"} vtc-scene-icon`;
    icon.title = label;
    icon.setAttribute("role", "img");
    icon.setAttribute("aria-label", label);
    (entry.querySelector(".entry-name, .document-name") ?? entry).append(icon);
  }
}
