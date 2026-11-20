import { test } from "node:test";
import assert from "node:assert/strict";
import { createInspectionsService } from "../src/services/inspections.service.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../src/errors.js";

const apiculteur = { id: "u-api1", role: "apiculteur", site_id: "SN-CASA" };
const RUCHES = {
  "SN-CASA-001": { id: "SN-CASA-001", site_id: "SN-CASA", owner_id: "u-api1" },
  "SN-CASA-002": { id: "SN-CASA-002", site_id: "SN-CASA", owner_id: "u-api1" },
  "SN-CASA-011": { id: "SN-CASA-011", site_id: "SN-CASA", owner_id: "u-autre" },
};

const fakeHivesService = {
  async getHive(user, id) {
    const hive = RUCHES[id];
    if (!hive) throw new NotFoundError(`Aucune ruche ne porte l'identifiant ${id}.`);
    if (hive.owner_id !== user.id) throw new ForbiddenError(`Vous n'avez pas accès à la ruche ${id}.`);
    return hive;
  },
};

// Imite le SQL : INSERT ... ON CONFLICT (id) DO NOTHING, et UPDATE ... WHERE version = ...
function createFakeInspectionsRepository() {
  const rows = new Map();
  return {
    rows,
    async findById(id) {
      return rows.get(id) ?? null;
    },
    async insertIfAbsent(inspection) {
      if (rows.has(inspection.id)) return { inspection: rows.get(inspection.id), created: false };
      const stored = { ...inspection, version: 1 };
      rows.set(inspection.id, stored);
      return { inspection: stored, created: true };
    },
    async updateIfVersion(inspection, expectedVersion) {
      const current = rows.get(inspection.id);
      if (!current || current.hive_id !== inspection.hive_id || current.version !== expectedVersion) return null;
      const updated = { ...current, ...inspection, author_id: current.author_id, version: current.version + 1 };
      rows.set(inspection.id, updated);
      return updated;
    },
    async findByHive(hiveId) {
      return [...rows.values()].filter((i) => i.hive_id === hiveId);
    },
  };
}

function creer() {
  const inspectionsRepository = createFakeInspectionsRepository();
  const service = createInspectionsService({ hivesService: fakeHivesService, inspectionsRepository });
  return { service, inspectionsRepository };
}

const ID = "0b6c4a0e-6f1f-4d8e-9a39-2f3c9b1d7e55";
const inspection = (extra = {}) => ({
  id: ID,
  hive_id: "SN-CASA-001",
  inspected_at: "2026-11-01T09:30:00Z",
  colony_status: "forte",
  ...extra,
});

test("un lot rejoué ne crée aucun doublon", async () => {
  const { service, inspectionsRepository } = creer();
  const lot = [inspection(), inspection({ id: "0b6c4a0e-6f1f-4d8e-9a39-2f3c9b1d7e56", hive_id: "SN-CASA-002" })];

  const premier = await service.syncInspections(apiculteur, lot);
  assert.deepEqual(premier.summary, { created: 2, unchanged: 0, updated: 0, conflict: 0, rejected: 0 });

  const rejeu = await service.syncInspections(apiculteur, lot);
  assert.deepEqual(rejeu.summary, { created: 0, unchanged: 2, updated: 0, conflict: 0, rejected: 0 });
  assert.equal(inspectionsRepository.rows.size, 2);
});

test("une version périmée donne un conflit et le serveur l'emporte", async () => {
  const { service, inspectionsRepository } = creer();
  await service.syncInspections(apiculteur, [inspection()]);

  const ok = await service.syncInspections(apiculteur, [inspection({ colony_status: "faible", version: 1 })]);
  assert.equal(ok.results[0].status, "updated");
  assert.equal(ok.results[0].version, 2);

  const perime = await service.syncInspections(apiculteur, [inspection({ colony_status: "morte", version: 1 })]);
  assert.equal(perime.results[0].status, "conflict");
  assert.equal(perime.results[0].current.version, 2);
  assert.equal(inspectionsRepository.rows.get(ID).colony_status, "faible");
});

test("une ruche interdite ou inconnue est rejetée sans arrêter le reste du lot", async () => {
  const { service } = creer();
  const lot = [
    inspection({ id: "0b6c4a0e-6f1f-4d8e-9a39-2f3c9b1d7e60", hive_id: "SN-CASA-011" }),
    inspection({ id: "0b6c4a0e-6f1f-4d8e-9a39-2f3c9b1d7e61", hive_id: "XX-NOPE-999" }),
    inspection(),
  ];
  const { summary, results } = await service.syncInspections(apiculteur, lot);
  assert.deepEqual(summary, { created: 1, unchanged: 0, updated: 0, conflict: 0, rejected: 2 });
  assert.equal(results[0].detail, "Vous n'avez pas accès à la ruche SN-CASA-011.");
});

test("un id déjà pris par une autre ruche est rejeté dans le lot", async () => {
  const { service } = creer();
  await service.syncInspections(apiculteur, [inspection()]);
  const { results } = await service.syncInspections(apiculteur, [inspection({ hive_id: "SN-CASA-002" })]);
  assert.equal(results[0].status, "rejected");
});

test("une modification sans inspection existante est rejetée", async () => {
  const { service } = creer();
  const { results } = await service.syncInspections(apiculteur, [inspection({ version: 1 })]);
  assert.equal(results[0].status, "rejected");
});

test("addInspection : créée puis rejeu sans doublon, 409 si l'id est d'une autre ruche", async () => {
  const { service, inspectionsRepository } = creer();
  const premier = await service.addInspection(apiculteur, "SN-CASA-001", inspection());
  assert.equal(premier.created, true);
  assert.equal(premier.inspection.author_id, apiculteur.id);

  const rejeu = await service.addInspection(apiculteur, "SN-CASA-001", inspection());
  assert.equal(rejeu.created, false);
  assert.equal(inspectionsRepository.rows.size, 1);

  await assert.rejects(
    service.addInspection(apiculteur, "SN-CASA-002", inspection({ hive_id: undefined })),
    ConflictError,
  );
});
