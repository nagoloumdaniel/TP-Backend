import { NotFoundError, ForbiddenError } from "../errors.js";

// Règle d'accès à une ruche, selon le rôle (tableau du TP 7).
export function canAccessHive(user, hive) {
  switch (user.role) {
    case "admin":
    case "gestionnaire":
      return true;
    case "coordinateur":
      return hive.site_id === user.site_id;
    case "apiculteur":
      return hive.owner_id === user.id;
    default:
      return false;
  }
}

export function createHivesService({ hivesRepository }) {
  return {
    async listHives(user, { site_id } = {}) {
      if (user.role === "coordinateur") {
        if (site_id && site_id !== user.site_id) {
          throw new ForbiddenError(`Vous n'avez pas accès au site ${site_id}.`);
        }
        return hivesRepository.findAll({ site_id: user.site_id });
      }
      if (user.role === "apiculteur") {
        return hivesRepository.findAll({ site_id, owner_id: user.id });
      }
      return hivesRepository.findAll({ site_id });
    },

    // 404 avant 403 : une ruche qui n'existe pas est signalée comme telle à tous les rôles.
    async getHive(user, id) {
      const hive = await hivesRepository.findById(id);
      if (!hive) throw new NotFoundError(`Aucune ruche ne porte l'identifiant ${id}.`);
      if (!canAccessHive(user, hive)) throw new ForbiddenError(`Vous n'avez pas accès à la ruche ${id}.`);
      return hive;
    },
  };
}
