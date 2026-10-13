/**
 * Combat cards: a short banner when a combat starts and when it ends, on every client, without socket.
 *
 * Foundry only calls the "combatStart" hook on the client that clicks "Begin combat", so players would never
 * get it. The start is detected from "updateCombat" instead, a document hook that runs on every client.
 */
import {MODULE_ID} from "./settings.mjs";

/** Ids of the combats already announced, so each start is announced once per client. */
const announced = new Set();

const log = (...args) => console.info(`${MODULE_ID} | combat card |`, ...args);

/** One phrase per start or end, picked at random from the list the GM typed (separated by "|"). */
function pickText(key) {
  const lines = String(game.settings.get(MODULE_ID, key) ?? "").split("|").map(line => line.trim()).filter(Boolean);
  return lines.length ? lines[Math.floor(Math.random() * lines.length)] : "";
}

/** Only announce combats that take place on the scene this client is looking at. */
function isHere(combat) {
  return !combat.scene || combat.scene.id === canvas.scene?.id;
}

function announce(combat, key, showCard) {
  if (!game.settings.get(MODULE_ID, "combatCardEnabled")) return log("skipped, turned off in the world settings");
  if (!game.settings.get(MODULE_ID, "combatCardClient")) return log("skipped, turned off in this client's settings");
  if (!isHere(combat)) return log("skipped, the combat is on another scene");
  const title = pickText(key);
  if (!title) return log("skipped, no text in the list", key);
  showCard({title, mode: "banner"});
}

/** @param {(options: object) => void} showCard   Shows an automatic card, defined in main.mjs */
export function registerCombatCards(showCard) {
  // A client that joins in the middle of a combat must not see a start banner for it.
  Hooks.once("ready", () => {
    for (const combat of game.combats ?? []) if (combat.started) announced.add(combat.id);
  });

  Hooks.on("updateCombat", combat => {
    if (!combat.started) {
      announced.delete(combat.id); // Reset to round 0: the next start is announced again
      return;
    }
    if (announced.has(combat.id)) return;
    announced.add(combat.id);
    announce(combat, "combatStartTexts", showCard);
  });

  Hooks.on("deleteCombat", combat => {
    if (!announced.delete(combat.id)) return;
    announce(combat, "combatEndTexts", showCard);
  });
}
