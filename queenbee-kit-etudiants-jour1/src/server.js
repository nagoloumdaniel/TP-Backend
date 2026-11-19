import express from "express";
import { requestLogger } from "./middlewares/requestLogger.js";
import { notFoundHandler, errorHandler } from "./middlewares/errorHandler.js";
import { sendProblem } from "./utils/problem.js";

const app = express();
app.use(express.json());
app.use(requestLogger);

const hives = [
  { id: "SN-CASA-001", site_id: "SN-CASA", status: "active" },
  { id: "SN-CASA-002", site_id: "SN-CASA", status: "active" },
  { id: "SN-CASA-003", site_id: "SN-CASA", status: "active" },
  { id: "CI-AGBO-001", site_id: "CI-AGBO", status: "active" },
  { id: "CI-AGBO-002", site_id: "CI-AGBO", status: "active" },
];
const measures = [];
const inspections = [];

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/hives", (req, res) => {
  const { site_id } = req.query;
  res.json(!site_id ? hives : hives.filter((h) => h.site_id === site_id));
});

app.get("/api/hives/:id", (req, res) => {
  const hive = hives.find((h) => h.id === req.params.id);
  if (!hive) return sendProblem(res, 404, `Aucune ruche ne porte l'identifiant ${req.params.id}.`);
  res.json(hive);
});

app.post("/api/hives/:id/measures", (req, res) => {
  const hive = hives.find((h) => h.id === req.params.id);
  if (!hive) return sendProblem(res, 404, `Aucune ruche ne porte l'identifiant ${req.params.id}.`);

  const body = req.body ?? {};
  if (!body.timestamp || typeof body.weight_kg !== "number") {
    return sendProblem(res, 400, "Les champs timestamp et weight_kg (nombre) sont obligatoires.");
  }
  if (body.hive_id !== undefined && body.hive_id !== hive.id) {
    return sendProblem(res, 400, "Le champ hive_id ne correspond pas à la ruche du chemin.");
  }

  // Le timestamp est celui de la trame (instant de la prise par le capteur), pas celui de la réception.
  const mesure = { ...body, hive_id: hive.id, site_id: hive.site_id };
  measures.push(mesure);
  res.status(201).json(mesure);
});

// Entier décimal strict : "abc", "", "1.5" et "-1" sont refusés.
function parseEntier(valeur, defaut) {
  if (valeur === undefined) return defaut;
  return typeof valeur === "string" && /^\d+$/.test(valeur) ? Number(valeur) : NaN;
}

app.get("/api/hives/:id/measures", (req, res) => {
  const hive = hives.find((h) => h.id === req.params.id);
  if (!hive) return sendProblem(res, 404, `Aucune ruche ne porte l'identifiant ${req.params.id}.`);

  const limit = parseEntier(req.query.limit, 50);
  if (!(limit >= 1 && limit <= 500)) {
    return sendProblem(res, 400, "Le paramètre limit doit être un entier compris entre 1 et 500.");
  }
  const offset = parseEntier(req.query.offset, 0);
  if (Number.isNaN(offset)) {
    return sendProblem(res, 400, "Le paramètre offset doit être un entier positif ou nul.");
  }

  const ordonnees = measures
    .filter((m) => m.hive_id === hive.id)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json({ items: ordonnees.slice(offset, offset + limit), limit, offset });
});

app.get("/api/hives/:id/inspections", (req, res) => {
  const hive = hives.find((h) => h.id === req.params.id);
  if (!hive) return sendProblem(res, 404, `Aucune ruche ne porte l'identifiant ${req.params.id}.`);
  res.json(inspections.filter((i) => i.hive_id === hive.id));
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_ISO = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/;
const ETATS_COLONIE = ["forte", "normale", "faible", "morte"];

app.post("/api/hives/:id/inspections", (req, res) => {
  const hive = hives.find((h) => h.id === req.params.id);
  if (!hive) return sendProblem(res, 404, `Aucune ruche ne porte l'identifiant ${req.params.id}.`);

  const b = req.body ?? {};
  if (typeof b.id !== "string" || !UUID.test(b.id)) {
    return sendProblem(res, 400, "Le champ id est obligatoire et doit être un UUID.");
  }
  if (typeof b.inspected_at !== "string" || !DATE_ISO.test(b.inspected_at) || Number.isNaN(Date.parse(b.inspected_at))) {
    return sendProblem(res, 400, "Le champ inspected_at est obligatoire et doit être une date ISO 8601.");
  }
  if (!ETATS_COLONIE.includes(b.colony_status)) {
    return sendProblem(res, 400, `Le champ colony_status est obligatoire : ${ETATS_COLONIE.join(", ")}.`);
  }
  if (b.queen_present !== undefined && typeof b.queen_present !== "boolean") {
    return sendProblem(res, 400, "Le champ queen_present doit être un booléen.");
  }
  if (b.observations !== undefined && typeof b.observations !== "string") {
    return sendProblem(res, 400, "Le champ observations doit être un texte.");
  }
  if (inspections.some((i) => i.id === b.id)) {
    return sendProblem(res, 409, "Une inspection porte déjà cet identifiant.");
  }

  // L'id est choisi par l'application mobile ; seuls les champs du contrat sont conservés.
  const inspection = { id: b.id, hive_id: hive.id, inspected_at: b.inspected_at, colony_status: b.colony_status };
  if (b.queen_present !== undefined) inspection.queen_present = b.queen_present;
  if (b.observations !== undefined) inspection.observations = b.observations;
  inspections.push(inspection);
  res.status(201).json(inspection);
});

app.use(notFoundHandler);
app.use(errorHandler);

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`API sur http://localhost:${port}`));
