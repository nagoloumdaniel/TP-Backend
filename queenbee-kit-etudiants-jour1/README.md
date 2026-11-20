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
| Dépôt | `src/repositories/postgres/*.js` | Lit et écrit les données. Ne choisit jamais un code HTTP. |

Les services sont des fabriques qui reçoivent leurs dépendances (`createMeasuresService({ hivesService, measuresRepository })`) et n'importent jamais un dépôt. `createApp` (`src/app.js`) assemble le tout à partir des dépôts reçus ; `src/server.js` crée les dépôts en mémoire et démarre l'écoute. Remplacer la mémoire par PostgreSQL ne touchera que `repositories/`.

Erreurs : les services lèvent `NotFoundError`, `ValidationError` ou `ConflictError` (`src/errors.js`), et `errorHandler` les traduit en 404, 400 et 409 au format RFC 9457. `ConflictError` n'était pas dans l'énoncé : il est nécessaire au 409 des inspections.

Configuration : `src/config.js` lit `PORT` et `NODE_ENV` et arrête le démarrage avec un message clair si une valeur est invalide. Copier `.env.example` en `.env` (ignoré par git), puis `npm run dev`.

Plages physiques (UC-CY02) vérifiées depuis le TP 6 par `validators/schemas.js` (Joi), erreur 400 hors plage : `position_lat` -90 à 90, `position_lon` -180 à 180, `weight_kg` 0 à 150, `temp_internal_c` -10 à 60, `temp_external_c` -20 à 60, `humidity_pct` 0 à 100, `acoustic_activity_score` 0 à 1, `battery_pct` 0 à 100. Un champ présent doit être un nombre. Ces cas sont décrits dans `docs/api.md`.

Tests : `npm test` (`node:test`). Le test « refuse un poids hors de sa plage physique » a été vérifié en le faisant échouer exprès (limite 150 remplacée par 1500 : 1 test en échec), puis la règle a été restaurée.

Vérification de la règle de couches : `grep -r repositories src/controllers` ne renvoie rien.

## TP 5 : PostgreSQL

Démarrage : `docker compose up -d` (service `db`, PostgreSQL 17), puis `npm run dev`. Les variables `DB_*` sont dans `.env` (ignoré par git, `.env.example` en donne les noms). Le mode mémoire a été retiré au TP 7 (l'énoncé l'exige) : la base est maintenant obligatoire.

Le choix du stockage se fait uniquement dans `src/server.js`. Les dépôts PostgreSQL (`src/repositories/postgres/`) n'utilisent que des requêtes paramétrées (`$1`, `$2`), jamais de `SELECT *`, et renomment les colonnes pour garder le contrat JSON du TP 3 (`measured_at AS timestamp`, `lat AS position_lat`).

Écart avec l'énoncé : les services et le contrôleur sont devenus `async`, car un dépôt PostgreSQL renvoie des promesses. La logique métier n'a pas changé. La pagination des mesures (tri récent d'abord, LIMIT/OFFSET) est maintenant faite par le dépôt, en SQL côté PostgreSQL et par un tri équivalent côté mémoire.

### Pourquoi `pool.connect()` et pas `pool.query()` pour l'import par lot ?
Une transaction (`BEGIN` ... `COMMIT`) vit sur une seule connexion. `pool.query()` peut prendre une connexion différente à chaque appel, donc le `BEGIN` et les `INSERT` ne seraient pas dans la même transaction. `pool.connect()` réserve un client précis pour toute la transaction.

### Que se passe-t-il sans `client.release()` dans le `finally` ?
Le client n'est jamais rendu au pool. Après une erreur, la connexion reste bloquée (avec une transaction ouverte si le `ROLLBACK` a échoué). Quand les 10 connexions du pool sont ainsi perdues, toute nouvelle requête attend sans fin et l'API ne répond plus.

### Chronométrage et état après erreur (modes `ligne` et `lot`)
À compléter après `docker compose up -d` : durée des deux modes sur le même fichier, nombre de mesures en base après une erreur à la 2 001e mesure (mode ligne : les 2 000 premières restent, mode lot : un `ROLLBACK` annule tout le lot en cours).

## TP 6 : validation Joi et erreurs centralisées

Les contrôles de forme (types, plages, champs obligatoires, champs inconnus) sont déclarés dans `src/validators/schemas.js` et appliqués par le middleware `validate(schema, source)` (`src/middlewares/validate.js`), branché dans le routeur. Les données converties arrivent dans `req.validated` : avec Express 5, `req.query` est en lecture seule. Les messages sont en français (`src/validators/messages.js`, clé `date.max` ajoutée pour « ne peut pas être dans le futur »).

Les services ne gardent que ce qui exige de connaître la ruche ou la base : ruche inconnue (404), `hive_id` du corps différent de celui du chemin (400), identifiant d'inspection déjà pris (409). Les contrôleurs n'ont plus aucun `try/catch` : Express 5 envoie les erreurs asynchrones à `errorHandler`.

`src/errors.js` : classe mère `AppError(message, status)` et trois sous-classes (`ValidationError` 400, `NotFoundError` 404, `ConflictError` 409). `errorHandler` traduit aussi : JSON invalide (400), corps de plus de 1 Mo (413, `express.json({ limit: "1mb" })`), violation d'unicité PostgreSQL `23505` (409 « Cette ressource existe déjà. »), contraintes `23503`, `23514`, `22P02` (400 générique). Le message brut de PostgreSQL n'est jamais renvoyé : il citerait tables et contraintes. Toute autre erreur est écrite dans le journal du serveur et renvoyée en 500 neutre.

Écart avec l'énoncé : `timestamp` et `inspected_at` utilisent `Joi.date().iso().raw()`. Joi vérifie la date sans la transformer en objet `Date`, ce qui garde le texte ISO d'origine et le contrat JSON du TP 3.

Vérifié (mode mémoire, serveur lancé, puis arrêté) :
- poids 500 et humidité 120 : 400 « weight_kg doit être inférieur ou égal à 150. humidity_pct doit être inférieur ou égal à 100. »
- corps absent : 400 « timestamp est obligatoire. weight_kg est obligatoire. »
- `?limit=abc` : 400 « limit doit être un nombre. »
- inspection avec `author_id` : 400 « author_id n'est pas un champ autorisé. » ; date en 2099 : 400 « inspected_at ne peut pas être dans le futur. »
- JSON cassé : 400 ; `grep "try {" src/controllers` : aucun résultat ; `npm test` : 18 tests verts.

Non vérifié (Docker arrêté sur ce poste) : le rejeu d'une mesure qui doit donner 409 (contrainte d'unicité PostgreSQL) et l'absence de « duplicate key » dans la réponse. En mode mémoire un rejeu est accepté, il n'y a pas de contrainte d'unicité.

## TP 7 : authentification JWT et contrôle d'accès

Comptes de démonstration (mot de passe commun `QueenBee2026!`) : `admin@queenbee.test`, `gestion@queenbee.test`, `coord.sn-casa@queenbee.test`, `api1.sn-casa@queenbee.test`.

Routes : `POST /api/auth/login`, `POST /api/auth/refresh`, `GET /api/auth/me`, `POST /api/auth/register` (admin seulement). Toutes les routes `/api/hives` exigent un jeton `Authorization: Bearer ...`.

Choix :
- JWT HS256, émetteur `queenbee-api`, audience `queenbee`, champ `type` (`access` ou `refresh`) vérifié, deux secrets distincts dans `.env` (jamais dans git).
- Mots de passe hachés avec bcryptjs. Un compte inconnu et un mauvais mot de passe renvoient le même message (pas d'énumération de comptes). Après 5 échecs, le compte est bloqué 15 minutes.
- Le rôle et le site viennent de la base à chaque requête, pas du jeton.
- 404 avant 403 : une ruche inexistante répond 404 à tous les rôles.
- L'auteur d'une inspection est `req.user.id`, jamais une valeur du corps.

| Rôle | Ruches visibles | Peut envoyer |
|---|---|---|
| admin | toutes | mesures et comptes |
| gestionnaire | toutes | rien |
| coordinateur | celles de son site | inspections |
| apiculteur | les siennes (`owner_id`) | inspections |

Écarts déclarés : les services prennent `user` en premier argument et sont renommés (`getHive`, `listHives`, `addMeasure`...). Le mode mémoire est supprimé.

### Journal des 4 requêtes interdites

À remplir après lancement de la base (Docker n'était pas démarré lors du développement) : requête, code attendu, code obtenu.

| # | Requête | Attendu | Obtenu |
|---|---|---|---|
| 1 | coord : `GET /api/hives?site_id=CI-AGBO` | 403 « Vous n'avez pas accès au site CI-AGBO. » | à vérifier |
| 2 | api1 : `POST /api/hives/SN-CASA-001/measures` | 403 « Action réservée aux rôles suivants : admin. » | à vérifier |
| 3 | jeton expiré (`JWT_ACCESS_TTL=10s`) | 401 « Jeton d'accès invalide ou expiré. » | à vérifier |
| 4 | jeton falsifié | 401, même message | à vérifier |

Comptages attendus : admin 400 ruches, coord 50, api1 10 ; api1 reçoit 403 sur `SN-CASA-011` et 404 sur `XX-NOPE-999`.

Vérifié sans base : `npm test` (22 tests verts, dont `canAccessHive`, 404 avant 403, filtres par rôle). Non vérifié : tout ce qui touche PostgreSQL (login réel, comptages, blocage de compte).
