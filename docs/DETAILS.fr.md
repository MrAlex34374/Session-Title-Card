<!-- Synchronisé avec DETAILS.md à la version 1.3.1 -->
[English](DETAILS.md) | Français

# Documentation détaillée

[Retour au README](../README.fr.md) · [API et macros](API.fr.md)

## Sommaire

- [La fenêtre de configuration](#la-fenêtre-de-configuration)
- [Bandeau](#bandeau)
- [Préchargement, destinataires, fermeture](#préchargement-destinataires-fermeture)
- [Compteur de session et presets](#compteur-de-session-et-presets)
- [Carte de titre automatique par scène](#carte-de-titre-automatique-par-scène)
- [Cartes de combat](#cartes-de-combat)
- [Réglages](#réglages)
- [Comportement détaillé](#comportement-détaillé)
- [Sécurité](#sécurité)
- [Choix de conception](#choix-de-conception)

## La fenêtre de configuration

Réservée au MJ. Trois accès : l'outil **Carte de titre** (icône de clap) dans le groupe des contrôles de jetons, la macro **Carte de titre** créée automatiquement au premier lancement, ou `game.modules.get("session-title-card").api.openConfig()`.

| Champ | Rôle |
| --- | --- |
| Type d'affichage | *Carte plein écran* ou *Bandeau (bas de l'écran)*. |
| Titre | Texte principal. `{{n}}` y est remplacé par le numéro de session si le compteur est utilisé. |
| Sous-titre | Optionnel. |
| Texte d'ambiance | Optionnel, petit et en italique (une date, un lieu). |
| Image de fond | Optionnelle, choisie avec le sélecteur de fichiers. |
| Son d'intro et volume | Optionnels. |
| Fondu d'entrée, durée d'affichage, fondu de sortie | En secondes dans les options avancées (1,5, 5 et 1,5 par défaut). Les presets et l'API restent en millisecondes. |
| Opacité du fond noir | De 0 à 1, 0,92 par défaut. |
| Diffusion | Choix des destinataires. |
| Presets | Charger, enregistrer, supprimer. |

La fenêtre s'ouvre sur la vue **Lancer vite** : titre, sous-titre, n° de session, type d'affichage, durée Court (x0,5), Normal ou Long (x2), aperçu miniature en direct avec un badge de contraste WCAG (OK à partir de 4,5:1, calculé contre le pire fond possible sous le voile noir), puis les boutons. **Options avancées** déploie les onglets : Textes, Image et son, Durées et fond, Diffusion, Presets. Les valeurs saisies sont mémorisées dans votre navigateur.

Boutons : **Afficher à tous** (tous les clients connectés, MJ compris), **Aperçu (moi seul)** (chez vous, sans toucher au compteur), **Fermer la carte** (chez tout le monde).

## Bandeau

- Texte en bas de l'écran, sur un dégradé sombre, plus petit que la carte plein écran.
- Ne bloque aucun clic, n'utilise pas d'image de fond.
- Durées par défaut plus courtes (1000, 3500 et 1000 ms) et voile plus léger (0,75). Ces valeurs ne sont pas dans les réglages.
- Changer le type dans la fenêtre remplace les durées qui n'ont pas été modifiées à la main.
- **Échap ne le ferme pas** (il garde son rôle dans Foundry) : le MJ utilise le petit bouton en bas à droite, ou Échap quand ce bouton a le focus.
- Le son et le compteur fonctionnent comme pour la carte plein écran.

## Préchargement, destinataires, fermeture

**Préchargement.** Le bouton **Précharger chez les joueurs** (onglet Image et son) charge l'image et le son dans le navigateur des joueurs, pour que la carte s'affiche sans retard. À faire quelques secondes avant d'afficher, surtout avec une grande image. Les joueurs qui ont désactivé le son ne chargent pas l'audio. En macro : `api.preload({image, sound})`.

**Destinataires.** L'onglet **Diffusion** liste les autres utilisateurs du monde, connectés ou non. Décochez ceux qui ne doivent pas recevoir la carte. Le choix s'applique à **Afficher à tous** et au préchargement, et il est conservé tant que la page n'est pas rechargée. Une alerte indique le nombre d'utilisateurs ciblés quand le choix est restreint. La fermeture s'adresse toujours à tout le monde.

**Fermeture.** Le MJ ferme la carte pour tout le monde avec **Échap** (carte plein écran, sans effet pendant la saisie dans un champ) ou avec le bouton en bas à droite (44 px minimum, anneau de focus visible). La fermeture se fait par un fondu de 800 ms au maximum. Pour les cartes envoyées à la main, les joueurs n'ont ni bouton ni raccourci.

## Compteur de session et presets

**Compteur.** Cochez **Utiliser le n° de session** pour que `{{n}}` soit remplacé par le numéro du champ **N° de session**. À chaque **Afficher à tous**, ce numéro est enregistré comme dernier numéro de session et le champ propose le suivant. Vous pouvez le corriger avant l'affichage. L'aperçu ne modifie jamais le compteur. Si le texte contient `{{n}}` alors que le compteur est désactivé, le motif est affiché tel quel et une alerte vous le signale.

**Presets.** Un preset enregistre le titre, le sous-titre, le texte d'ambiance, l'image, le son, le volume, les durées et l'opacité. Ils sont stockés dans un réglage monde (partagés par les MJ du monde, invisibles pour les joueurs). Enregistrer sous un nom déjà utilisé demande confirmation.

## Carte de titre automatique par scène

Dans la configuration d'une scène (onglet de base), le bloc **Carte de titre automatique** contient : Activer, titre (le nom de la scène si vide), sous-titre, texte d'ambiance, type d'affichage (bandeau par défaut), durée Court, Normal ou Long, image (plein écran seulement), son, **Une seule fois** et un bouton d'aperçu. Les données sont dans le flag `flags.session-title-card.autoCard` de la scène. Les scènes qui ont une carte portent une icône de clap dans le répertoire des scènes.

| Règle | Détail |
| --- | --- |
| Déclencheurs | Le canevas du joueur charge la scène : activation par le MJ, changement de scène, téléportation de token si elle change la scène vue par le joueur. |
| Répétition | Pas de rejeu au rechargement de page ni au redessin de la même scène. Rejouée si le joueur revient après une autre scène, sauf avec **Une seule fois** (jusqu'au prochain numéro de session). |
| Numéro de session | Il n'avance que si vous lancez une carte avec le compteur activé. Sans cela, « une seule fois » vaut pour toujours. |
| MJ | Voit la carte seulement si la scène est active et si « Cartes de titre automatiques côté MJ » est coché. |
| Joueurs | Peuvent la passer après 1,5 s (bouton, Échap ou clic en plein écran) et la couper avec « Afficher les cartes de titre de scène ». |
| Priorité | Une carte envoyée à la main reste affichée. Une carte automatique est remplacée par la suivante. |
| Durées | Court, Normal et Long multiplient par 0,5, 1 ou 2 les durées par défaut du type. Plafonds : affichage 15 s, fondus 3 s. Opacité et volume : valeurs par défaut du module. Un plein écran apparaît en fondu depuis le noir. |
| `{{n}}` | Remplacé par le dernier numéro de session enregistré, sans l'incrémenter. Retiré tant que le compteur vaut 0. L'aperçu applique la même règle. |
| Secrets | Le flag est lisible par les joueurs (console du navigateur). Rien de secret dans le bloc. |
| Interrupteur général | Réglage monde « Cartes de titre automatiques par scène ». |

## Cartes de combat

Un bandeau s'affiche chez tous les joueurs au début et à la fin de chaque combat de la scène qu'ils regardent. Le début est détecté avec le hook `updateCombat` : `combatStart` n'est reçu que par le MJ, il ne conviendrait pas. La fin utilise `deleteCombat` et ne s'annonce que si le début l'a été. Un joueur qui se connecte en plein combat ne voit pas de bandeau de début.

La phrase est tirée au hasard dans les listes **Textes de début de combat** et **Textes de fin de combat** (séparateur `|`). Liste vide : pas de bandeau pour ce moment. Désactivé par défaut : activez « Cartes de combat automatiques » (réglage monde) après avoir prévenu vos joueurs. Chacun, MJ compris, peut les couper avec « Afficher les cartes de combat ». Une carte envoyée à la main reste prioritaire.

## Réglages

Dans **Paramètres, Configurer les paramètres, Session Title Card**.

| Réglage | Portée | Par défaut |
| --- | --- | --- |
| Police (liste de `CONFIG.fontDefinitions`) | Monde | Signika |
| Couleur du titre, du sous-titre | Monde | `#f2e6c9`, `#c9b98f` |
| Taille du titre | Monde | 72 px (de 24 à 240), réduite automatiquement sur petit écran |
| Ombre portée | Monde | Douce (aucune, douce, marquée) |
| Fondu d'entrée, durée d'affichage, fondu de sortie | Monde | 1,5 s, 5 s, 1,5 s |
| Opacité du fond | Monde | 0,92 |
| Cartes de titre automatiques par scène | Monde | Activé |
| Cartes de combat automatiques | Monde | Désactivé |
| Textes de début et de fin de combat | Monde | Trois phrases chacun |
| Désactiver le son d'intro | Client | Non |
| Volume du son d'intro | Client | 0,8 (multiplie le volume du MJ) |
| Afficher les cartes de titre de scène | Client | Oui |
| Afficher les cartes de combat | Client | Oui |
| Cartes de titre automatiques côté MJ | Client | Oui |

Le style (police, couleurs, taille, ombre) est lu sur chaque client dans les réglages du monde. Il n'est pas transmis dans le message socket.

## Comportement détaillé

- **Chronologie** : le fond noir apparaît en fondu, puis le titre, puis le sous-titre et le texte d'ambiance avec un léger décalage (30 % du fondu d'entrée, 600 ms au maximum). La durée d'affichage commence quand le dernier texte est entièrement visible. Durée totale : fondu d'entrée + décalages + durée d'affichage + fondu de sortie.
- **Carte déjà affichée** : la nouvelle remplace l'ancienne sans empilement. Le voile noir reste continu pour éviter un flash, et timers et sons de l'ancienne sont libérés.
- **Connexion pendant l'affichage** : le joueur ne voit rien, c'est voulu.
- **Clics** : l'overlay bloque les clics pendant l'affichage, sauf pour un bandeau. Il ne bloque plus rien dès que le fondu de sortie commence.
- **Image de fond** : dessinée par-dessus le voile noir (opacité de 55 %, vignette pour garder le texte lisible). Pour changer l'opacité de l'image, une règle CSS sur `--vtc-image-opacity` suffit.
- **Mouvement réduit** : avec `prefers-reduced-motion`, pas de décalage ni de déplacement, seulement des fondus de 400 ms au maximum.
- **Petits écrans et multi-écrans** : l'overlay couvre la fenêtre du navigateur, les textes se réduisent selon la taille, les marges respectent les zones sûres des appareils mobiles.
- **Son** : joué sur le canal interface de Foundry, volume choisi multiplié par le volume client, estompé pendant le fondu de sortie.

## Sécurité

- Le serveur Foundry relaie les sockets de module et ajoute l'identifiant de l'utilisateur qui a émis le message, d'après sa session. Chaque client utilise cet identifiant, qui ne peut pas être falsifié, et ignore tout message dont l'émetteur n'est pas un MJ connecté. Vérifié dans le code de la version 14. L'identifiant écrit dans le message est ignoré : si le serveur ne fournit pas l'émetteur, le message est rejeté.
- Le contenu reçu est assaini : textes tronqués et insérés avec `textContent` (jamais `innerHTML`), nombres bornés, chemins limités aux fichiers locaux d'image et d'audio (pas d'URL externe, pas de `..`). Les cartes automatiques lues dans un flag de scène suivent les mêmes règles.
- La restriction des destinataires est appliquée par le serveur.
- Les chemins invalides sont ignorés avec une alerte discrète au MJ, sans casser l'affichage.

## Choix de conception

- L'outil est dans le groupe des contrôles de jetons, présent dans toutes les scènes.
- La macro automatique n'est créée qu'une fois : supprimée, elle n'est pas recréée. Elle est aussi ignorée si une macro porte déjà le même nom.
- L'image de fond accepte les formats d'image de Foundry, pas les vidéos.
- Le bandeau n'accepte pas d'image et a ses propres valeurs par défaut.
- Le préchargement n'est pas automatique : bouton ou `api.preload`.
- La police se règle dans les paramètres du module, car le style est commun à toutes les cartes.
