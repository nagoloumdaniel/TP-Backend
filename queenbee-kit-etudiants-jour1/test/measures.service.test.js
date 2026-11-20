import { test } from "node:test";
import assert from "node:assert/strict";
import { createMeasuresService } from "../src/services/measures.service.js";
import { ValidationError, NotFoundError } from "../src/errors.js";

const RUCHE = { id: "SN-CASA-001", site_id: "SN-CASA", status: "active" };

// Faux dépôt et faux service de ruches : le service est testé sans Express ni données réelles.
function creerService() {
  const stockees = [];
  const measuresRepository = {
    add: (m) => (stockees.push(m), m),
    findByHive: (id) => stockees.filter((m) => m.hive_id === id),
  };
  const hivesService = {
    getById(id) {
      if (id !== RUCHE.id) throw new NotFoundError(`Aucune ruche ne porte l'identifiant ${id}.`);
      return RUCHE;
    },
  };
  return { service: createMeasuresService({ hivesService, measuresRepository }), stockees };
}

const mesure = (extra = {}) => ({ timestamp: "2026-11-20T10:00:00Z", weight_kg: 40, ...extra });

test("refuse un poids hors de sa plage physique", () => {
  const { service, stockees } = creerService();
  assert.throws(() => service.add(RUCHE.id, mesure({ weight_kg: 500 })), ValidationError);
  assert.equal(stockees.length, 0);
});

test("accepte une mesure dans les plages et la complète avec hive_id et site_id", () => {
  const { service, stockees } = creerService();
  const res = service.add(RUCHE.id, mesure({ temp_internal_c: 34.4, humidity_pct: 64 }));
  assert.equal(res.hive_id, RUCHE.id);
  assert.equal(res.site_id, RUCHE.site_id);
  assert.equal(stockees.length, 1);
});

test("accepte les bornes exactes des plages", () => {
  const { service } = creerService();
  assert.doesNotThrow(() => service.add(RUCHE.id, mesure({ weight_kg: 150, humidity_pct: 0, acoustic_activity_score: 1 })));
});

test("refuse chaque champ hors plage", () => {
  const horsPlage = {
    position_lat: 91,
    position_lon: -181,
    temp_internal_c: 61,
    temp_external_c: -21,
    humidity_pct: 101,
    acoustic_activity_score: 1.1,
    battery_pct: -1,
  };
  for (const [champ, valeur] of Object.entries(horsPlage)) {
    const { service, stockees } = creerService();
    assert.throws(() => service.add(RUCHE.id, mesure({ [champ]: valeur })), ValidationError, champ);
    assert.equal(stockees.length, 0, champ);
  }
});

test("refuse un champ physique qui n'est pas un nombre", () => {
  const { service } = creerService();
  assert.throws(() => service.add(RUCHE.id, mesure({ humidity_pct: "64" })), ValidationError);
});

test("signale une ruche inconnue avant de valider la mesure", () => {
  const { service } = creerService();
  assert.throws(() => service.add("XX-NOPE-999", mesure({ weight_kg: 500 })), NotFoundError);
});

test("refuse un timestamp absent ou un hive_id différent du chemin", () => {
  const { service } = creerService();
  assert.throws(() => service.add(RUCHE.id, { weight_kg: 40 }), ValidationError);
  assert.throws(() => service.add(RUCHE.id, mesure({ hive_id: "SN-CASA-002" })), ValidationError);
});

test("pagine de la plus récente à la plus ancienne et refuse un limit invalide", () => {
  const { service } = creerService();
  service.add(RUCHE.id, mesure({ timestamp: "2026-11-01T00:00:00Z" }));
  service.add(RUCHE.id, mesure({ timestamp: "2026-11-03T00:00:00Z" }));
  service.add(RUCHE.id, mesure({ timestamp: "2026-11-02T00:00:00Z" }));
  const page = service.list(RUCHE.id, { limit: "2", offset: "0" });
  assert.deepEqual(page.items.map((m) => m.timestamp.slice(0, 10)), ["2026-11-03", "2026-11-02"]);
  assert.throws(() => service.list(RUCHE.id, { limit: "0" }), ValidationError);
  assert.throws(() => service.list(RUCHE.id, { offset: "-1" }), ValidationError);
});
