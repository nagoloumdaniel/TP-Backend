import { test } from "node:test";
import assert from "node:assert/strict";
import { createMeasuresService } from "../src/services/measures.service.js";
import { createMemoryMeasuresRepository } from "../src/repositories/memory/measures.repository.js";
import { ValidationError, NotFoundError } from "../src/errors.js";

const RUCHE = { id: "SN-CASA-001", site_id: "SN-CASA", status: "active" };

// Faux service de ruches et dépôt mémoire : le service est testé sans Express ni base.
function creerService() {
  const measuresRepository = createMemoryMeasuresRepository();
  const stockees = [];
  const original = measuresRepository.add;
  measuresRepository.add = (m) => (stockees.push(m), original(m));
  const hivesService = {
    async getById(id) {
      if (id !== RUCHE.id) throw new NotFoundError(`Aucune ruche ne porte l'identifiant ${id}.`);
      return RUCHE;
    },
  };
  return { service: createMeasuresService({ hivesService, measuresRepository }), stockees };
}

const mesure = (extra = {}) => ({ timestamp: "2026-11-20T10:00:00Z", weight_kg: 40, ...extra });

test("accepte une mesure dans les plages et la complète avec hive_id et site_id", async () => {
  const { service, stockees } = creerService();
  const res = await service.add(RUCHE.id, mesure({ temp_internal_c: 34.4, humidity_pct: 64 }));
  assert.equal(res.hive_id, RUCHE.id);
  assert.equal(res.site_id, RUCHE.site_id);
  assert.equal(stockees.length, 1);
});

test("accepte les bornes exactes des plages", async () => {
  const { service } = creerService();
  await service.add(RUCHE.id, mesure({ weight_kg: 150, humidity_pct: 0, acoustic_activity_score: 1 }));
});

test("signale une ruche inconnue", async () => {
  const { service } = creerService();
  await assert.rejects(service.add("XX-NOPE-999", mesure()), NotFoundError);
});

test("refuse une trame qui désigne une autre ruche que le chemin", async () => {
  const { service, stockees } = creerService();
  await assert.rejects(service.add(RUCHE.id, mesure({ hive_id: "SN-CASA-002" })), ValidationError);
  assert.equal(stockees.length, 0);
});

test("pagine de la plus récente à la plus ancienne", async () => {
  const { service } = creerService();
  await service.add(RUCHE.id, mesure({ timestamp: "2026-11-01T00:00:00Z" }));
  await service.add(RUCHE.id, mesure({ timestamp: "2026-11-03T00:00:00Z" }));
  await service.add(RUCHE.id, mesure({ timestamp: "2026-11-02T00:00:00Z" }));
  const page = await service.list(RUCHE.id, { limit: 2, offset: 0 });
  assert.deepEqual(page.items.map((m) => m.timestamp.slice(0, 10)), ["2026-11-03", "2026-11-02"]);
});
