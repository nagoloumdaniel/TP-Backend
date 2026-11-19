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
