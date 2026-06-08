# Roadmap et strategie de maintenance

Ce depot maintient une copie locale de `turn.js` 3e release. L'objectif n'est pas de transformer brutalement la librairie, mais de la rendre progressivement plus fiable, testable et exploitable avec un jQuery moderne.

## Etat actuel

La base reste ancienne et tres DOM-imperative :

- l'API publique est un plugin jQuery historique ;
- l'etat interne est stocke dans `$.data()` sur le livre et sur les pages ;
- le rendu depend encore de wrappers DOM deplaces pendant l'animation ;
- une partie du rendu reste dynamique en styles inline, notamment dimensions, positions, `z-index`, transforms et gradients ;
- les tests automatises couvrent maintenant les chemins principaux, mais pas encore tous les navigateurs et appareils reels.

Les derniers travaux ont stabilise plusieurs zones sans changer l'API publique : `destroy`, gestion des wrappers, geometrie testable, gradients modernes, reduction des styles inline, Pointer Events, validation mobile Chromium, et helpers internes de rendu.

## Options possibles

### 1. Maintenance legacy

Cette option consiste a conserver l'architecture actuelle et a ne corriger que les bugs critiques.

Avantages :

- risque faible de regression immediate ;
- cout court terme limite ;
- compatibilite maximale avec les integrateurs qui utilisent deja l'API historique.

Limites :

- la dette DOM/jQuery reste intacte ;
- les corrections deviennent de plus en plus couteuses ;
- le support mobile, Safari/WebKit et accessibilite restera fragile ;
- la librairie restera difficile a comprendre pour de nouveaux contributeurs.

Cette option est acceptable pour un depot archive ou tres peu modifie, mais elle n'est pas suffisante si la librairie doit continuer a evoluer.

### 2. Modernisation progressive

Cette option conserve l'API publique actuelle tout en isolant progressivement les zones internes : etat, geometrie, rendu, evenements, styles et tests.

Avantages :

- comportement public preserve ;
- chaque chantier peut etre teste et relu separement ;
- le code devient moins disperse sans rewrite massif ;
- la couverture automatisée peut accompagner chaque changement ;
- les demos existantes restent utiles comme filet visuel.

Limites :

- l'architecture restera partiellement imperative pendant longtemps ;
- jQuery restera une dependance centrale ;
- certaines abstractions internes devront cohabiter avec du code historique ;
- la progression demande de la discipline pour eviter les refactors trop larges.

C'est l'option recommandee pour ce depot.

### 3. Rewrite

Cette option consisterait a reecrire le moteur de rendu avec une architecture moderne, eventuellement sans jQuery.

Avantages :

- architecture plus propre ;
- possibilite d'un moteur independant du DOM jQuery ;
- meilleure base pour accessibilite, responsive design et integration framework.

Limites :

- risque eleve de regression visuelle et comportementale ;
- cout important avant d'obtenir une parite fonctionnelle ;
- l'API historique serait difficile a conserver parfaitement ;
- les demos et usages existants deviendraient des cas de migration, pas seulement des cas de test.

Cette option peut devenir pertinente pour un nouveau package ou une version majeure separee, mais elle est trop risquee comme prochaine etape de ce depot.

## Recommandation

La strategie realiste est une modernisation progressive.

Le depot doit rester compatible avec l'API publique documentee :

- `init` / `$('#book').turn(options)`
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

Les changements internes doivent rester courts, testables et lies a un objectif clair. Les helpers internes peuvent continuer a etre introduits, mais seulement s'ils reduisent une duplication reelle ou rendent un comportement plus testable.

## Prochains chantiers recommandes

1. Continuer a isoler le rendu DOM

   Etendre la couche `renderer` uniquement sur les operations repetitives et stables. Eviter un changement global de modele de rendu tant que les tests visuels ne couvrent pas plus de navigateurs.

2. Renforcer les tests WebKit et mobile

   Installer les dependances systeme WebKit sur une machine de CI ou de validation locale. Ajouter ensuite des assertions propres a Safari/WebKit si des differences apparaissent. Completer avec des tests tactiles reels ou emules.

3. Documenter les contrats internes

   Decrire les invariants sur `pageObjs`, `pageWrap`, `pages`, `pagePlace`, `fparent`, `wrapper`, `fwrapper`, `fpage` et les pages temporaires. Garder cette documentation proche du code ou dans un document technique.

4. Reduire les styles inline restants

   Garder inline uniquement les valeurs dynamiques. Deplacer tout style statique restant vers `turn.css` quand cela ne change pas le rendu.

5. Ameliorer l'accessibilite des demos

   Ajouter au minimum des controles correctement nommes, une navigation clavier documentee par le comportement, et une verification que les contenus restent lisibles hors animation.

6. Preparer une option de compatibilite long terme

   Si un rewrite devient necessaire, le traiter comme un package ou une branche majeure separee, avec tests de parite contre cette version maintenue.

## Risques connus

- jQuery : la librairie reste construite comme plugin jQuery. Le retrait de jQuery serait un rewrite, pas une maintenance.
- DOM imperatif : les wrappers sont crees, deplaces et supprimes dynamiquement pendant les animations. C'est fragile et doit rester couvert par les tests.
- Mobile/touch : Pointer Events sont privilegies, avec fallback touch/souris, mais les appareils tactiles reels restent a valider.
- Safari/WebKit : un projet Playwright WebKit est configure, mais il depend des bibliotheques systeme disponibles sur l'hote. La machine locale actuelle ne lance pas WebKit sans `libgstcodecparsers-1.0.so.0`.
- Accessibilite : le rendu livre/page-turn est visuel et interactif. Les lecteurs d'ecran, focus, reductions d'animation et alternatives de navigation ne sont pas encore suffisamment traites.
- Gradients/transforms : les syntaxes sont modernisees, mais les differences de rendu entre moteurs peuvent rester visibles.
- Licence : la licence originale est non commerciale. Toute distribution ou integration doit respecter `license.txt`.

## Ligne directrice

Ne pas chercher a rendre cette base "moderne" en une seule passe. Le bon chemin est de stabiliser les comportements existants, augmenter la couverture, documenter les limites, puis extraire les pieces internes une par une.
