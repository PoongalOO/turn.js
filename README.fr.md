# turn.js 3e release, fork local de maintenance

turn.js est un plugin jQuery qui affiche des pages HTML sous forme de livre ou de magazine avec une transition de page tournée.

Ce dépôt contient une copie locale maintenue de la 3e release originale de `turn.js`. Le travail actuel vise à rendre la librairie plus facile à tester et plus sûre avec les versions modernes de jQuery, tout en conservant la forme de l'API historique.

Version anglaise : [readme.md](readme.md)

## Etat actuel

Ce fork a été testé avec jQuery `4.0.0` dans la démo minimale et il est couvert par des tests unitaires et visuels automatisés. Le coeur du plugin peut s'initialiser, naviguer, redimensionner, ajouter/supprimer des pages et se détruire correctement dans les tests sur navigateur moderne.

La compatibilité avec tous les navigateurs et appareils modernes n'est pas encore garantie. Safari/WebKit, iOS, Android tactile, l'accessibilité et les régressions visuelles en contexte produit restent à valider spécifiquement.

## Modifications réalisées

- Migration des enregistrements d'événements internes depuis les anciens patterns jQuery `.bind()` / `.unbind()` vers `.on()` / `.off()`.
- Modernisation des événements d'entrée pour privilégier Pointer Events quand ils sont disponibles, tout en conservant les chemins touch et souris en fallback.
- Ajout de namespaces d'événements :
  - `.turn` pour les événements du livre et du document ;
  - `.turnFlip` pour les événements internes des pages pliées.
- Ajout d'une méthode publique `destroy` :
  - stoppe les animations ;
  - détache les handlers d'événements de turn.js ;
  - supprime les wrappers turn et flip ;
  - restaure les pages originales comme enfants directs ;
  - restaure les attributs `style` et `class` d'origine ;
  - supprime les données jQuery internes de turn.js sans effacer les données utilisateur sans lien.
- Remplacement de la boucle d'animation interne `setInterval` par `requestAnimationFrame`.
- Correction de `animatef(false)` pour que l'annulation d'une animation annule bien la frame planifiée.
- Modernisation des sorties CSS :
  - les gradients utilisent maintenant la syntaxe standard `linear-gradient(...deg, ...)` ;
  - les gradients de pli conservent des stops normalisés entre `0` et `100%` avec des ombres plus douces, sans highlight blanc ;
  - les transforms écrivent maintenant les propriétés standard `transform` et `transform-origin`, avec fallback préfixé quand il est détecté.
- Déplacement des styles statiques des wrappers vers `turn.css` et des classes internes, en conservant inline les valeurs dynamiques de taille, position, z-index, transform et gradient.
- Ajout d'une démo navigateur minimale avec jQuery `4.0.0`.
- Ajout de texte et d'images locales dans la démo minimale.
- Correction de la mise en page de la démo minimale afin que les dimensions mesurées par turn.js correspondent à la taille réellement rendue des pages.
- Ajout de tests unitaires avec Vitest et JSDOM.
- Ajout de tests visuels Playwright et de snapshots de référence pour la démo minimale.
- Ajout des scripts npm et de la configuration projet pour les tests automatisés.
- Régénération de `turn.min.js` à partir de la source mise à jour.

## Démo

Ouvrir la démo minimale directement dans un navigateur :

```bash
xdg-open demos/minimal/index.html
```

La démo charge :

- jQuery `4.0.0` depuis le CDN jQuery ;
- `../../turn.css` ;
- `../../turn.js` ;
- des images locales depuis `demos/minimal/assets`.

Elle contient un livre de six pages avec boutons précédent/suivant, navigation clavier, texte et images.

## Installation pour le développement

Installer les dépendances :

```bash
npm install
```

Les dépendances de développement incluent :

- `jquery` `4.0.0` ;
- `vitest` ;
- `jsdom` ;
- `@playwright/test`.

## Utilisation

HTML minimal :

```html
<div id="magazine">
  <div>Page 1</div>
  <div>Page 2</div>
  <div>Page 3</div>
  <div>Page 4</div>
</div>
```

CSS minimal :

```css
#magazine {
  width: 800px;
  height: 400px;
}

#magazine .turn-page {
  background: #f4f4f4;
}
```

JavaScript minimal :

```html
<link rel="stylesheet" href="turn.css">
<script src="https://code.jquery.com/jquery-4.0.0.min.js"></script>
<script src="turn.js"></script>
<script>
  $('#magazine').turn({
    width: 800,
    height: 400,
    gradients: true,
    acceleration: true
  });
</script>
```

`turn.css` contient les styles statiques des wrappers internes de turn.js. `turn.js` injecte aussi ces règles de base en fallback pour les pages existantes qui ne chargent que le script, mais charger explicitement la feuille de style est recommandé.

Détruire une instance :

```javascript
$('#magazine').turn('destroy');
```

Après `destroy`, les pages originales sont restaurées comme enfants directs de `#magazine`, les wrappers turn.js sont supprimés et l'élément peut être initialisé à nouveau.

## Notes d'API

API publique supportée de turn :

- `init` / `$('#magazine').turn(options)`
- `page`
- `next`
- `previous`
- `addPage`
- `removePage`
- `pages`
- `size`
- `display`
- `disable`
- `destroy`

Les méthodes dont le nom commence par `_` sont des détails d'implémentation privés. D'autres helpers historiques peuvent encore exister pour compatibilité interne, mais ils ne sont pas documentés comme API supportée.

La nouvelle méthode `destroy` sert au démontage dans les applications monopages, les tests, les transitions de vue et tous les cas où un livre doit être supprimé ou réinitialisé sans laisser de wrappers DOM ni de handlers sur le document.

## Tests

Lancer toute la suite :

```bash
npm test
```

Lancer seulement les tests unitaires :

```bash
npm run test:unit
```

Lancer seulement les tests visuels Playwright :

```bash
npm run test:visual
```

Mettre à jour les snapshots Playwright après une modification visuelle volontaire :

```bash
npm run test:visual:update
```

La suite actuelle couvre :

- l'enregistrement des plugins ;
- l'état après initialisation ;
- la sélection de page initiale ;
- `addPage` / `removePage` dynamiques ;
- l'enregistrement des namespaces d'événements ;
- le nettoyage `destroy` et la réinitialisation ;
- la planification et l'annulation `requestAnimationFrame` dans `animatef` ;
- l'écriture des propriétés CSS standard pour les transforms ;
- les gradients de pli bornés et uniquement ombrés pendant l'animation ;
- le rendu de la démo minimale ;
- le rendu après page tournée ;
- la géométrie en viewport compact ;
- les mesures de page pendant l'animation.

## Prérequis

- Node.js pour le développement et les tests.
- jQuery `4.0.0` pour la démo maintenue et la configuration de test actuelle.
- Un navigateur pris en charge par Playwright pour les tests visuels.

Les anciennes versions de jQuery faisaient partie du spike de compatibilité, mais ce dépôt utilise désormais jQuery `4.0.0` comme cible moderne pour la démo et les tests automatisés.

## Compatibilité navigateur

Le README d'origine mentionnait Chrome 12, Safari 5, Firefox 10 et IE 9 pour la 3e release historique.

Cette copie maintenue cible les navigateurs modernes, mais la couverture automatisée actuelle se limite aux navigateurs configurés par Playwright et à l'environnement de test local. Safari/WebKit, les appareils mobiles tactiles et le comportement d'accessibilité doivent être considérés comme des validations encore ouvertes.

## Licence

Distribué sous la licence BSD non commerciale d'origine. Voir [license.txt](license.txt).

## Projet original

- Site original : [turnjs.com](http://www.turnjs.com/)
- Documentation originale : [référence wiki GitHub](https://github.com/blasten/turn.js/wiki/Reference)
