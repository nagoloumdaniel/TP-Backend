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

app.use(notFoundHandler);
app.use(errorHandler);

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`API sur http://localhost:${port}`));
