<!-- Synchronisé avec README.md à la version 1.3.1 -->
[English](README.md) | Français

<div align="center">

# Session Title Card

**Une carte de titre sobre sur l'écran de tous vos joueurs, en deux clics.**

![Version 1.3.1](https://img.shields.io/badge/version-1.3.1-blue?style=flat-square)
![Licence MIT](https://img.shields.io/badge/licence-MIT-green?style=flat-square)
![Foundry VTT v13 à v14](https://img.shields.io/badge/Foundry%20VTT-v13%20%7C%20v14-orange?style=flat-square)
![Langues FR et EN](https://img.shields.io/badge/langues-FR%20%7C%20EN-lightgrey?style=flat-square)

[Installation](#installation) · [Démarrage rapide](#démarrage-rapide) · [Cartes automatiques](#cartes-automatiques) · [Réglages](#réglages) · [Dépannage](#dépannage)

</div>

<table>
  <tr>
    <td align="center" width="50%">
      <img src="docs/images/full-screen-card.png" alt="Carte plein écran : fond sombre, titre crème en capitales espacées, sous-titre ocre et texte d'ambiance en italique" width="100%"><br>
      <sub>Carte plein écran</sub>
    </td>
    <td align="center" width="50%">
      <img src="docs/images/banner.png" alt="Bandeau en bas de l'écran : même texte sur un dégradé sombre, le jeu reste visible derrière" width="100%"><br>
      <sub>Bandeau : le jeu reste utilisable</sub>
    </td>
  </tr>
</table>

## Ce que fait le module

| | |
| --- | --- |
| **Carte plein écran** | Titre, sous-titre, texte d'ambiance, image de fond et son d'intro, avec fondus. |
| **Bandeau** | Annonce un lieu ou une date en bas de l'écran, sans bloquer le jeu. |
| **Carte par scène** | S'affiche toute seule quand un joueur arrive sur la scène. |
| **Carte de combat** | Bandeau au début et à la fin de chaque combat (désactivée par défaut). |

- **Rapide** : titre, sous-titre, aperçu en direct, puis « Afficher à tous ».
- **Maîtrisé** : choix des destinataires, presets, numéro de session automatique (`{{n}}`).
- **Respectueux des joueurs** : chacun peut passer ou couper les cartes automatiques chez lui.
- **Léger** : aucune dépendance, aucun appel réseau, tous les systèmes de jeu.

## Installation

Dans Foundry : **Add-on Modules**, puis **Install Module**. Collez l'adresse ci-dessous dans **Manifest URL**, cliquez sur **Install**, puis activez le module dans votre monde.

```
https://github.com/MrAlex34374/Session-Title-Card/releases/latest/download/module.json
```

<details>
<summary>Installation manuelle (copie du dossier)</summary>

1. Copiez le dossier `session-title-card` dans `Data/modules`.
2. Vérifiez que `module.json` est directement dans ce dossier.
3. Rechargez la liste des modules (retour à la page d'accueil, puis relance du monde).
4. Dans le monde : **Gérer les modules**, cochez **Session Title Card**.

</details>

## Démarrage rapide

1. Ouvrez la fenêtre : outil **Carte de titre** (icône de clap) dans les contrôles de jetons, ou macro **Carte de titre** créée automatiquement.
2. Saisissez un titre et un sous-titre, choisissez *Carte plein écran* ou *Bandeau*, puis une durée.
3. Cliquez sur **Afficher à tous**. Pour essayer d'abord chez vous : **Aperçu (moi seul)**.

> [!TIP]
> Échap ou le bouton en bas à droite ferme la carte pour tout le monde. Le bandeau se ferme seulement avec son bouton.

## Cartes automatiques

**Par scène.** Dans la configuration d'une scène, le bloc **Carte de titre automatique** décrit une carte affichée à chaque joueur qui arrive sur la scène (activation, changement de scène, téléportation de token).

- Les joueurs peuvent la passer après 1,5 s, ou couper ces cartes dans leurs réglages.
- Une carte envoyée à la main par le MJ reste prioritaire.
- L'option **Une seule fois** ne rejoue pas la carte avant le prochain numéro de session.

> [!WARNING]
> Les joueurs peuvent lire le contenu du bloc (console du navigateur). N'y mettez aucun secret.

**Au combat.** Un bandeau annonce le début et la fin de chaque combat, avec une phrase tirée au hasard dans vos listes (séparées par `|`).

> [!IMPORTANT]
> Les cartes de combat sont désactivées par défaut. Prévenez vos joueurs avant d'activer **Cartes de combat automatiques**.

## Réglages

Dans **Paramètres, Configurer les paramètres, Session Title Card**.

| Réglage | Portée | Par défaut |
| --- | --- | --- |
| Police, couleurs, taille du titre, ombre | Monde | Signika, `#f2e6c9` / `#c9b98f`, 72 px, douce |
| Durées et opacité de la carte plein écran | Monde | 1,5 s / 5 s / 1,5 s, 0,92 |
| Cartes de titre automatiques par scène | Monde | Activé |
| Cartes de combat automatiques et leurs phrases | Monde | Désactivé |
| Son d'intro et volume | Chaque joueur | Son actif, volume 0,8 |
| Afficher les cartes de scène, de combat, côté MJ | Chaque utilisateur | Activé |

Le détail de chaque réglage, de la fenêtre et du comportement est dans [la documentation détaillée](docs/DETAILS.fr.md). L'API pour vos macros est dans [docs/API.fr.md](docs/API.fr.md).

## Dépannage

<details>
<summary>Un joueur ne voit rien</summary>

Vérifiez l'onglet **Diffusion** (il est peut-être décoché), que le joueur est connecté au moment du clic et que vous êtes connecté avec un compte de rôle MJ (un compte « assistant » n'est pas considéré comme MJ).

</details>

<details>
<summary>Pas de son chez un joueur</summary>

Les navigateurs bloquent l'audio tant que la page n'a reçu aucun clic. Le joueur doit avoir cliqué une fois dans la page, vérifier que « Désactiver le son d'intro » est décoché et que son volume d'interface n'est pas à zéro.

</details>

<details>
<summary>L'image ne s'affiche pas</summary>

Le chemin doit être local, relatif à la racine de Foundry (par exemple `assets/map.webp`), sans `..`, avec une extension d'image. Les vidéos ne sont pas acceptées. Le bandeau n'utilise pas d'image.

</details>

<details>
<summary>La carte automatique ne s'affiche pas</summary>

Vérifiez que « Activer » est coché dans le bloc de la scène, que le réglage monde « Cartes de titre automatiques par scène » est actif, et que la scène est active si vous testez en tant que MJ. La console du navigateur (F12) indique la raison pour les cartes de combat, lignes commençant par `session-title-card |`.

</details>

<details>
<summary>Le module ou l'outil n'apparaît pas</summary>

Vérifiez que `module.json` est directement dans `Data/modules/session-title-card` et que le module est activé. L'outil n'est visible que par le MJ, dans le groupe des jetons.

</details>

## Compatibilité et licence

Foundry VTT v13 minimum, v14 vérifiée. Indépendant du système de jeu. Limite connue : la carte par scène se déclenche quand la vue du joueur change de scène, donc la téléportation de token n'est couverte que si elle change cette vue.

[Signaler un problème](https://github.com/MrAlex34374/Session-Title-Card/issues) · [Journal des modifications](CHANGELOG.md) · [Licence MIT](LICENSE)
