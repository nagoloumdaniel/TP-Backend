import { NotFoundError } from "../errors.js";

export function createHivesService({ hivesRepository }) {
  return {
    async list({ site_id } = {}) {
      return !site_id ? hivesRepository.findAll() : hivesRepository.findBySite(site_id);
    },
    async getById(id) {
      const hive = await hivesRepository.findById(id);
      if (!hive) throw new NotFoundError(`Aucune ruche ne porte l'identifiant ${id}.`);
      return hive;
    },
  };
}
