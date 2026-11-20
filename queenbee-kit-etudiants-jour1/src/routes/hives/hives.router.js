import { Router } from "express";
import { validate } from "../../middlewares/validate.js";
import { hivesQuerySchema, inspectionSchema, measureSchema, paginationSchema } from "../../validators/schemas.js";

export function createHivesRouter(controller) {
  const router = Router();
  router.get("/", validate(hivesQuerySchema, "query"), controller.list);
  router.get("/:id", controller.get);
  router.post("/:id/measures", validate(measureSchema), controller.addMeasure);
  router.get("/:id/measures", validate(paginationSchema, "query"), controller.listMeasures);
  router.get("/:id/inspections", controller.listInspections);
  router.post("/:id/inspections", validate(inspectionSchema), controller.addInspection);
  return router;
}
