import { ConflictError, ValidationError } from "../errors.js";

export function createInspectionsService({ hivesService, inspectionsRepository }) {
  return {
    async listInspections(user, hiveId) {
      const hive = await hivesService.getHive(user, hiveId);
      return inspectionsRepository.findByHive(hive.id);
    },

    // Le format des champs est vérifié par Joi ; le service garde les règles qui dépendent de la ruche et de la base.
    async addInspection(user, hiveId, data) {
      const hive = await hivesService.getHive(user, hiveId);
      if (data.hive_id !== undefined && data.hive_id !== hive.id) {
        throw new ValidationError("Le champ hive_id ne correspond pas à la ruche du chemin.");
      }
      if (await inspectionsRepository.existsById(data.id)) {
        throw new ConflictError("Une inspection porte déjà cet identifiant.");
      }
      // L'auteur est l'utilisateur du jeton, jamais une valeur du corps.
      return inspectionsRepository.add({ ...data, hive_id: hive.id, author_id: user.id });
    },
  };
}
