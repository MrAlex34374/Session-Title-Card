/**
 * Preset library, stored as an array of {id, name, data} in a world setting.
 * Only the GM can write world settings, which matches the GM-only configuration window.
 */
import {MODULE_ID} from "./settings.mjs";

const SETTING = "presets";
const MAX_PRESETS = 100;
const NAME_MAX = 60;

/** Card fields kept in a preset. */
const FIELDS = ["mode", "title", "subtitle", "tagline", "image", "sound", "volume", "fadeIn", "hold", "fadeOut", "opacity"];

const isValidEntry = entry => entry && typeof entry.id === "string" && typeof entry.name === "string"
  && entry.data && typeof entry.data === "object";

function readAll() {
  const stored = game.settings.get(MODULE_ID, SETTING);
  return foundry.utils.deepClone(Array.isArray(stored) ? stored : []).filter(isValidEntry);
}

function pick(data) {
  const result = {};
  for (const key of FIELDS) {
    if (data?.[key] !== undefined) result[key] = data[key];
  }
  return result;
}

/** All presets, sorted by name. */
export function listPresets() {
  return readAll().sort((a, b) => a.name.localeCompare(b.name));
}

export function getPreset(id) {
  return readAll().find(entry => entry.id === id) ?? null;
}

export function findPresetByName(name) {
  const wanted = String(name ?? "").trim().toLocaleLowerCase();
  return readAll().find(entry => entry.name.toLocaleLowerCase() === wanted) ?? null;
}

/**
 * Save a preset under a name.
 * @param {string} rawName
 * @param {object} data                   Card values to store
 * @param {object} [options]
 * @param {boolean} [options.overwrite]   Replace an existing preset with the same name
 * @returns {Promise<{status: "saved"|"exists"|"invalid"|"full", preset?: object}>}
 */
export async function savePreset(rawName, data, {overwrite = false} = {}) {
  const name = String(rawName ?? "").trim().slice(0, NAME_MAX);
  if (!name) return {status: "invalid"};

  const presets = readAll();
  const existing = presets.find(entry => entry.name.toLocaleLowerCase() === name.toLocaleLowerCase());
  if (existing && !overwrite) return {status: "exists", preset: existing};
  if (!existing && presets.length >= MAX_PRESETS) return {status: "full"};

  const preset = {id: existing?.id ?? foundry.utils.randomID(), name, data: pick(data)};
  if (existing) presets[presets.indexOf(existing)] = preset;
  else presets.push(preset);
  await game.settings.set(MODULE_ID, SETTING, presets);
  return {status: "saved", preset};
}

/** @returns {Promise<boolean>} Whether a preset was removed. */
export async function deletePreset(id) {
  const presets = readAll();
  const remaining = presets.filter(entry => entry.id !== id);
  if (remaining.length === presets.length) return false;
  await game.settings.set(MODULE_ID, SETTING, remaining);
  return true;
}
