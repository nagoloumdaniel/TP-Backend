import { ConflictError, ValidationError } from "../errors.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_ISO = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/;
const ETATS_COLONIE = ["forte", "normale", "faible", "morte"];

export function createInspectionsService({ hivesService, inspectionsRepository }) {
  return {
    async list(hiveId) {
      const hive = await hivesService.getById(hiveId);
      return inspectionsRepository.findByHive(hive.id);
    },

    async add(hiveId, body) {
      const hive = await hivesService.getById(hiveId);
      const b = body ?? {};
      if (typeof b.id !== "string" || !UUID.test(b.id)) {
        throw new ValidationError("Le champ id est obligatoire et doit être un UUID.");
      }
      if (typeof b.inspected_at !== "string" || !DATE_ISO.test(b.inspected_at) || Number.isNaN(Date.parse(b.inspected_at))) {
        throw new ValidationError("Le champ inspected_at est obligatoire et doit être une date ISO 8601.");
      }
      if (!ETATS_COLONIE.includes(b.colony_status)) {
        throw new ValidationError(`Le champ colony_status est obligatoire : ${ETATS_COLONIE.join(", ")}.`);
      }
      if (b.queen_present !== undefined && typeof b.queen_present !== "boolean") {
        throw new ValidationError("Le champ queen_present doit être un booléen.");
      }
      if (b.observations !== undefined && typeof b.observations !== "string") {
        throw new ValidationError("Le champ observations doit être un texte.");
      }
      if (await inspectionsRepository.existsById(b.id)) {
        throw new ConflictError("Une inspection porte déjà cet identifiant.");
      }

      // L'id est choisi par l'application mobile ; seuls les champs du contrat sont conservés.
      const inspection = { id: b.id, hive_id: hive.id, inspected_at: b.inspected_at, colony_status: b.colony_status };
      if (b.queen_present !== undefined) inspection.queen_present = b.queen_present;
      if (b.observations !== undefined) inspection.observations = b.observations;
      return inspectionsRepository.add(inspection);
    },
  };
}
