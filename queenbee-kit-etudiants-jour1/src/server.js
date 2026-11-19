import express from "express";
import { requestLogger } from "./middlewares/requestLogger.js";

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

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/hives", (req, res) => {
  const { site_id } = req.query;
  res.json(!site_id ? hives : hives.filter((h) => h.site_id === site_id));
});

app.get("/api/hives/:id", (req, res) => {
  const hive = hives.find((h) => h.id === req.params.id);
  if (!hive) return res.status(404).json({ error: "Ruche introuvable" });
  res.json(hive);
});

app.listen(3000, () => console.log("API sur http://localhost:3000"));
