/**
 * Card sanitizing, overlay creation, animation and cleanup.
 * Everything inserted in the DOM goes through textContent or style properties, never innerHTML.
 */
import {MODULE_ID, DEFAULT_FONT, LIMITS, t, getDefaults, getStyleSettings} from "./settings.mjs";

const REDUCED_MOTION_CAP = 400;   // Max fade duration (ms) when the client prefers reduced motion
const MANUAL_CLOSE_MAX = 800;     // Max fade out (ms) when the GM closes the card by hand
const REMOVE_MARGIN = 120;        // Extra delay (ms) after the fade out before removing the DOM
const MAX_STEP = 600;             // Max stagger (ms) between title, subtitle and tagline

const ACTIVE_BODY_CLASS = "vtc-card-active"; // On <body> while a card is displayed

const SHADOWS = Object.freeze({
  none: "none",
  soft: "0 2px 18px rgba(0, 0, 0, 0.65)",
  strong: "0 2px 4px rgba(0, 0, 0, 0.9), 0 4px 28px rgba(0, 0, 0, 0.9)"
});

/* -------------------------------------------- */
/*  Sanitizing                                  */
/* -------------------------------------------- */

function cleanText(value, max) {
  if (typeof value !== "string") return "";
  // Strip control characters except tab and line feed, then trim and cap the length.
  return value.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, max);
}

function clampNumber(value, min, max, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function safeDecode(path) {
  try {
    return decodeURI(path);
  } catch (err) {
    return path;
  }
}

/**
 * Validate a media path. Only local relative paths are accepted: no scheme, no protocol-relative URL,
 * no parent directory segment, no backslash.
 * @returns {string|null} The normalized path, an empty string when no path was given, null when invalid.
 */
function cleanPath(value, isAllowedExtension) {
  if (value === null || value === undefined) return "";
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.length > 1024) return null;
  if (/[\u0000-\u001F\u007F\\]/.test(trimmed)) return null;
  if (trimmed.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null;
  // Foundry paths are relative to the server root, so a single leading slash is dropped.
  const path = trimmed.replace(/^\/+/, "");
  if (!path) return null;
  if (/(^|\/)\.\.(\/|$)/.test(safeDecode(path))) return null;
  return isAllowedExtension(path) ? path : null;
}

const hasExtension = (path, extensions) => {
  const match = /\.([a-z0-9]+)$/i.exec(path);
  return Boolean(match) && Object.hasOwn(extensions, match[1].toLowerCase());
};
const isImagePath = path => hasExtension(path, CONST.IMAGE_FILE_EXTENSIONS);
const isAudioPath = path => foundry.audio.AudioHelper.hasAudioExtension(path);

/** Percent-encode a validated relative path so it is safe in a URL and inside a CSS url("...") token. */
export function toUrl(path) {
  return encodeURI(safeDecode(path))
    .replace(/[#?()']/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

/**
 * Normalize an untrusted card description: cap text lengths, clamp numbers, validate media paths.
 * Missing numbers fall back to the world defaults.
 * @param {object} raw
 * @returns {{card: object|null, warnings: string[]}} card is null when there is nothing to display.
 *          Warnings are localization keys.
 */
export function sanitizeCard(raw) {
  const source = (raw && typeof raw === "object") ? raw : {};
  const mode = source.mode === "banner" ? "banner" : "full";
  const defaults = getDefaults(mode);
  const warnings = [];

  // Banners have no background image, so the image is neither validated nor kept.
  const image = mode === "banner" ? "" : cleanPath(source.image, isImagePath);
  if (image === null) {
    warnings.push("VTC.Warn.InvalidImage");
    console.warn(`${MODULE_ID} | Rejected image path`, source.image);
  }
  const sound = cleanPath(source.sound, isAudioPath);
  if (sound === null) {
    warnings.push("VTC.Warn.InvalidSound");
    console.warn(`${MODULE_ID} | Rejected sound path`, source.sound);
  }

  const card = {
    mode,
    title: cleanText(source.title, LIMITS.title),
    subtitle: cleanText(source.subtitle, LIMITS.subtitle),
    tagline: cleanText(source.tagline, LIMITS.tagline),
    image: image ?? "",
    sound: sound ?? "",
    volume: clampNumber(source.volume, 0, 1, defaults.volume),
    fadeIn: Math.round(clampNumber(source.fadeIn, LIMITS.fade.min, LIMITS.fade.max, defaults.fadeIn)),
    hold: Math.round(clampNumber(source.hold, LIMITS.hold.min, LIMITS.hold.max, defaults.hold)),
    fadeOut: Math.round(clampNumber(source.fadeOut, LIMITS.fade.min, LIMITS.fade.max, defaults.fadeOut)),
    opacity: clampNumber(source.opacity, 0, 1, defaults.opacity)
  };

  if (!card.title && !card.subtitle && !card.tagline) {
    warnings.push("VTC.Warn.Empty");
    return {card: null, warnings};
  }
  return {card, warnings};
}

/**
 * Validate the media of a card or preload request, without warnings.
 * @returns {{image: string, sound: string}} Empty strings for missing or invalid paths.
 */
export function cleanMedia(raw) {
  const source = (raw && typeof raw === "object") ? raw : {};
  return {
    image: cleanPath(source.image, isImagePath) || "",
    sound: cleanPath(source.sound, isAudioPath) || ""
  };
}

/** Images being preloaded stay referenced for a while so the browser does not drop in-flight loads. */
const preloadedImages = [];
const MAX_PRELOADED_IMAGES = 8;

/**
 * Load the image and sound of an upcoming card into this client's caches, so the card shows without delay.
 * The sound is skipped for players who disabled it.
 * @returns {{image: boolean, sound: boolean}} What was requested.
 */
export function preloadMedia(raw) {
  const {image, sound} = cleanMedia(raw);
  const requested = {image: Boolean(image), sound: false};

  if (image) {
    const probe = new Image();
    probe.src = toUrl(image);
    probe.decode?.().catch(() => {});
    preloadedImages.push(probe);
    if (preloadedImages.length > MAX_PRELOADED_IMAGES) preloadedImages.shift();
  }

  if (sound && !game.settings.get(MODULE_ID, "muteSound")) {
    requested.sound = true;
    Promise.resolve(foundry.audio.AudioHelper.preloadSound(sound))
      .catch(err => console.warn(`${MODULE_ID} | Could not preload sound`, sound, err));
  }
  return requested;
}

/* -------------------------------------------- */
/*  Overlay                                     */
/* -------------------------------------------- */

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  if (text) element.textContent = text;
  return element;
}

class TitleCardOverlay {
  /**
   * @param {object} card                     A sanitized card
   * @param {object} options
   * @param {number} options.startOpacity     Opacity the black veil starts from (non-zero when replacing a card)
   * @param {Function} options.onUserClose    Called when the GM asks to close the card
   */
  constructor(card, {startOpacity = 0, onUserClose} = {}) {
    this.#card = card;
    this.#startOpacity = startOpacity;
    this.#onUserClose = onUserClose ?? (() => this.dismiss({fast: true}));
  }

  #card;
  #startOpacity;
  #onUserClose;
  #root = null;
  #backdrop = null;
  #probe = null;
  #sound = null;
  #keyHandler = null;
  #fadeOut = 0;
  #leaving = false;
  #destroyed = false;
  #timers = new Set();

  get mode() {
    return this.#card.mode;
  }

  /** Current opacity of the black veil, read from the live style. */
  get backdropOpacity() {
    if (!this.#backdrop) return 0;
    const value = parseFloat(getComputedStyle(this.#backdrop).opacity);
    return Number.isFinite(value) ? value : 0;
  }

  /** Schedule a callback that is cancelled automatically on destroy. */
  #later(callback, delay) {
    const id = setTimeout(() => {
      this.#timers.delete(id);
      if (!this.#destroyed) callback();
    }, delay);
    this.#timers.add(id);
  }

  start() {
    const card = this.#card;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const cap = ms => (reduced ? Math.min(ms, REDUCED_MOTION_CAP) : ms);
    const fadeIn = cap(card.fadeIn);
    this.#fadeOut = cap(card.fadeOut);
    const step = reduced ? 0 : Math.min(MAX_STEP, Math.round(fadeIn * 0.3));
    const style = getStyleSettings();

    const root = this.#root = createElement("div", "vtc-overlay");
    const banner = card.mode === "banner";
    if (reduced) root.classList.add("vtc-reduced");
    if (banner) root.classList.add("vtc-banner");
    // No aria-live on the overlay itself: the announcement goes through a dedicated hidden region (below).
    root.setAttribute("role", "group");
    root.setAttribute("aria-label", card.title || card.subtitle || card.tagline);

    // Fonts come from the local world settings and are only used if Foundry knows them.
    const font = Object.hasOwn(CONFIG.fontDefinitions ?? {}, style.fontFamily) ? style.fontFamily : DEFAULT_FONT;
    const vars = {
      "--vtc-fade-in": `${fadeIn}ms`,
      "--vtc-fade-out": `${this.#fadeOut}ms`,
      "--vtc-step": `${step}ms`,
      "--vtc-backdrop-opacity": String(card.opacity),
      "--vtc-start-opacity": String(this.#startOpacity),
      "--vtc-font": `"${font.replace(/["\\;{}]/g, "")}", "${DEFAULT_FONT}", sans-serif`,
      "--vtc-title-color": style.titleColor,
      "--vtc-subtitle-color": style.subtitleColor,
      "--vtc-title-size": String(style.titleSize),
      "--vtc-shadow": SHADOWS[style.shadow] ?? SHADOWS.soft
    };
    for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);

    this.#backdrop = createElement("div", "vtc-backdrop");
    root.append(this.#backdrop);

    if (card.image && !banner) {
      const image = createElement("div", "vtc-image");
      image.style.backgroundImage = `url("${toUrl(card.image)}")`;
      root.append(image);
      this.#probeImage(card.image);
    }

    const content = createElement("div", "vtc-content");
    let index = 0;
    // direction: -1 enters from the left, 1 from the right. The CSS slides the text to its place.
    const addText = (className, text, direction, extra) => {
      if (!text) return;
      const element = createElement("div", `${className} vtc-reveal`, text);
      element.style.setProperty("--vtc-i", String(++index));
      element.style.setProperty("--vtc-dir", String(direction));
      extra?.(element);
      content.append(element);
    };
    addText("vtc-title", card.title, -1, el => {
      el.setAttribute("role", "heading");
      el.setAttribute("aria-level", "1");
    });
    if (card.subtitle) {
      const rule = createElement("div", "vtc-rule vtc-reveal");
      rule.setAttribute("aria-hidden", "true");
      rule.style.setProperty("--vtc-i", String(index + 1));
      content.append(rule);
    }
    addText("vtc-subtitle", card.subtitle, 1);
    addText("vtc-tagline", card.tagline, -1);
    root.append(content);

    // Dedicated live region, filled after insertion so screen readers announce the card once.
    const region = createElement("div", "vtc-sr");
    region.setAttribute("role", "status");
    region.setAttribute("aria-live", "polite");
    region.setAttribute("aria-atomic", "true");
    root.append(region);
    const announcement = [card.title, card.subtitle, card.tagline].filter(Boolean).join(". ");

    if (game.user.isGM) {
      const button = createElement("button", "vtc-close", t(banner ? "VTC.Overlay.CloseBanner" : "VTC.Overlay.Close"));
      button.type = "button";
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        this.#onUserClose();
      });
      root.append(button);

      // Escape never fires while typing in a field, with a modifier, or when another handler already took it.
      const isEscape = event => event.key === "Escape" && !event.defaultPrevented && !event.isComposing
        && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey
        && !event.target?.closest?.("input, textarea, select, [contenteditable]");
      if (!banner) {
        // Full card: it covers the game, so Escape closes it. Capture on window so Foundry's own Escape handling
        // (closing windows, opening the menu) does not also fire.
        this.#keyHandler = event => {
          if (!isEscape(event)) return;
          event.preventDefault();
          event.stopImmediatePropagation();
          if (!event.repeat) this.#onUserClose();
        };
        window.addEventListener("keydown", this.#keyHandler, true);
      } else {
        // A banner does not block the game, so Escape keeps its normal meaning everywhere, except when the
        // keyboard focus is on the banner itself (its close button).
        root.addEventListener("keydown", event => {
          if (!isEscape(event)) return;
          event.preventDefault();
          event.stopPropagation();
          if (!event.repeat) this.#onUserClose();
        });
      }
    }

    document.body.append(root);
    // Lets the GM's own windows stay above the card (see the stylesheet), so they can still be used.
    document.body.classList.add(ACTIVE_BODY_CLASS);
    void root.offsetWidth; // Commit the initial styles so the transitions run
    root.classList.add("vtc-visible");

    // Hold starts once the last text has finished fading in.
    const enterTime = fadeIn + step * index;
    this.#later(() => this.dismiss(), enterTime + card.hold);

    this.#later(() => { region.textContent = announcement; }, 150);
    this.#playSound();
  }

  /** Probe the image so the layer only fades in once loaded, and the GM is told if it fails. */
  #probeImage(path) {
    const probe = this.#probe = new Image();
    probe.onload = () => {
      if (!this.#destroyed) this.#root.classList.add("vtc-has-image");
    };
    probe.onerror = () => this.#reportMediaError("VTC.Warn.ImageLoad", path);
    probe.src = toUrl(path);
  }

  async #playSound() {
    const {sound, volume} = this.#card;
    if (!sound) return;
    if (game.settings.get(MODULE_ID, "muteSound")) return;
    const level = volume * game.settings.get(MODULE_ID, "masterVolume");
    if (!(level > 0)) return;
    try {
      const playing = await foundry.audio.AudioHelper.play({src: sound, volume: level, loop: false, channel: "interface"}, false);
      // The card may have been closed or replaced while the file was loading.
      if (this.#destroyed || this.#leaving) {
        playing?.stop();
        return;
      }
      this.#sound = playing ?? null;
    } catch (err) {
      this.#reportMediaError("VTC.Warn.SoundLoad", sound, err);
    }
  }

  /** Log the problem everywhere, but only bother the GM with a notification. */
  #reportMediaError(key, path, err) {
    console.warn(`${MODULE_ID} | ${t(key)}`, path, err ?? "");
    if (game.user.isGM && !this.#destroyed) ui.notifications.warn(key, {localize: true});
  }

  /**
   * Start the fade out, then remove the overlay.
   * @param {object} [options]
   * @param {boolean} [options.fast]   Cap the fade out, used when the GM closes the card by hand.
   */
  dismiss({fast = false} = {}) {
    if (this.#leaving || this.#destroyed) return;
    this.#leaving = true;
    const duration = fast ? Math.min(this.#fadeOut, MANUAL_CLOSE_MAX) : this.#fadeOut;

    // Free the key as soon as the card is leaving so Escape works normally again.
    this.#removeKeyHandler();
    for (const id of this.#timers) clearTimeout(id);
    this.#timers.clear();

    this.#root.style.setProperty("--vtc-fade-out", `${duration}ms`);
    this.#root.classList.remove("vtc-visible");
    this.#root.classList.add("vtc-leaving");

    const sound = this.#sound;
    if (sound) {
      Promise.resolve(sound.fade(0, {duration})).catch(() => {}).then(() => sound.stop()).catch(() => {});
    }

    if (duration <= 0) this.destroy();
    else this.#later(() => this.destroy(), duration + REMOVE_MARGIN);
  }

  #removeKeyHandler() {
    if (!this.#keyHandler) return;
    window.removeEventListener("keydown", this.#keyHandler, true);
    this.#keyHandler = null;
  }

  /** Immediately release everything: timers, listeners, sound, DOM. Safe to call more than once. */
  destroy() {
    if (this.#destroyed) return;
    this.#destroyed = true;
    for (const id of this.#timers) clearTimeout(id);
    this.#timers.clear();
    this.#removeKeyHandler();
    if (this.#probe) {
      this.#probe.onload = this.#probe.onerror = null;
      this.#probe = null;
    }
    if (this.#sound) {
      const sound = this.#sound;
      this.#sound = null;
      Promise.resolve(sound.stop()).catch(() => {});
    }
    this.#root?.remove();
    this.#root = null;
    this.#backdrop = null;
    if (current === this) {
      current = null;
      document.body.classList.remove(ACTIVE_BODY_CLASS);
    }
  }
}

/* -------------------------------------------- */
/*  Public controller                           */
/* -------------------------------------------- */

/** The one overlay currently on screen, if any. */
let current = null;

/**
 * Display a sanitized card on the local client, replacing any card already shown.
 * @param {object} card
 * @param {object} [options]
 * @param {Function} [options.onUserClose]   Called when the GM closes the card (button or Escape)
 */
export function showOverlay(card, {onUserClose} = {}) {
  // Keep the black veil continuous when replacing, so the game never flashes through.
  let startOpacity = 0;
  if (current) {
    if (current.mode === card.mode) startOpacity = current.backdropOpacity;
    current.destroy();
  }
  current = new TitleCardOverlay(card, {startOpacity, onUserClose});
  current.start();
}

/** Whether a card is currently displayed on this client. */
export function isOverlayActive() {
  return current !== null;
}

/** Fade out the current card, if any. */
export function closeOverlay({fast = true} = {}) {
  if (!current) console.info(`${MODULE_ID} | close requested but no card is displayed on this client`);
  current?.dismiss({fast});
}
