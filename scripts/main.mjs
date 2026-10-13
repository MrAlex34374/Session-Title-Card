/**
 * Entry point: hooks, socket handling and the public API.
 *
 * Flow: a GM action (window, macro or API call) builds a card, sanitizes it, emits it on the module socket
 * and shows it locally (the socket never echoes to the sender). Every receiving client checks that the sender
 * is a GM, sanitizes the card again and shows it.
 */
import {MODULE_ID, SOCKET, t, registerSettings, refreshChoices} from "./settings.mjs";
import {sanitizeCard, cleanMedia, preloadMedia, showOverlay, closeOverlay, isOverlayActive, isManualOverlayActive} from "./overlay.mjs";
import {TitleCardConfig} from "./config-app.mjs";
import {registerCombatCards} from "./combat-cards.mjs";
import {AUTO_FLAG, resolveAutoCard, onRenderSceneConfig, onRenderSceneDirectory} from "./scene-config.mjs";

const COUNTER_PATTERN = /\{\{\s*n\s*\}\}/g;

const TOOL_NAME = "vyrmhalTitleCard";
const MACRO_FLAG = "configMacro";

/* -------------------------------------------- */
/*  Card building (GM side)                     */
/* -------------------------------------------- */

function toInteger(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Math.trunc(Number(value));
  return Number.isFinite(number) ? Math.max(0, number) : null;
}

/**
 * Resolve the session counter, then sanitize the card. The {{n}} token is only replaced when `n` is given
 * or `incrementCounter` is true; nothing is saved here.
 * @returns {{card: object, counter: number|null, save: boolean}|null} null when there is nothing to show
 */
function prepareCard(options) {
  const source = options ?? {};
  const increment = source.incrementCounter === true;
  let counter = toInteger(source.n);
  if (counter === null && increment) counter = game.settings.get(MODULE_ID, "sessionCounter") + 1;

  const resolve = text => (typeof text === "string" && counter !== null
    ? text.replace(COUNTER_PATTERN, String(counter)) : text);

  const {card, warnings} = sanitizeCard({
    ...source,
    title: resolve(source.title),
    subtitle: resolve(source.subtitle),
    tagline: resolve(source.tagline)
  });
  // Players cannot fix a card, so only the GM is told about problems (automatic cards run on every client).
  if (game.user.isGM) for (const key of warnings) ui.notifications.warn(key, {localize: true});
  if (!card) return null;
  return {card, counter, save: increment && counter !== null};
}

/**
 * Normalize a recipient list. Undefined means everyone; an array restricts delivery to those users
 * (the sender is never in it, the socket does not echo to the sender anyway).
 * @returns {string[]|undefined}
 */
function resolveRecipients(list) {
  if (!Array.isArray(list)) return undefined;
  const ids = list.filter(id => typeof id === "string" && id !== game.user.id && game.users.get(id));
  return [...new Set(ids)];
}

/** Emit on the module socket, optionally restricted to some users (enforced by the server). */
function emit(payload, recipients) {
  if (recipients) game.socket.emit(SOCKET, payload, {recipients});
  else game.socket.emit(SOCKET, payload);
}

/* -------------------------------------------- */
/*  Public API                                  */
/* -------------------------------------------- */

const log = (...args) => console.info(`${MODULE_ID} |`, ...args);

/** Fade out the card for everyone. GM only. */
function close() {
  log("close requested", {isGM: game.user.isGM, cardDisplayedHere: isOverlayActive()});
  if (!game.user.isGM) return;
  game.socket.emit(SOCKET, {action: "close", userId: game.user.id});
  closeOverlay();
}

/**
 * Show a card to every connected client. GM only.
 * @param {object} options
 * @param {string} [options.title]
 * @param {string} [options.subtitle]
 * @param {string} [options.tagline]
 * @param {string} [options.image]            Local path of a background image
 * @param {string} [options.sound]            Local path of an intro sound
 * @param {number} [options.volume]           0 to 1
 * @param {number} [options.fadeIn]           ms
 * @param {number} [options.hold]             ms, time during which every text is fully visible
 * @param {number} [options.fadeOut]          ms
 * @param {number} [options.opacity]          0 to 1, opacity of the black veil
 * @param {"full"|"banner"} [options.mode]    Full screen card (default) or lower-third banner
 * @param {string[]} [options.recipients]     User ids to send to. Omit for everyone connected
 * @param {number} [options.n]                Session number replacing {{n}}
 * @param {boolean} [options.incrementCounter] Use and save the next session number
 * @returns {Promise<boolean>} Whether a card was shown
 */
async function show(options = {}) {
  if (!game.user.isGM) {
    ui.notifications.warn(t("VTC.Notify.GMOnly"));
    return false;
  }
  const prepared = prepareCard(options);
  if (!prepared) return false;

  emit({action: "show", userId: game.user.id, card: prepared.card}, resolveRecipients(options.recipients));
  showOverlay(prepared.card, {onUserClose: close});

  if (prepared.save) {
    try {
      await game.settings.set(MODULE_ID, "sessionCounter", prepared.counter);
    } catch (err) {
      console.error(`${MODULE_ID} | Could not save the session counter`, err);
    }
  }
  return true;
}

/** Show a card on the GM's screen only. Same options as show(), the counter is never saved. */
async function preview(options = {}) {
  if (!game.user.isGM) {
    ui.notifications.warn(t("VTC.Notify.GMOnly"));
    return false;
  }
  const prepared = prepareCard({...options, incrementCounter: false});
  if (!prepared) return false;
  showOverlay(prepared.card, {onUserClose: () => closeOverlay()});
  return true;
}

/**
 * Load an image and a sound into the players' caches ahead of a card. GM only.
 * @param {object} options
 * @param {string} [options.image]
 * @param {string} [options.sound]
 * @param {string[]} [options.recipients]   Same meaning as for show()
 * @returns {boolean} Whether there was a valid file to preload
 */
function preload(options = {}) {
  if (!game.user.isGM) {
    ui.notifications.warn(t("VTC.Notify.GMOnly"));
    return false;
  }
  const media = cleanMedia(options);
  if (!media.image && !media.sound) {
    ui.notifications.warn(t("VTC.Warn.NothingToPreload"));
    return false;
  }
  emit({action: "preload", userId: game.user.id, media}, resolveRecipients(options.recipients));
  preloadMedia(media);
  return true;
}

const api = Object.freeze({
  show,
  close,
  preview,
  preload,
  openConfig: () => TitleCardConfig.open()
});

/* -------------------------------------------- */
/*  Socket (receiver side)                      */
/* -------------------------------------------- */

/**
 * The server relays module sockets and appends the id of the user who emitted them as a second argument
 * to the listener (Foundry 14: emit(event, data, this.user.id)). That id comes from the server session and
 * cannot be forged. It is the only identity trusted here: the userId written in the payload is ignored.
 * Whatever the sender, card content is sanitized and only ever inserted with textContent.
 */
function onSocketMessage(payload, serverSenderId) {
  if (!payload || typeof payload !== "object") return;
  const sender = typeof serverSenderId === "string" ? game.users.get(serverSenderId) : null;
  if (!sender?.isGM || !sender.active) {
    log("message ignored, sender is not a connected GM", {action: payload.action, authenticated: typeof serverSenderId === "string"});
    return;
  }
  log("message received", {action: payload.action, from: sender.name});

  switch (payload.action) {
    case "show": {
      const {card} = sanitizeCard(payload.card);
      if (card) showOverlay(card, {onUserClose: close});
      break;
    }
    case "preload":
      preloadMedia(payload.media);
      break;
    case "close":
      closeOverlay();
      break;
  }
}

/* -------------------------------------------- */
/*  Macro                                       */
/* -------------------------------------------- */

/** Create the "Title Card" macro once. Only one GM does it, even when several are connected. */
async function ensureMacro() {
  if (!game.users.activeGM?.isSelf) return;
  if (game.settings.get(MODULE_ID, "macroInitialized")) return;

  const name = t("VTC.Macro.Name");
  const exists = game.macros.some(macro => macro.getFlag(MODULE_ID, MACRO_FLAG) || macro.name === name);
  try {
    if (!exists) {
      await Macro.create({
        name,
        type: "script",
        img: "icons/svg/clockwork.svg",
        command: `game.modules.get("${MODULE_ID}")?.api?.openConfig();`,
        flags: {[MODULE_ID]: {[MACRO_FLAG]: true}}
      });
    }
    await game.settings.set(MODULE_ID, "macroInitialized", true);
  } catch (err) {
    console.error(`${MODULE_ID} | Could not create the macro`, err);
  }
}

/* -------------------------------------------- */
/*  Hooks                                       */
/* -------------------------------------------- */

Hooks.once("init", () => {
  registerSettings();
  game.modules.get(MODULE_ID).api = api;
});

Hooks.once("ready", () => {
  log(`version ${game.modules.get(MODULE_ID).version} ready`);
  refreshChoices();
  game.socket.on(SOCKET, onSocketMessage);
  if (game.user.isGM) ensureMacro();
});

/* -------------------------------------------- */
/*  Automatic card on scene arrival             */
/* -------------------------------------------- */

const LAST_SCENE_KEY = `${MODULE_ID}.lastScene`;
const SEEN_PREFIX = `${MODULE_ID}.seen.`;
const AUTO_LIMITS = Object.freeze({hold: 15000, fade: 3000});

// Browser storage can be unavailable (private window, blocked site data): the same values are kept in memory.
const memory = {lastScene: null, seen: new Map()};

function getLastScene() {
  if (memory.lastScene) return memory.lastScene;
  try {
    return sessionStorage.getItem(LAST_SCENE_KEY);
  } catch (err) {
    return null;
  }
}

function setLastScene(id) {
  memory.lastScene = id;
  try {
    sessionStorage.setItem(LAST_SCENE_KEY, id);
  } catch (err) {
    // Memory fallback only
  }
}

/** "Only once" is scoped to the session number: the list starts over when the session counter goes up. */
const seenKey = () => `${SEEN_PREFIX}${game.world.id}.${game.settings.get(MODULE_ID, "sessionCounter")}`;

function loadSeen(key) {
  const set = memory.seen.get(key) ?? new Set();
  try {
    for (const id of JSON.parse(localStorage.getItem(key) ?? "[]")) set.add(id);
  } catch (err) {
    // Unreadable storage: keep what is in memory
  }
  memory.seen.set(key, set);
  return set;
}

const hasSeenScene = id => loadSeen(seenKey()).has(id);

function markSceneSeen(id) {
  const key = seenKey();
  const set = loadSeen(key);
  set.add(id);
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
    // Lists of earlier sessions are no longer needed.
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const other = localStorage.key(i);
      if (other?.startsWith(SEEN_PREFIX) && other !== key) localStorage.removeItem(other);
    }
  } catch (err) {
    // Memory fallback only
  }
}

/** Show a prepared automatic card (scene or combat). Players can skip it, and it is capped in time. */
function displayAutoCard(card) {
  // Automatic cards never block a player for long, whatever the flag contains (imported scenes, hand edits).
  card.hold = Math.min(card.hold, AUTO_LIMITS.hold);
  card.fadeIn = Math.min(card.fadeIn, AUTO_LIMITS.fade);
  card.fadeOut = Math.min(card.fadeOut, AUTO_LIMITS.fade);
  showOverlay(card, {
    onUserClose: game.user.isGM ? () => closeOverlay() : undefined,
    skippable: !game.user.isGM,
    origin: "auto",
    // A full card fades in from black, so the scene is never seen for a moment before the veil.
    startOpacity: card.mode === "full" ? 1 : 0
  });
}

/** Combat cards: a card the GM sent by hand takes priority. */
function showCombatCard(options) {
  if (isManualOverlayActive()) return;
  const prepared = prepareCard(options);
  if (prepared) displayAutoCard(prepared.card);
}

/**
 * Runs on every client when its canvas finishes loading a scene: scene activation, a player switching scene
 * and a token teleport all end here. The card is built from the scene flag and shown locally, no socket.
 * It is not replayed on a page reload or a canvas redraw of the same scene. With the scene option `once`,
 * it is shown only once per session number.
 */
function showSceneCard(scene) {
  if (!scene || !game.settings.get(MODULE_ID, "autoCardEnabled")) return;
  if (!game.settings.get(MODULE_ID, "autoCardClient")) return;
  if (getLastScene() === scene.id) return;

  const data = scene.getFlag(MODULE_ID, AUTO_FLAG);
  if (!data?.enabled) {
    setLastScene(scene.id);
    return;
  }
  // The GM browsing scenes while preparing should not trigger cards: only when the scene is the active one.
  // Not remembered, so the card still shows when the GM activates the scene they are already on.
  if (game.user.isGM && !(scene.active && game.settings.get(MODULE_ID, "autoCardGM"))) return;

  setLastScene(scene.id);
  if (data.once === true && hasSeenScene(scene.id)) return;
  // A card the GM sent by hand takes priority over the automatic one.
  if (isManualOverlayActive()) return;

  const prepared = prepareCard(resolveAutoCard(data, scene.name));
  if (!prepared) return;

  if (data.once === true) markSceneSeen(scene.id);
  displayAutoCard(prepared.card);
}

Hooks.on("canvasReady", canvas => showSceneCard(canvas.scene));
Hooks.on("renderSceneConfig", onRenderSceneConfig);
Hooks.on("renderSceneDirectory", onRenderSceneDirectory);
registerCombatCards(showCombatCard);

Hooks.on("getSceneControlButtons", controls => {
  if (!game.user.isGM) return;
  const group = controls.tokens;
  if (!group) return;
  group.tools[TOOL_NAME] = {
    name: TOOL_NAME,
    title: "VTC.Control.Title",
    icon: "fa-solid fa-clapperboard",
    order: Object.keys(group.tools).length,
    button: true,
    visible: game.user.isGM,
    onChange: () => TitleCardConfig.open()
  };
});
