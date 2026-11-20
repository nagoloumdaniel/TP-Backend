import { loadConfig } from "./config.js";
import { createApp } from "./app.js";
import { createMemoryHivesRepository } from "./repositories/memory/hives.repository.js";
import { createMemoryMeasuresRepository } from "./repositories/memory/measures.repository.js";
import { createMemoryInspectionsRepository } from "./repositories/memory/inspections.repository.js";

let config;
try {
  config = loadConfig();
} catch (err) {
  console.error(`Démarrage impossible : ${err.message}`);
  process.exit(1);
}

const app = createApp({
  hivesRepository: createMemoryHivesRepository(),
  measuresRepository: createMemoryMeasuresRepository(),
  inspectionsRepository: createMemoryInspectionsRepository(),
});

app.listen(config.port, () => console.log(`API sur http://localhost:${config.port} (${config.nodeEnv})`));
