import express from "express";
import { requestLogger } from "./middlewares/requestLogger.js";
import { notFoundHandler, errorHandler } from "./middlewares/errorHandler.js";
import { createHivesService } from "./services/hives.service.js";
import { createMeasuresService } from "./services/measures.service.js";
import { createInspectionsService } from "./services/inspections.service.js";
import { createHivesController } from "./controllers/hives.controller.js";
import { createHivesRouter } from "./routes/hives/hives.router.js";

export function createApp({ hivesRepository, measuresRepository, inspectionsRepository }) {
  const hivesService = createHivesService({ hivesRepository });
  const measuresService = createMeasuresService({ hivesService, measuresRepository });
  const inspectionsService = createInspectionsService({ hivesService, inspectionsRepository });
  const controller = createHivesController({ hivesService, measuresService, inspectionsService });

  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use(requestLogger);

  app.get("/health", (req, res) => res.json({ status: "ok" }));
  app.use("/api/hives", createHivesRouter(controller));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
