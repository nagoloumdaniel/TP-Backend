import { ConflictError, ValidationError } from "../errors.js";

export function createInspectionsService({ hivesService, inspectionsRepository }) {
  return {
    async list(hiveId) {
      const hive = await hivesService.getById(hiveId);
      return inspectionsRepository.findByHive(hive.id);
    },

    // Le format des champs est vérifié par Joi ; le service garde les règles qui dépendent de la ruche et de la base.
    async add(hiveId, data) {
      const hive = await hivesService.getById(hiveId);
      if (data.hive_id !== undefined && data.hive_id !== hive.id) {
        throw new ValidationError("Le champ hive_id ne correspond pas à la ruche du chemin.");
      }
      if (await inspectionsRepository.existsById(data.id)) {
        throw new ConflictError("Une inspection porte déjà cet identifiant.");
      }
      return inspectionsRepository.add({ ...data, hive_id: hive.id });
    },
  };
}
