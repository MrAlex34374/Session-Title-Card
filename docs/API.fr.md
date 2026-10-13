<!-- Synchronisé avec API.md à la version 1.3.1 -->
[English](API.md) | Français

# API et exemples de macro

[Retour au README](../README.fr.md)

```js
const api = game.modules.get("session-title-card").api;
```

## Méthodes

Réservées au MJ : un joueur qui les appelle reçoit un avertissement.

| Méthode | Rôle |
| --- | --- |
| `api.show(options)` | Affiche la carte à tous. Retourne une promesse qui vaut `true` si une carte a été affichée. |
| `api.preview(options)` | Même chose, mais chez le MJ uniquement. |
| `api.preload(options)` | Précharge `image` et `sound` chez les joueurs (`recipients` accepté). Retourne `true` si au moins un fichier valide a été trouvé. |
| `api.close()` | Ferme la carte pour tout le monde. |
| `api.openConfig()` | Ouvre la fenêtre de configuration. |

## Options de `show` et `preview`

Toutes sont optionnelles, mais au moins un texte est nécessaire.

| Option | Rôle |
| --- | --- |
| `title`, `subtitle`, `tagline` | Textes (200, 300 et 300 caractères maximum). `tagline` est le texte d'ambiance. |
| `image` | Chemin local d'une image de fond. |
| `sound` | Chemin local d'un fichier audio. |
| `volume` | Volume du son, de 0 à 1 (0,8 par défaut). |
| `fadeIn`, `hold`, `fadeOut` | Durées en ms (valeurs par défaut des réglages si absentes). Fondus de 0 à 30 000 ms, durée d'affichage de 0 à 120 000 ms. |
| `opacity` | Opacité du fond noir, de 0 à 1. |
| `mode` | `"full"` (par défaut) ou `"banner"`. |
| `recipients` | Tableau d'identifiants d'utilisateurs ciblés. Absent : tous les utilisateurs connectés. Tableau vide : personne d'autre que le MJ. |
| `n` | Numéro de session qui remplace `{{n}}`. |
| `incrementCounter` | `true` pour utiliser le numéro suivant et l'enregistrer (ignoré par `preview`). |

`{{n}}` n'est remplacé que si `n` ou `incrementCounter` est fourni.

## Exemples

Minimal :

```js
game.modules.get("session-title-card").api.show({
  title: "La route des cendres",
  subtitle: "Chapitre premier",
  tagline: "Le 14 du mois des moissons, Rivebelle"
});
```

Complet, avec image, son et durées :

```js
game.modules.get("session-title-card").api.show({
  title: "Session 12",
  subtitle: "La route des cendres",
  tagline: "Trois jours après la chute du pont",
  image: "assets/maps/night.webp",
  sound: "sounds/intro/horn.ogg",
  volume: 0.7,
  fadeIn: 2000,
  hold: 6000,
  fadeOut: 2000,
  opacity: 0.9
});
```

Compteur automatique (le numéro suivant est utilisé puis enregistré) :

```js
game.modules.get("session-title-card").api.show({
  title: "Session {{n}}",
  subtitle: "La route des cendres",
  incrementCounter: true
});
```

Bandeau de changement de lieu, réservé à deux joueurs :

```js
const api = game.modules.get("session-title-card").api;
const players = game.users.filter(u => !u.isGM && ["Alice", "Bruno"].includes(u.name)).map(u => u.id);
api.show({mode: "banner", title: "Rivebelle", tagline: "Jour 14", recipients: players});
```

Précharger puis afficher :

```js
const api = game.modules.get("session-title-card").api;
api.preload({image: "assets/maps/night.webp", sound: "sounds/intro/horn.ogg"});
await new Promise(r => setTimeout(r, 4000));
api.show({title: "Session 12", image: "assets/maps/night.webp", sound: "sounds/intro/horn.ogg"});
```

Fermer la carte :

```js
game.modules.get("session-title-card").api.close();
```
