# Contrat de l'API Queen Bee

Adresse de base en local : `http://localhost:3000`. Les corps de requête et de réponse sont en JSON (`Content-Type: application/json`). Les données sont gardées en mémoire : un redémarrage du serveur les remet à zéro.

## Format des erreurs (RFC 9457)

Toutes les erreurs ont le même format et l'en-tête `Content-Type: application/problem+json` :

```json
{
  "type": "about:blank",
  "title": "Requête invalide",
  "status": 400,
  "detail": "Le paramètre limit doit être un entier compris entre 1 et 500."
}
```

`title` est l'intitulé du code, identique pour toutes les erreurs de ce code. `detail` explique ce qui s'est passé pour cette requête. Une réponse d'erreur ne contient jamais de pile d'exécution.

| Code | `title` |
|---|---|
| 400 | Requête invalide |
| 404 | Ressource introuvable |
| 409 | Conflit |
| 500 | Erreur interne |

Trois erreurs valent pour toutes les routes :

- `404` : aucune route ne correspond au verbe et au chemin demandés.
- `400` : le corps d'une requête `POST` n'est pas un JSON valide (`detail` : « Le corps de la requête n'est pas un JSON valide. »).
- `500` : erreur inattendue du serveur, détail neutre, la cause est dans le journal du serveur.

## Ressources

Une ruche : `{ "id": "SN-CASA-001", "site_id": "SN-CASA", "status": "active" }`. Les ruches du jeu de départ sont `SN-CASA-001` à `SN-CASA-003` (site `SN-CASA`) et `CI-AGBO-001` à `CI-AGBO-002` (site `CI-AGBO`).

---

### GET /health

Vérifie que le serveur répond.

- `200` : `{ "status": "ok" }`

---

### GET /api/hives

Liste des ruches, avec un filtre facultatif par site.

Paramètres de requête

- `site_id` : texte, facultatif. Sans valeur, ou absent, toutes les ruches sont renvoyées. Avec une valeur, seules les ruches de ce site (comparaison exacte, casse comprise). Un site inconnu donne une liste vide.

Réponses

- `200` : tableau de ruches.

```json
[
  { "id": "SN-CASA-001", "site_id": "SN-CASA", "status": "active" },
  { "id": "SN-CASA-002", "site_id": "SN-CASA", "status": "active" }
]
```

Aucun cas d'erreur propre à cette route.

---

### GET /api/hives/:id

Détail d'une ruche.

Paramètres de chemin

- `id` : identifiant de la ruche, par exemple `SN-CASA-001`.

Réponses

- `200` : la ruche.

```json
{ "id": "SN-CASA-001", "site_id": "SN-CASA", "status": "active" }
```

- `404` : aucune ruche ne porte cet identifiant.

```json
{
  "type": "about:blank",
  "title": "Ressource introuvable",
  "status": 404,
  "detail": "Aucune ruche ne porte l'identifiant XX-NOPE-999."
}
```

---

### POST /api/hives/:id/measures

Enregistre une mesure envoyée par le capteur d'une ruche.

Paramètres de chemin

- `id` : identifiant de la ruche.

Corps

| Champ | Type | Obligatoire | Remarque |
|---|---|---|---|
| `timestamp` | texte | oui | date ISO 8601 attendue (format non vérifié), instant de la prise de mesure par le capteur, conservé tel quel |
| `weight_kg` | nombre | oui | |
| `hive_id` | texte | non | s'il est présent, il doit être égal à l'`id` du chemin |
| autres champs (`temp_internal_c`, `humidity_pct`...) | libre | non | conservés tels quels, non validés |

Réponses

- `201` : la mesure enregistrée, complétée par `hive_id` et `site_id`.

```json
{
  "timestamp": "2026-10-31T10:00:00Z",
  "weight_kg": 36.84,
  "temp_internal_c": 34.4,
  "humidity_pct": 64,
  "hive_id": "SN-CASA-001",
  "site_id": "SN-CASA"
}
```

- `400` : `timestamp` absent, `weight_kg` absent ou pas un nombre, ou `hive_id` différent de l'`id` du chemin.

```json
{
  "type": "about:blank",
  "title": "Requête invalide",
  "status": 400,
  "detail": "Les champs timestamp et weight_kg (nombre) sont obligatoires."
}
```

- `404` : aucune ruche ne porte cet identifiant.

---

### GET /api/hives/:id/measures

Historique des mesures d'une ruche, de la plus récente à la plus ancienne (tri sur `timestamp`).

Paramètres de chemin

- `id` : identifiant de la ruche.

Paramètres de requête

- `limit` : entier de 1 à 500, 50 par défaut.
- `offset` : entier positif ou nul, 0 par défaut. Nombre de mesures à sauter.

Seuls les chiffres sont acceptés : `abc`, `1.5`, `-1` et une valeur vide (`?limit=`) donnent une erreur 400.

Réponses

- `200` : une page de mesures. `limit` et `offset` rappellent les valeurs appliquées. Une page au-delà de la dernière mesure donne `items: []`.

```json
{
  "items": [
    {
      "timestamp": "2026-11-03T10:00:00Z",
      "weight_kg": 43,
      "hive_id": "SN-CASA-001",
      "site_id": "SN-CASA"
    }
  ],
  "limit": 50,
  "offset": 0
}
```

- `400` : `limit` ou `offset` invalide.

```json
{
  "type": "about:blank",
  "title": "Requête invalide",
  "status": 400,
  "detail": "Le paramètre limit doit être un entier compris entre 1 et 500."
}
```

Pour `offset`, le `detail` est « Le paramètre offset doit être un entier positif ou nul. ».

- `404` : aucune ruche ne porte cet identifiant. Ce contrôle passe avant celui des paramètres.

---

### GET /api/hives/:id/inspections

Inspections d'une ruche, dans l'ordre où elles ont été enregistrées.

Paramètres de chemin

- `id` : identifiant de la ruche.

Réponses

- `200` : tableau d'inspections, vide si la ruche n'en a aucune.

```json
[
  {
    "id": "08973e2e-62bd-4e89-b470-4fa0d21489a3",
    "hive_id": "SN-CASA-001",
    "inspected_at": "2026-11-19T09:30:00Z",
    "colony_status": "forte",
    "queen_present": true,
    "observations": "Couvain abondant."
  }
]
```

- `404` : aucune ruche ne porte cet identifiant.

---

### POST /api/hives/:id/inspections

Enregistre l'inspection d'une ruche. L'identifiant est choisi par l'application mobile, pas par le serveur.

Paramètres de chemin

- `id` : identifiant de la ruche.

Corps

| Champ | Type | Obligatoire | Remarque |
|---|---|---|---|
| `id` | texte (UUID) | oui | identifiant choisi par l'application mobile |
| `inspected_at` | texte (date ISO 8601) | oui | par exemple `2026-11-19T09:30:00Z` ou `2026-11-19` |
| `colony_status` | texte | oui | `forte`, `normale`, `faible` ou `morte` |
| `queen_present` | booléen | non | |
| `observations` | texte | non | |

Les champs inconnus sont ignorés. `hive_id` est pris dans le chemin.

Réponses

- `201` : l'inspection créée.

```json
{
  "id": "08973e2e-62bd-4e89-b470-4fa0d21489a3",
  "hive_id": "SN-CASA-001",
  "inspected_at": "2026-11-19T09:30:00Z",
  "colony_status": "forte",
  "queen_present": true,
  "observations": "Couvain abondant."
}
```

- `400` : `id` absent ou pas un UUID, `inspected_at` absent ou pas une date ISO 8601, `colony_status` absent ou hors liste, `queen_present` présent mais pas un booléen, `observations` présent mais pas un texte.

```json
{
  "type": "about:blank",
  "title": "Requête invalide",
  "status": 400,
  "detail": "Le champ colony_status est obligatoire : forte, normale, faible, morte."
}
```

- `404` : aucune ruche ne porte cet identifiant.
- `409` : une inspection porte déjà cet `id`.

```json
{
  "type": "about:blank",
  "title": "Conflit",
  "status": 409,
  "detail": "Une inspection porte déjà cet identifiant."
}
```
