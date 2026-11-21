# Fourmi Express

Jeu web open source d'[OpenGamingStudio](https://opengamingstudio.com) : des fourmis avancent sur un réseau de pistes, tu touches les aiguillages pour les mener à la fourmilière de **leur nourriture** (fraise = cercle rouge, feuille = triangle vert, myrtille = carré bleu). Chaque livraison réussie rapporte des points (bonus de série), les fourmis accélèrent, trois erreurs et c'est fini. Record gardé sur ton appareil.

Jouer : https://fourmi-express.opengamingstudio.com

## Commandes

Écran : touche un aiguillage. Clavier : `1`, `2`, `3` (aiguillages), `P` (pause).

## Développement

```
npm install
npm run dev        # serveur local
npm test           # tests (simulation, sauvegarde)
npm run build      # tsc + build statique dans dist/
```

Vite + TypeScript + Tailwind, canvas 2D, police Fredoka auto-hébergée, aucune dépendance d'exécution, aucun réseau. Image Docker : build Node puis nginx (voir `Dockerfile`).

## Licence

MIT, voir `LICENSE`.
