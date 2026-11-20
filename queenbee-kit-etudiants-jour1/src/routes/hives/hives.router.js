import { Router } from "express";
import { requireRole } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { hivesQuerySchema, inspectionSchema, measureSchema, paginationSchema } from "../../validators/schemas.js";

export function createHivesRouter({ controller, requireAuth }) {
  const router = Router();
  router.use(requireAuth); // toutes les routes de ruches exigent un jeton valide
  router.get("/", validate(hivesQuerySchema, "query"), controller.list);
  router.get("/:id", controller.get);
  // Les capteurs sont gérés par l'administration : seul l'admin envoie des mesures.
  router.post("/:id/measures", requireRole("admin"), validate(measureSchema), controller.addMeasure);
  router.get("/:id/measures", validate(paginationSchema, "query"), controller.listMeasures);
  router.get("/:id/inspections", controller.listInspections);
  router.post(
    "/:id/inspections",
    requireRole("apiculteur", "coordinateur"),
    validate(inspectionSchema),
    controller.addInspection,
  );
  return router;
}
