import { NotFoundError } from "../errors.js";

export function createHivesService({ hivesRepository }) {
  return {
    list({ site_id } = {}) {
      return !site_id ? hivesRepository.findAll() : hivesRepository.findBySite(site_id);
    },
    getById(id) {
      const hive = hivesRepository.findById(id);
      if (!hive) throw new NotFoundError(`Aucune ruche ne porte l'identifiant ${id}.`);
      return hive;
    },
  };
}
