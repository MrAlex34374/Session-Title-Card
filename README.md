# Session Title Card (vyrmhal-title-card)

Module Foundry VTT qui affiche une carte de titre cinématique au centre de l'écran de tous les joueurs connectés, déclenchée par le MJ juste avant le début d'une session. Le style par défaut vise une fantasy sérieuse et sobre : fond noir, titre en capitales espacées couleur crème, sous-titre ocre, ombre douce.

Le module est générique : rien n'est lié à une campagne en particulier. Il n'a aucune dépendance externe, aucun build, et ne fait aucun appel réseau (seuls l'image et le son choisis sont chargés depuis votre propre serveur Foundry).

## Compatibilité

- Foundry VTT 13 minimum, vérifié pour la 14 (lecture du code source de la 14.365 et de la 14.366).
- Indépendant du système de jeu (D&D 5e ou autre).
- Interface en français et en anglais, selon la langue choisie dans Foundry.

## Installation

Installation manuelle, par copie du dossier :

1. Copiez le dossier `vyrmhal-title-card` dans le dossier `Data/modules` de votre installation Foundry.
2. Vérifiez que le fichier `module.json` se trouve directement dans ce dossier (et non dans un sous-dossier supplémentaire).
3. Redémarrez Foundry ou rechargez la liste des modules (retour à la page d'accueil, puis relance du monde).
4. Dans le monde, ouvrez `Paramètres > Gérer les modules`, cochez **Session Title Card** et validez. Le monde se recharge.

Au premier lancement en tant que MJ, une macro **Carte de titre** est créée automatiquement dans le répertoire des macros (voir plus bas).

## Utilisation

### Ouvrir la fenêtre de configuration (MJ uniquement)

Trois façons de l'ouvrir :

- l'outil **Carte de titre** (icône de clap) dans la barre de contrôles de scène, dans le groupe des contrôles de jetons, visible uniquement par le MJ ;
- la macro **Carte de titre**, créée automatiquement ;
- une macro personnalisée : `game.modules.get("vyrmhal-title-card").api.openConfig();`

### Champs de la fenêtre

- **Type d'affichage** : carte plein écran ou bandeau (voir plus bas).
- **Titre** : texte principal. `{{n}}` y est remplacé par le numéro de session si le compteur est activé.
- **Sous-titre** : optionnel.
- **Texte d'ambiance** : optionnel, petit et en italique (date, lieu...).
- **Image de fond** : optionnelle, choisie avec le sélecteur de fichiers.
- **Son d'intro** et **volume** : optionnels.
- **Fondu d'entrée, durée d'affichage, fondu de sortie** : en millisecondes, par défaut 1500, 5000 et 1500.
- **Opacité du fond noir** : de 0 à 1, par défaut 0,92.
- **Compteur de session** : voir plus bas.
- **Diffusion** : choix des destinataires (voir plus bas).
- **Presets** : charger, enregistrer, supprimer.

La fenêtre est organisée en onglets : Textes, Image et son, Durées et fond, Diffusion, Presets. Les boutons du bas restent visibles quel que soit l'onglet.

Les valeurs saisies sont mémorisées dans votre navigateur et restaurées à la prochaine ouverture.

### Boutons

- **Afficher à tous** : diffuse la carte à tous les clients connectés, MJ compris.
- **Aperçu (moi seul)** : affiche la carte uniquement chez vous, sans toucher au compteur de session.
- **Fermer la carte** : ferme la carte chez tout le monde.

### Bandeau (mode "banner")

Pour annoncer un lieu ou une date en cours de partie sans couper le jeu, choisissez **Bandeau (bas de l'écran)** :

- le texte s'affiche en bas de l'écran, sur un dégradé sombre, plus petit que la carte plein écran ;
- il ne bloque aucun clic et n'utilise pas d'image de fond ;
- les durées par défaut sont plus courtes (1000, 3500 et 1000 ms) et le voile est plus léger (0,75) ; ces valeurs ne sont pas dans les réglages du module ;
- changer le type dans la fenêtre remplace automatiquement les durées qui n'ont pas été modifiées à la main ;
- **Échap ne le ferme pas** (il garde son rôle habituel dans Foundry) : le MJ utilise le petit bouton en bas à droite ;
- le son et le compteur fonctionnent comme pour la carte plein écran.

### Préchargement

Le bouton **Précharger chez les joueurs** (onglet Image et son) fait charger l'image et le son dans le navigateur des joueurs, pour que la carte s'affiche sans retard ni apparition tardive de l'image. À faire quelques secondes avant d'afficher, surtout avec une grande image. Les joueurs qui ont désactivé le son ne chargent pas le fichier audio. Équivalent en macro : `api.preload({image, sound})`.

### Choisir les destinataires

L'onglet **Diffusion** liste les autres utilisateurs du monde, connectés ou non. Décochez ceux qui ne doivent pas recevoir la carte (par exemple pour une carte réservée à un joueur). Le choix s'applique à **Afficher à tous** et au préchargement, il est conservé tant que la page n'est pas rechargée, et la liste suit les connexions chaque fois que l'onglet est ouvert. Si tous les utilisateurs connectés sont cochés, la carte est diffusée normalement. Une alerte indique le nombre d'utilisateurs ciblés quand le choix est restreint. La fermeture ("Fermer la carte") s'adresse toujours à tout le monde.

L'aperçu (moi seul) reste le moyen de voir la carte avant de l'envoyer.

### Fermer la carte

Le MJ peut fermer la carte pour tout le monde à tout moment avec la touche **Échap** ou avec le petit bouton discret en bas à droite de l'overlay. La fermeture se fait par un fondu court (800 ms maximum). Les joueurs n'ont ni bouton ni raccourci pour la fermer.

### Compteur de session

Cochez **Activer le compteur** pour que `{{n}}` soit remplacé par le numéro choisi dans le champ **Numéro à afficher**. À chaque clic sur **Afficher à tous**, le numéro affiché est enregistré comme dernier numéro de session, et le champ propose automatiquement le suivant. Vous pouvez corriger ce numéro à la main avant l'affichage. L'aperçu ne modifie jamais le compteur.

Si le texte contient `{{n}}` alors que le compteur est désactivé, le motif est affiché tel quel et une alerte vous le signale.

### Presets

Un preset enregistre le titre, le sous-titre, le texte d'ambiance, l'image, le son, le volume, les durées et l'opacité. Les presets sont stockés dans un réglage monde (donc partagés par tous les MJ du monde, invisibles pour les joueurs). Enregistrer sous un nom déjà utilisé demande confirmation avant de remplacer.

## Réglages

Réglages monde (modifiables par le MJ dans `Paramètres > Configurer les paramètres > Session Title Card`) :

- police (liste construite depuis `CONFIG.fontDefinitions`, par défaut Signika) ;
- couleur du titre (`#f2e6c9`), couleur du sous-titre (`#c9b98f`), taille du titre (72 px au maximum, réduite automatiquement sur petit écran) ;
- ombre portée : aucune, douce, marquée ;
- durées par défaut et opacité par défaut du fond.

Réglages client (propres à chaque navigateur, donc à chaque joueur) :

- **Désactiver le son d'intro** ;
- **Volume du son d'intro** : multiplie le volume choisi par le MJ.

Le style (police, couleurs, taille, ombre) est lu sur chaque client dans les réglages du monde. Il n'est pas transmis dans le message socket.

## API publique et exemples de macro

```js
const api = game.modules.get("vyrmhal-title-card").api;
```

Méthodes (réservées au MJ, un joueur qui les appelle reçoit un avertissement) :

- `api.show(options)` : affiche la carte à tous. Retourne une promesse qui vaut `true` si une carte a été affichée.
- `api.preview(options)` : même chose, mais chez le MJ uniquement.
- `api.preload(options)` : précharge `image` et `sound` chez les joueurs (`recipients` accepté). Retourne `true` si au moins un fichier valide a été trouvé.
- `api.close()` : ferme la carte pour tout le monde.
- `api.openConfig()` : ouvre la fenêtre de configuration.

Options de `show` et `preview` (toutes optionnelles, mais au moins un texte est nécessaire) :

| Option | Rôle |
| --- | --- |
| `title`, `subtitle`, `tagline` | Textes (200, 300 et 300 caractères maximum) |
| `image` | Chemin local d'une image de fond |
| `sound` | Chemin local d'un fichier audio |
| `volume` | Volume du son, de 0 à 1 (0,8 par défaut) |
| `fadeIn`, `hold`, `fadeOut` | Durées en ms (valeurs par défaut des réglages si absentes) |
| `opacity` | Opacité du fond noir, de 0 à 1 |
| `mode` | `"full"` (par défaut) ou `"banner"` |
| `recipients` | Tableau d'identifiants d'utilisateurs ciblés. Absent : tous les utilisateurs connectés. Tableau vide : personne d'autre que le MJ |
| `n` | Numéro de session qui remplace `{{n}}` |
| `incrementCounter` | `true` pour utiliser le numéro suivant et l'enregistrer (ignoré par `preview`) |

`{{n}}` n'est remplacé que si `n` ou `incrementCounter` est fourni.

Exemple minimal :

```js
game.modules.get("vyrmhal-title-card").api.show({
  title: "Vyrmhal",
  subtitle: "Chapitre premier",
  tagline: "Le 14 du mois des moissons, Port-Aubier"
});
```

Exemple complet, avec image, son et durées :

```js
game.modules.get("vyrmhal-title-card").api.show({
  title: "Session 12",
  subtitle: "Les cendres de Vyrmhal",
  tagline: "Trois jours après la chute du pont",
  image: "assets/cartes/vyrmhal-nuit.webp",
  sound: "sounds/intro/cor-lointain.ogg",
  volume: 0.7,
  fadeIn: 2000,
  hold: 6000,
  fadeOut: 2000,
  opacity: 0.9
});
```

Exemple avec compteur automatique (le numéro suivant est utilisé puis enregistré) :

```js
game.modules.get("vyrmhal-title-card").api.show({
  title: "Session {{n}}",
  subtitle: "Les cendres de Vyrmhal",
  incrementCounter: true
});
```

Bandeau de changement de lieu, réservé à deux joueurs :

```js
const api = game.modules.get("vyrmhal-title-card").api;
const joueurs = game.users.filter(u => !u.isGM && ["Alice", "Bruno"].includes(u.name)).map(u => u.id);
api.show({mode: "banner", title: "Port-Aubier", tagline: "14 Solvin 4721", recipients: joueurs});
```

Précharger puis afficher :

```js
const api = game.modules.get("vyrmhal-title-card").api;
api.preload({image: "assets/cartes/vyrmhal-nuit.webp", sound: "sounds/intro/cor-lointain.ogg"});
await new Promise(r => setTimeout(r, 4000));
api.show({title: "Session 12", image: "assets/cartes/vyrmhal-nuit.webp", sound: "sounds/intro/cor-lointain.ogg"});
```

Fermer la carte depuis une macro :

```js
game.modules.get("vyrmhal-title-card").api.close();
```

## Comportement détaillé

- **Chronologie** : le fond noir apparaît en fondu, puis le titre, puis le sous-titre et le texte d'ambiance avec un léger décalage (30 % du fondu d'entrée, 600 ms au maximum). La durée d'affichage commence quand le dernier texte est entièrement visible, puis le fondu de sortie démarre. La durée totale est donc `fondu d'entrée + décalages + durée d'affichage + fondu de sortie`.
- **Carte déjà affichée** : une nouvelle carte remplace l'ancienne sans empilement. Le voile noir reste continu pour éviter un flash du jeu, et tous les timers et sons de l'ancienne carte sont libérés.
- **Joueur qui se connecte pendant l'affichage** : il ne voit rien, c'est voulu.
- **Clics** : l'overlay bloque les clics pendant l'affichage. Dès que le fondu de sortie commence, il ne bloque plus rien, et il est retiré du DOM à la fin.
- **Image de fond** : elle est dessinée par dessus le voile noir, avec une opacité de 55 % et une vignette qui garde le texte lisible. L'opacité du fond noir règle donc la part de jeu visible derrière la carte. L'opacité de l'image peut être changée avec une règle CSS sur `--vtc-image-opacity`, par exemple via un module de CSS personnalisé.
- **Mouvement réduit** : si le navigateur du joueur demande `prefers-reduced-motion`, il n'y a plus de décalage ni de déplacement, seulement des fondus de 400 ms au maximum.
- **Petits écrans et multi-écrans** : l'overlay couvre la fenêtre du navigateur (et non un écran précis), les tailles de texte se réduisent selon la largeur et la hauteur, et les marges respectent les zones sûres des appareils mobiles. Si Foundry est étendu sur plusieurs écrans, la carte est centrée sur la fenêtre entière.
- **Son** : joué sur le canal interface de Foundry, avec le volume choisi multiplié par le volume client. Il s'estompe pendant le fondu de sortie et s'arrête si la carte est fermée ou remplacée.

## Sécurité

- Le serveur Foundry relaie les sockets de module et ajoute aux récepteurs l'identifiant de l'utilisateur qui a émis le message, d'après sa session. Chaque client utilise cet identifiant, qui ne peut pas être falsifié, et ignore tout message dont l'émetteur n'est pas un MJ connecté. Cette information a été vérifiée dans le code de la version 14. Si une version plus ancienne ne la fournit pas, le module se rabat sur l'identifiant écrit dans le message, qui pourrait alors être usurpé.
- Dans tous les cas, le contenu reçu est assaini : textes tronqués et insérés avec `textContent` (jamais `innerHTML`), nombres bornés, chemins limités aux fichiers locaux d'image et d'audio (pas d'URL externe, pas de `..`). Les demandes de préchargement suivent les mêmes règles.
- La restriction des destinataires est appliquée par le serveur : les utilisateurs non ciblés ne reçoivent pas le message.
- Les chemins invalides sont ignorés avec une alerte discrète au MJ, sans casser l'affichage de la carte.

## Choix faits sans vous demander

- Le groupe de contrôles choisi pour l'outil est celui des jetons, présent dans toutes les scènes.
- La macro automatique n'est créée qu'une fois : si vous la supprimez ensuite, elle n'est pas recréée (un réglage monde mémorise qu'elle a été traitée). Elle est aussi ignorée si une macro porte déjà le même nom.
- L'image de fond accepte les formats d'image reconnus par Foundry, pas les vidéos.
- Les presets enregistrent aussi le texte d'ambiance, le volume et l'opacité, en plus de ce qui était demandé.
- Le bandeau n'accepte pas d'image de fond et a ses propres valeurs par défaut, fixes.
- Le préchargement n'est pas automatique : il se déclenche par le bouton ou par `api.preload`.
- La police se règle dans les paramètres du module, pas dans la fenêtre de configuration, car le style est commun à toutes les cartes.

## Dépannage

- **Le module n'apparaît pas dans la liste** : vérifiez que `module.json` est directement dans `Data/modules/vyrmhal-title-card`, puis rechargez la liste des modules.
- **L'outil n'apparaît pas dans la barre de contrôles** : il est visible uniquement pour le MJ, dans le groupe des jetons. Vérifiez que le module est activé dans le monde.
- **Un joueur ne voit rien** : vérifiez d'abord l'onglet Diffusion (il est peut-être décoché). Ensuite : il doit être connecté au moment où le MJ clique. Vérifiez aussi que le MJ est bien connecté avec un compte de rôle MJ (un compte "assistant" n'est pas considéré comme MJ).
- **Pas de son chez un joueur** : les navigateurs bloquent l'audio tant que la page n'a reçu aucun clic ou touche. Le joueur doit avoir interagi une fois avec la page (le message Foundry de déverrouillage audio peut apparaître). Il doit aussi vérifier que la case "Désactiver le son d'intro" est décochée et que son volume d'interface Foundry n'est pas à zéro.
- **L'image ne s'affiche pas** : l'alerte du MJ donne la cause probable. Le chemin doit être local, relatif à la racine de Foundry (par exemple `assets/carte.webp`), sans `..` et avec une extension d'image valide.
- **La police n'apparaît pas** : la police doit être enregistrée dans Foundry (`CONFIG.fontDefinitions` ou les polices personnalisées du jeu). Sinon Signika est utilisée.
- **La carte reste à l'écran** : le MJ peut appuyer sur Échap ou utiliser le bouton de fermeture. Si le MJ s'est déconnecté pendant l'affichage, la carte se retire d'elle-même à la fin de la durée prévue.
- **Messages d'erreur** : ouvrez la console du navigateur (F12) et cherchez les lignes commençant par `vyrmhal-title-card |`.
