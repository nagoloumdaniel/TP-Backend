import { test } from "node:test";
import assert from "node:assert/strict";
import { validate } from "../src/middlewares/validate.js";
import { ValidationError } from "../src/errors.js";
import { hivesQuerySchema, inspectionSchema, measureSchema, paginationSchema } from "../src/validators/schemas.js";

// Exécute le middleware sans Express : retourne req.validated ou lève ValidationError.
function run(schema, data, source = "body") {
  const req = { [source]: data };
  validate(schema, source)(req, {}, () => {});
  return req.validated;
}

const mesure = (extra = {}) => ({ timestamp: "2026-10-31T00:00:00Z", weight_kg: 40, ...extra });
const inspection = (extra = {}) => ({
  id: "3f2b8c1e-5a4d-4e7b-9c1a-0d2e4f6a8b10",
  inspected_at: "2026-11-01T08:00:00Z",
  colony_status: "normale",
  ...extra,
});
const message = (fn) => {
  try {
    fn();
  } catch (e) {
    return e.message;
  }
  return null;
};

test("mesure : refuse un poids hors plage", () => {
  assert.throws(() => run(measureSchema, mesure({ weight_kg: 500 })), ValidationError);
});

test("mesure : cumule les erreurs dans un seul message en français", () => {
  assert.equal(
    message(() => run(measureSchema, mesure({ weight_kg: 500, humidity_pct: 120 }))),
    "weight_kg doit être inférieur ou égal à 150. humidity_pct doit être inférieur ou égal à 100.",
  );
});

test("mesure : corps absent = champs obligatoires signalés", () => {
  assert.equal(
    message(() => run(measureSchema, undefined)),
    "timestamp est obligatoire. weight_kg est obligatoire.",
  );
});

test("mesure : refuse chaque champ hors plage et le texte à la place d'un nombre", () => {
  const horsPlage = { position_lat: 91, position_lon: -181, temp_internal_c: 61, temp_external_c: -21, humidity_pct: 101, acoustic_activity_score: 1.1, battery_pct: -1 };
  for (const [champ, valeur] of Object.entries(horsPlage)) {
    assert.throws(() => run(measureSchema, mesure({ [champ]: valeur })), ValidationError, champ);
  }
  assert.throws(() => run(measureSchema, mesure({ weight_kg: "abc" })), ValidationError);
});

test("mesure : accepte les bornes exactes et les valeurs null", () => {
  const v = run(measureSchema, mesure({ weight_kg: 150, humidity_pct: 0, acoustic_activity_score: 1, battery_pct: null }));
  assert.equal(v.weight_kg, 150);
  assert.equal(v.battery_pct, null);
});

test("mesure : garde le timestamp en texte ISO", () => {
  assert.equal(run(measureSchema, mesure()).timestamp, "2026-10-31T00:00:00Z");
});

test("pagination : défauts 50 et 0, conversion des chaînes", () => {
  assert.deepEqual(run(paginationSchema, {}, "query"), { limit: 50, offset: 0 });
  assert.deepEqual(run(paginationSchema, { limit: "10", offset: "5" }, "query"), { limit: 10, offset: 5 });
});

test("pagination : refuse limit abc, 0, 501 et offset négatif", () => {
  assert.equal(message(() => run(paginationSchema, { limit: "abc" }, "query")), "limit doit être un nombre.");
  for (const q of [{ limit: "0" }, { limit: "501" }, { offset: "-1" }]) {
    assert.throws(() => run(paginationSchema, q, "query"), ValidationError);
  }
});

test("liste des ruches : site_id facultatif", () => {
  assert.deepEqual(run(hivesQuerySchema, {}, "query"), {});
  assert.deepEqual(run(hivesQuerySchema, { site_id: "SN-CASA" }, "query"), { site_id: "SN-CASA" });
});

test("inspection : accepte un corps valide", () => {
  assert.equal(run(inspectionSchema, inspection({ queen_present: true, observations: "RAS" })).colony_status, "normale");
});

test("inspection : refuse un champ non déclaré (author_id)", () => {
  assert.equal(
    message(() => run(inspectionSchema, inspection({ author_id: "u1" }))),
    "author_id n'est pas un champ autorisé.",
  );
});

test("inspection : refuse une date dans le futur", () => {
  assert.equal(
    message(() => run(inspectionSchema, inspection({ inspected_at: "2099-01-01T00:00:00Z" }))),
    "inspected_at ne peut pas être dans le futur.",
  );
});

test("inspection : refuse id non UUID, statut inconnu, observations trop longues", () => {
  assert.throws(() => run(inspectionSchema, inspection({ id: "pas-un-uuid" })), ValidationError);
  assert.throws(() => run(inspectionSchema, inspection({ colony_status: "excellente" })), ValidationError);
  assert.throws(() => run(inspectionSchema, inspection({ observations: "x".repeat(2001) })), ValidationError);
});
