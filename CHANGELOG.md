# Changelog

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## [1.3.0] - 2026-10-13

### Ajouté
- Carte de titre automatique par scène : un bloc dans la configuration de la scène (flag `autoCard`) décrit la carte (type d'affichage, durée Court/Normal/Long, titre, sous-titre, texte d'ambiance, image, son).
- Elle s'affiche localement chez chaque joueur qui arrive sur la scène (activation, changement de scène, téléportation de token), sans passer par le socket.
- Le MJ ne la voit que si la scène est active et si le réglage client « Cartes de titre automatiques côté MJ » est coché.
- Option par scène « Une seule fois » : la carte n'est pas rejouée jusqu'au prochain numéro de session.
- Les joueurs peuvent passer une carte automatique après 1,5 s (bouton, Échap ou clic). Une carte envoyée à la main par le MJ reste prioritaire.
- Icône de clap dans le répertoire des scènes pour celles qui ont une carte.
- Cartes de combat : bandeau au début et à la fin de chaque combat, phrases tirées au hasard dans des listes modifiables. Désactivées par défaut (réglage monde).
- Interrupteur général monde « Cartes de titre automatiques par scène ».
- Réglages client pour couper, chez soi, les cartes de scène et les cartes de combat.

### Modifié
- Les avertissements de carte invalide ne s'affichent plus qu'au MJ.
- Bandeau : tailles minimales du sous-titre (16 px) et du texte d'ambiance (14 px).

## [1.2.2] - 2026-10-12

### Modifié
- Release régénérée : l'archive de 1.2.1 contenait encore des chemins propres au serveur de développement.

## [1.2.1] - 2026-10-12

### Ajouté
- Installation par Manifest URL (`manifest`, `download`, `url`, `bugs` dans `module.json`).
- Publication automatique d'une release (GitHub Actions) à chaque tag `vX.Y.Z`.

### Modifié
- Auteur et titulaire de la licence : MrAlex34374.

## [1.2.0] - 2026-10-12

### Ajouté
- Mode « Lancer vite » : titre, sous-titre, numéro de session, plein écran ou bandeau, durée Court/Normal/Long.
- Aperçu miniature en direct et badge de contraste (WCAG) dans la fenêtre de configuration.
- Fermeture de la carte au clavier (Échap), sauf pendant la saisie dans un champ.

### Modifié
- Durées avancées affichées en secondes (stockage et presets toujours en millisecondes).
- Bouton de fermeture plus visible (opacité 0,8, cible d'au moins 44 px, focus visible).
- Palette ocre/crème sur noir chaud et titres en Modesto Condensed, cohérents avec la Gazette.
- Annonce lecteur d'écran déplacée vers une région dédiée.
- Auteur harmonisé, licence MIT.

### Sécurité
- Seule l'identité de l'émetteur fournie par le serveur est acceptée ; plus de repli sur le contenu du message.

## [1.1.0]
- Version initiale versionnée dans git.
