import { createMemoryHivesRepository } from "./hives.repository.js";
import { createMemoryMeasuresRepository } from "./measures.repository.js";
import { createMemoryInspectionsRepository } from "./inspections.repository.js";

export function createMemoryRepositories() {
  return {
    hivesRepository: createMemoryHivesRepository(),
    measuresRepository: createMemoryMeasuresRepository(),
    inspectionsRepository: createMemoryInspectionsRepository(),
  };
}
