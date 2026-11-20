import { test } from "node:test";
import assert from "node:assert/strict";
import { canAccessHive, createHivesService } from "../src/services/hives.service.js";
import { ForbiddenError, NotFoundError } from "../src/errors.js";

const RUCHE = { id: "SN-CASA-001", site_id: "SN-CASA", owner_id: "u-api1" };

test("canAccessHive applique le tableau des rôles", () => {
  assert.equal(canAccessHive({ role: "admin" }, RUCHE), true);
  assert.equal(canAccessHive({ role: "gestionnaire" }, RUCHE), true);
  assert.equal(canAccessHive({ role: "coordinateur", site_id: "SN-CASA" }, RUCHE), true);
  assert.equal(canAccessHive({ role: "coordinateur", site_id: "CI-AGBO" }, RUCHE), false);
  assert.equal(canAccessHive({ role: "apiculteur", id: "u-api1" }, RUCHE), true);
  assert.equal(canAccessHive({ role: "apiculteur", id: "u-api2" }, RUCHE), false);
  assert.equal(canAccessHive({ role: "inconnu" }, RUCHE), false);
});

function service() {
  const appels = [];
  const hivesRepository = {
    async findAll(filtre) {
      appels.push(filtre);
      return [];
    },
    async findById(id) {
      return id === RUCHE.id ? RUCHE : null;
    },
  };
  return { svc: createHivesService({ hivesRepository }), appels };
}

test("getHive : 404 avant 403", async () => {
  const { svc } = service();
  const api2 = { role: "apiculteur", id: "u-api2" };
  await assert.rejects(svc.getHive(api2, "XX-NOPE-999"), NotFoundError);
  await assert.rejects(svc.getHive(api2, RUCHE.id), ForbiddenError);
  assert.equal((await svc.getHive({ role: "admin" }, RUCHE.id)).id, RUCHE.id);
});

test("listHives : un coordinateur est limité à son site, un autre site est refusé", async () => {
  const { svc, appels } = service();
  const coord = { role: "coordinateur", site_id: "SN-CASA" };
  await svc.listHives(coord, {});
  assert.deepEqual(appels.at(-1), { site_id: "SN-CASA" });
  await assert.rejects(svc.listHives(coord, { site_id: "CI-AGBO" }), ForbiddenError);
});

test("listHives : un apiculteur ne voit que ses ruches", async () => {
  const { svc, appels } = service();
  await svc.listHives({ role: "apiculteur", id: "u-api1" }, {});
  assert.equal(appels.at(-1).owner_id, "u-api1");
});
