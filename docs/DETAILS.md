<!-- Synced with DETAILS.fr.md at version 1.3.1 -->
English | [Français](DETAILS.fr.md)

# Detailed documentation

[Back to the README](../README.md) · [API and macros](API.md)

## Contents

- [The configuration window](#the-configuration-window)
- [Banner](#banner)
- [Preloading, recipients, closing](#preloading-recipients-closing)
- [Session counter and presets](#session-counter-and-presets)
- [Automatic per-scene title card](#automatic-per-scene-title-card)
- [Combat cards](#combat-cards)
- [Settings](#settings)
- [Detailed behavior](#detailed-behavior)
- [Security](#security)
- [Design decisions](#design-decisions)

## The configuration window

GM only. Three ways in: the **Title Card** tool (clapperboard icon) in the token controls group, the **Title Card** macro created automatically on first launch, or `game.modules.get("session-title-card").api.openConfig()`.

| Field | Role |
| --- | --- |
| Display type | *Full screen card* or *Banner (bottom of the screen)*. |
| Title | Main text. `{{n}}` is replaced by the session number when the counter is used. |
| Subtitle | Optional. |
| Ambience text | Optional, small and in italics (a date, a place). |
| Background image | Optional, picked with the file picker. |
| Intro sound and volume | Optional. |
| Fade in, display time, fade out | In seconds in the advanced options (1.5, 5 and 1.5 by default). Presets and the API stay in milliseconds. |
| Black background opacity | From 0 to 1, 0.92 by default. |
| Audience | Choice of recipients. |
| Presets | Load, save, delete. |

The window opens on the **Quick launch** view: title, subtitle, session number, display type, duration Short (x0.5), Normal or Long (x2), a live thumbnail preview with a WCAG contrast badge (OK from 4.5:1, computed against the worst possible background under the black veil), then the buttons. **Advanced options** unfolds the tabs: Texts, Image and sound, Durations and background, Audience, Presets. The values you type are remembered in your browser.

Buttons: **Show to everyone** (every connected client, GM included), **Preview (me only)** (on your screen, the counter is untouched), **Close the card** (for everyone).

## Banner

- Text at the bottom of the screen, over a dark gradient, smaller than the full screen card.
- Blocks no click, uses no background image.
- Shorter default durations (1000, 3500 and 1000 ms) and a lighter veil (0.75). These values are not in the settings.
- Changing the type in the window replaces the durations that were not edited by hand.
- **Esc does not close it** (it keeps its Foundry role): the GM uses the small button at the bottom right, or Esc when that button has focus.
- Sound and counter work as for the full screen card.

## Preloading, recipients, closing

**Preloading.** The **Preload for players** button (Image and sound tab) loads the image and the sound in the players' browsers, so the card shows without delay. Do it a few seconds before showing, especially with a big image. Players who disabled the sound do not load the audio. In a macro: `api.preload({image, sound})`.

**Recipients.** The **Audience** tab lists the other users of the world, online or not. Untick those who must not receive the card. The choice applies to **Show to everyone** and to preloading, and it is kept until the page reloads. An alert shows the number of targeted users when the choice is restricted. Closing always concerns everyone.

**Closing.** The GM closes the card for everyone with **Esc** (full screen card, no effect while typing in a field) or with the button at the bottom right (44 px minimum, visible focus ring). It fades out in 800 ms at most. For cards sent by hand, players have no button and no shortcut.

## Session counter and presets

**Counter.** Tick **Use the session number** so that `{{n}}` is replaced by the number in the **Session number** field. On every **Show to everyone**, that number is saved as the last session number and the field suggests the next one. You can fix it before showing. The preview never changes the counter. If the text contains `{{n}}` while the counter is off, the pattern is shown as is and an alert tells you.

**Presets.** A preset saves the title, subtitle, ambience text, image, sound, volume, durations and opacity. They are stored in a world setting (shared by the world's GMs, invisible to players). Saving under an existing name asks for confirmation.

## Automatic per-scene title card

In a scene's configuration (basic tab), the **Automatic title card** block holds: Enable, title (the scene name when empty), subtitle, ambience text, display type (banner by default), duration Short, Normal or Long, image (full screen only), sound, **Only once**, and a preview button. The data lives in the scene flag `flags.session-title-card.autoCard`. Scenes that have a card show a clapperboard icon in the scene directory.

| Rule | Detail |
| --- | --- |
| Triggers | The player's canvas loads the scene: activation by the GM, scene change, token teleport if it changes the scene the player views. |
| Repeats | No replay on page reload or when the same scene is redrawn. Replayed if the player comes back after another scene, except with **Only once** (until the next session number). |
| Session number | It only goes up when you send a card with the counter on. Without that, "only once" means forever. |
| GM | Sees the card only if the scene is active and "Automatic title cards for the GM" is ticked. |
| Players | Can skip it after 1.5 s (button, Esc or click in full screen) and turn it off with "Show scene title cards". |
| Priority | A card sent by hand stays on screen. An automatic card is replaced by the next one. |
| Durations | Short, Normal and Long multiply the type's default durations by 0.5, 1 or 2. Caps: display time 15 s, fades 3 s. Opacity and volume: module defaults. A full screen card fades in from black. |
| `{{n}}` | Replaced by the last saved session number, without incrementing it. Removed while the counter is 0. The preview follows the same rule. |
| Secrets | The flag is readable by players (browser console). Keep secrets out of the block. |
| Master switch | World setting "Automatic per-scene title cards". |

## Combat cards

A banner shows to all players at the start and at the end of every combat on the scene they are viewing. The start is detected with the `updateCombat` hook: `combatStart` is only received by the GM, so it would not work. The end uses `deleteCombat` and is only announced if the start was. A player who connects in the middle of a combat sees no start banner.

The phrase is picked at random from the **Combat start texts** and **Combat end texts** lists (separator `|`). Empty list: no banner for that moment. Off by default: turn on "Automatic combat cards" (world setting) after telling your players. Everyone, GM included, can turn them off with "Show combat cards". A card sent by hand keeps priority.

## Settings

In **Game Settings, Configure Settings, Session Title Card**.

| Setting | Scope | Default |
| --- | --- | --- |
| Font (list from `CONFIG.fontDefinitions`) | World | Signika |
| Title color, subtitle color | World | `#f2e6c9`, `#c9b98f` |
| Title size | World | 72 px (24 to 240), reduced automatically on small screens |
| Shadow | World | Soft (none, soft, strong) |
| Fade in, display time, fade out | World | 1.5 s, 5 s, 1.5 s |
| Background opacity | World | 0.92 |
| Automatic per-scene title cards | World | On |
| Automatic combat cards | World | Off |
| Combat start and end texts | World | Three phrases each |
| Disable intro sound | Client | No |
| Intro sound volume | Client | 0.8 (multiplies the GM's volume) |
| Show scene title cards | Client | Yes |
| Show combat cards | Client | Yes |
| Automatic title cards for the GM | Client | Yes |

The style (font, colors, size, shadow) is read on every client from the world settings. It is not sent in the socket message.

## Detailed behavior

- **Timeline**: the black background fades in, then the title, then the subtitle and the ambience text with a slight delay (30% of the fade in, 600 ms at most). The display time starts when the last text is fully visible. Total: fade in + delays + display time + fade out.
- **Card already showing**: the new one replaces the old one without stacking. The black veil stays continuous to avoid a flash, and the old card's timers and sounds are released.
- **Connecting during a card**: the player sees nothing, on purpose.
- **Clicks**: the overlay blocks clicks while shown, except for a banner. It blocks nothing as soon as the fade out starts.
- **Background image**: drawn over the black veil (55% opacity, a vignette keeps the text readable). To change the image opacity, one CSS rule on `--vtc-image-opacity` is enough.
- **Reduced motion**: with `prefers-reduced-motion`, no delay and no movement, only fades of 400 ms at most.
- **Small and multiple screens**: the overlay covers the browser window, texts shrink with the size, margins respect the safe areas of mobile devices.
- **Sound**: played on Foundry's interface channel, chosen volume multiplied by the client volume, faded out during the fade out.

## Security

- The Foundry server relays module sockets and adds the id of the user who emitted the message, taken from their session. Every client uses that id, which cannot be forged, and ignores any message whose sender is not a connected GM. Verified in the version 14 code. The id written inside the message is ignored: if the server does not provide the sender, the message is rejected.
- Received content is sanitized: texts are truncated and inserted with `textContent` (never `innerHTML`), numbers are bounded, paths are limited to local image and audio files (no external URL, no `..`). Automatic cards read from a scene flag follow the same rules.
- The recipient restriction is enforced by the server.
- Invalid paths are ignored with a discreet alert to the GM, without breaking the display.

## Design decisions

- The tool sits in the token controls group, present in every scene.
- The automatic macro is created only once: if you delete it, it is not recreated. It is also skipped if a macro already has the same name.
- The background image accepts the image formats Foundry knows, not videos.
- The banner takes no image and has its own default values.
- Preloading is not automatic: button or `api.preload`.
- The font is set in the module settings, because the style is shared by every card.
