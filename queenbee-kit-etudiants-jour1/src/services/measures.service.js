import { ValidationError } from "../errors.js";

// Les plages physiques et les types sont vérifiés en amont par Joi (validators/schemas.js).
// Ici ne restent que les règles qui exigent de connaître la ruche et l'utilisateur.
export function createMeasuresService({ hivesService, measuresRepository }) {
  return {
    async addMeasure(user, hiveId, data) {
      const hive = await hivesService.getHive(user, hiveId);
      if (data.hive_id !== undefined && data.hive_id !== hive.id) {
        throw new ValidationError("Le champ hive_id ne correspond pas à la ruche du chemin.");
      }
      // Le timestamp est celui de la trame (instant de la prise par le capteur), pas celui de la réception.
      return measuresRepository.add({ ...data, hive_id: hive.id, site_id: hive.site_id });
    },

    async listMeasures(user, hiveId, { limit, offset }) {
      const hive = await hivesService.getHive(user, hiveId);
      // Tri (plus récente d'abord) et pagination sont faits par le dépôt : en SQL, ORDER BY + LIMIT/OFFSET.
      const items = await measuresRepository.findByHive(hive.id, { limit, offset });
      return { items, limit, offset };
    },
  };
}
