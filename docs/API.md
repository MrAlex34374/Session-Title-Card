<!-- Synced with API.fr.md at version 1.3.1 -->
English | [Français](API.fr.md)

# API and macro examples

[Back to the README](../README.md)

```js
const api = game.modules.get("session-title-card").api;
```

## Methods

GM only: a player who calls them gets a warning.

| Method | Role |
| --- | --- |
| `api.show(options)` | Shows the card to everyone. Returns a promise that is `true` if a card was shown. |
| `api.preview(options)` | Same thing, but on the GM's screen only. |
| `api.preload(options)` | Preloads `image` and `sound` on the players' side (`recipients` accepted). Returns `true` if at least one valid file was found. |
| `api.close()` | Closes the card for everyone. |
| `api.openConfig()` | Opens the configuration window. |

## Options of `show` and `preview`

All are optional, but at least one text is required.

| Option | Role |
| --- | --- |
| `title`, `subtitle`, `tagline` | Texts (200, 300 and 300 characters maximum). `tagline` is the ambience text. |
| `image` | Local path of a background image. |
| `sound` | Local path of an audio file. |
| `volume` | Sound volume, from 0 to 1 (0.8 by default). |
| `fadeIn`, `hold`, `fadeOut` | Durations in ms (the settings defaults when missing). Fades from 0 to 30,000 ms, display time from 0 to 120,000 ms. |
| `opacity` | Opacity of the black background, from 0 to 1. |
| `mode` | `"full"` (default) or `"banner"`. |
| `recipients` | Array of targeted user ids. Missing: every connected user. Empty array: nobody but the GM. |
| `n` | Session number that replaces `{{n}}`. |
| `incrementCounter` | `true` to use the next number and save it (ignored by `preview`). |

`{{n}}` is only replaced when `n` or `incrementCounter` is given.

## Examples

Minimal:

```js
game.modules.get("session-title-card").api.show({
  title: "The Ashen Road",
  subtitle: "Chapter one",
  tagline: "The 14th of Harvestmoon, Riverbelle"
});
```

Complete, with image, sound and durations:

```js
game.modules.get("session-title-card").api.show({
  title: "Session 12",
  subtitle: "The Ashen Road",
  tagline: "Three days after the bridge fell",
  image: "assets/maps/night.webp",
  sound: "sounds/intro/horn.ogg",
  volume: 0.7,
  fadeIn: 2000,
  hold: 6000,
  fadeOut: 2000,
  opacity: 0.9
});
```

Automatic counter (the next number is used, then saved):

```js
game.modules.get("session-title-card").api.show({
  title: "Session {{n}}",
  subtitle: "The Ashen Road",
  incrementCounter: true
});
```

Banner announcing a new place, for two players only:

```js
const api = game.modules.get("session-title-card").api;
const players = game.users.filter(u => !u.isGM && ["Alice", "Bruno"].includes(u.name)).map(u => u.id);
api.show({mode: "banner", title: "Riverbelle", tagline: "Day 14", recipients: players});
```

Preload, then show:

```js
const api = game.modules.get("session-title-card").api;
api.preload({image: "assets/maps/night.webp", sound: "sounds/intro/horn.ogg"});
await new Promise(r => setTimeout(r, 4000));
api.show({title: "Session 12", image: "assets/maps/night.webp", sound: "sounds/intro/horn.ogg"});
```

Close the card:

```js
game.modules.get("session-title-card").api.close();
```
