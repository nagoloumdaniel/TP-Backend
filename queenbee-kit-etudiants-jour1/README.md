# Queen Bee

## TP 1 : lire les mesures sans bloquer

Mesures relevées avec `tp/tp1-lecture/sonde.js` (un `/ping` toutes les 10 ms pendant l'import).
Les durées varient d'un poste à l'autre.

| Fichier | Lecture | Durée de l'import (ms) | Pire temps de /ping (ms) |
|---|---|---|---|
| 1 jour | bloquante | 9 | 4 |
| 1 jour | en flux | 18 | 3 |
| 30 jours | bloquante | 244 | 235 |
| 30 jours | en flux | 249 | 4 |

Contrôle : 4 800 mesures et 37,87 kg pour 1 jour, 144 000 mesures et 38,74 kg pour 30 jours, identiques dans les deux routes.

### Pourquoi /ping attend-il pendant l'import bloquant ?

Node.js exécute le JavaScript sur un seul fil. `readFileSync`, le découpage et les 144 000 `JSON.parse` s'exécutent d'une traite : la boucle d'événements ne peut traiter aucune autre requête avant la fin, donc `/ping` reste en attente pendant tout l'import.

### La lecture en flux est-elle plus rapide ?

Non, la durée totale est équivalente (249 ms contre 244 ms), voire un peu plus longue. Elle apporte la disponibilité : `for await` rend la main à la boucle d'événements entre deux morceaux, donc `/ping` répond en 4 ms, et la mémoire reste faible car le fichier n'est jamais chargé en entier.

### Pourquoi l'effet est-il presque invisible avec le fichier d'une journée ?

Le fichier d'une journée ne compte que 4 800 lignes : l'import bloquant dure environ 9 ms, un blocage trop court pour être perçu (4 ms de pire temps de `/ping`). L'effet croît avec la taille du fichier.

## TP 2 : premières routes en mémoire

Lancement : `npm run dev` (port 3000). Requêtes de test : `docs/queenbee.postman_collection.json` (à importer dans Postman ou Bruno, sans jeton ni mot de passe).

Journal des requêtes : `requestLogger` et `morgan("dev")` comparés. `morgan` donne une ligne colorée sans date (`GET /x?a=1 200 1.736 ms - 2`) ; `requestLogger` ajoute la date ISO et reste lisible dans un fichier. Seul `requestLogger` est gardé, `morgan` est désinstallé.

## TP 3 : contrat de l'API

Le contrat de chaque route est dans `docs/api.md` (paramètres, corps, codes, exemples). Toutes les erreurs suivent la RFC 9457 (`application/problem+json`), y compris la route inconnue et le JSON mal formé. Les requêtes de test sont dans `docs/queenbee.postman_collection.json`.

## TP 4 : passage en couches

Chaque requête traverse quatre couches, dans cet ordre :

| Couche | Fichiers | Rôle |
|---|---|---|
| Routeur | `src/routes/hives/hives.router.js` | URL, verbe, intergiciels. Aucune logique. |
| Contrôleur | `src/controllers/hives.controller.js` | Lit la requête, choisit la réponse. Aucune règle métier. |
| Service | `src/services/*.service.js` | Règles métier (validation, plages physiques, doublons). Ne connaît ni `req` ni `res`. |
| Dépôt | `src/repositories/memory/*.js` | Lit et écrit les données. Ne choisit jamais un code HTTP. |

Les services sont des fabriques qui reçoivent leurs dépendances (`createMeasuresService({ hivesService, measuresRepository })`) et n'importent jamais un dépôt. `createApp` (`src/app.js`) assemble le tout à partir des dépôts reçus ; `src/server.js` crée les dépôts en mémoire et démarre l'écoute. Remplacer la mémoire par PostgreSQL ne touchera que `repositories/`.

Erreurs : les services lèvent `NotFoundError`, `ValidationError` ou `ConflictError` (`src/errors.js`), et `errorHandler` les traduit en 404, 400 et 409 au format RFC 9457. `ConflictError` n'était pas dans l'énoncé : il est nécessaire au 409 des inspections.

Configuration : `src/config.js` lit `PORT` et `NODE_ENV` et arrête le démarrage avec un message clair si une valeur est invalide. Copier `.env.example` en `.env` (ignoré par git), puis `npm run dev`.

Plages physiques (UC-CY02) vérifiées par `measures.service.js`, erreur 400 hors plage : `position_lat` -90 à 90, `position_lon` -180 à 180, `weight_kg` 0 à 150, `temp_internal_c` -10 à 60, `temp_external_c` -20 à 60, `humidity_pct` 0 à 100, `acoustic_activity_score` 0 à 1, `battery_pct` 0 à 100. Un champ présent doit être un nombre. Ces cas sont décrits dans `docs/api.md`.

Tests : `npm test` (`node:test`). Le test « refuse un poids hors de sa plage physique » a été vérifié en le faisant échouer exprès (limite 150 remplacée par 1500 : 1 test en échec), puis la règle a été restaurée.

Vérification de la règle de couches : `grep -r repositories src/controllers` ne renvoie rien.

## TP 5 : PostgreSQL

Démarrage : `docker compose up -d` (service `db`, PostgreSQL 17), puis `npm run dev`. Les variables `DB_*` sont dans `.env` (ignoré par git, `.env.example` en donne les noms). `STORAGE=memory` relance l'API sur les dépôts en mémoire, sans base.

Le choix du stockage se fait uniquement dans `src/server.js`. Les dépôts PostgreSQL (`src/repositories/postgres/`) n'utilisent que des requêtes paramétrées (`$1`, `$2`), jamais de `SELECT *`, et renomment les colonnes pour garder le contrat JSON du TP 3 (`measured_at AS timestamp`, `lat AS position_lat`).

Écart avec l'énoncé : les services et le contrôleur sont devenus `async`, car un dépôt PostgreSQL renvoie des promesses. La logique métier n'a pas changé. La pagination des mesures (tri récent d'abord, LIMIT/OFFSET) est maintenant faite par le dépôt, en SQL côté PostgreSQL et par un tri équivalent côté mémoire.

### Pourquoi `pool.connect()` et pas `pool.query()` pour l'import par lot ?
Une transaction (`BEGIN` ... `COMMIT`) vit sur une seule connexion. `pool.query()` peut prendre une connexion différente à chaque appel, donc le `BEGIN` et les `INSERT` ne seraient pas dans la même transaction. `pool.connect()` réserve un client précis pour toute la transaction.

### Que se passe-t-il sans `client.release()` dans le `finally` ?
Le client n'est jamais rendu au pool. Après une erreur, la connexion reste bloquée (avec une transaction ouverte si le `ROLLBACK` a échoué). Quand les 10 connexions du pool sont ainsi perdues, toute nouvelle requête attend sans fin et l'API ne répond plus.

### Chronométrage et état après erreur (modes `ligne` et `lot`)
À compléter après `docker compose up -d` : durée des deux modes sur le même fichier, nombre de mesures en base après une erreur à la 2 001e mesure (mode ligne : les 2 000 premières restent, mode lot : un `ROLLBACK` annule tout le lot en cours).
