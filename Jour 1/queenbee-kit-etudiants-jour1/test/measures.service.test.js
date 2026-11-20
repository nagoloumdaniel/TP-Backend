import { test } from "node:test";
import assert from "node:assert/strict";
import { createMeasuresService } from "../src/services/measures.service.js";
import { ValidationError, NotFoundError } from "../src/errors.js";

const RUCHE = { id: "SN-CASA-001", site_id: "SN-CASA", status: "active" };

const ADMIN = { id: "u-admin", role: "admin", site_id: null };

// Faux service de ruches et faux dépôt en mémoire : le service est testé sans Express ni base.
function creerService() {
  const stockees = [];
  const measuresRepository = {
    // Imite INSERT … ON CONFLICT (hive_id, measured_at) DO NOTHING.
    async add(m) {
      const existante = stockees.find((x) => x.hive_id === m.hive_id && x.timestamp === m.timestamp);
      if (existante) return { measure: existante, created: false };
      stockees.push(m);
      return { measure: m, created: true };
    },
    async findByHive(hiveId, { limit, offset }) {
      return stockees
        .filter((m) => m.hive_id === hiveId)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .slice(offset, offset + limit);
    },
  };
  const hivesService = {
    async getHive(user, id) {
      if (id !== RUCHE.id) throw new NotFoundError(`Aucune ruche ne porte l'identifiant ${id}.`);
      return RUCHE;
    },
  };
  return { service: createMeasuresService({ hivesService, measuresRepository }), stockees };
}

const mesure = (extra = {}) => ({ timestamp: "2026-11-20T10:00:00Z", weight_kg: 40, ...extra });

test("accepte une mesure dans les plages et la complète avec hive_id et site_id", async () => {
  const { service, stockees } = creerService();
  const { measure, created } = await service.addMeasure(ADMIN, RUCHE.id, mesure({ temp_internal_c: 34.4, humidity_pct: 64 }));
  assert.equal(created, true);
  assert.equal(measure.hive_id, RUCHE.id);
  assert.equal(measure.site_id, RUCHE.site_id);
  assert.equal(stockees.length, 1);
});

test("accepte les bornes exactes des plages", async () => {
  const { service } = creerService();
  await service.addMeasure(ADMIN, RUCHE.id, mesure({ weight_kg: 150, humidity_pct: 0, acoustic_activity_score: 1 }));
});

test("signale une ruche inconnue", async () => {
  const { service } = creerService();
  await assert.rejects(service.addMeasure(ADMIN, "XX-NOPE-999", mesure()), NotFoundError);
});

test("refuse une trame qui désigne une autre ruche que le chemin", async () => {
  const { service, stockees } = creerService();
  await assert.rejects(service.addMeasure(ADMIN, RUCHE.id, mesure({ hive_id: "SN-CASA-002" })), ValidationError);
  assert.equal(stockees.length, 0);
});

test("pagine de la plus récente à la plus ancienne", async () => {
  const { service } = creerService();
  await service.addMeasure(ADMIN, RUCHE.id, mesure({ timestamp: "2026-11-01T00:00:00Z" }));
  await service.addMeasure(ADMIN, RUCHE.id, mesure({ timestamp: "2026-11-03T00:00:00Z" }));
  await service.addMeasure(ADMIN, RUCHE.id, mesure({ timestamp: "2026-11-02T00:00:00Z" }));
  const page = await service.listMeasures(ADMIN, RUCHE.id, { limit: 2, offset: 0 });
  assert.deepEqual(page.items.map((m) => m.timestamp.slice(0, 10)), ["2026-11-03", "2026-11-02"]);
});

test("une trame reçue deux fois n'est enregistrée qu'une fois", async () => {
  const { service, stockees } = creerService();
  await service.addMeasure(ADMIN, RUCHE.id, mesure());
  const second = await service.addMeasure(ADMIN, RUCHE.id, mesure());
  assert.equal(second.created, false);
  assert.equal(stockees.length, 1);
});
