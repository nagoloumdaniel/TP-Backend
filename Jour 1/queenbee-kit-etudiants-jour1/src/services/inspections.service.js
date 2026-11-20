import { AppError, ConflictError, ValidationError } from "../errors.js";

export function createInspectionsService({ hivesService, inspectionsRepository }) {
  // L'auteur vient du jeton, jamais du corps.
  function toInspection(user, hive, data) {
    return {
      id: data.id,
      hive_id: hive.id,
      author_id: user.id,
      inspected_at: data.inspected_at,
      colony_status: data.colony_status,
      queen_present: data.queen_present ?? null,
      observations: data.observations ?? null,
    };
  }

  // Traite UNE inspection du lot, sans jamais lever d'erreur métier.
  async function syncOne(user, item) {
    try {
      const hive = await hivesService.getHive(user, item.hive_id);
      const inspection = toInspection(user, hive, item);

      if (item.version === undefined) {
        // Nouvelle inspection, saisie hors connexion.
        const { inspection: stored, created } = await inspectionsRepository.insertIfAbsent(inspection);
        if (created) return { id: item.id, status: "created", version: stored.version };
        if (stored.hive_id !== hive.id) {
          return {
            id: item.id,
            status: "rejected",
            detail: "Cet identifiant est déjà utilisé par une inspection d'une autre ruche.",
          };
        }
        return { id: item.id, status: "unchanged", version: stored.version };
      }

      // Une version : modification. Règle retenue : le serveur l'emporte.
      const updated = await inspectionsRepository.updateIfVersion(inspection, item.version);
      if (updated) return { id: item.id, status: "updated", version: updated.version };

      const current = await inspectionsRepository.findById(item.id);
      if (!current || current.hive_id !== hive.id) {
        return {
          id: item.id,
          status: "rejected",
          detail: "Inspection inconnue pour cette ruche : envoyez-la sans version pour la créer.",
        };
      }
      return {
        id: item.id,
        status: "conflict",
        detail: `L'inspection a été modifiée entre-temps : version ${current.version} sur le serveur, ${item.version} sur l'appareil.`,
        current,
      };
    } catch (err) {
      if (err instanceof AppError) return { id: item.id, status: "rejected", detail: err.message };
      throw err; // toute autre erreur est un bug
    }
  }

  return {
    async listInspections(user, hiveId) {
      const hive = await hivesService.getHive(user, hiveId);
      return inspectionsRepository.findByHive(hive.id);
    },

    // Renvoie { inspection, created } : le contrôleur répond 201 si created, 200 sinon.
    async addInspection(user, hiveId, data) {
      const hive = await hivesService.getHive(user, hiveId);
      if (data.hive_id !== undefined && data.hive_id !== hive.id) {
        throw new ValidationError(`Le hive_id du corps (${data.hive_id}) ne correspond pas à la ruche ${hive.id}.`);
      }
      const result = await inspectionsRepository.insertIfAbsent(toInspection(user, hive, data));
      if (!result.created && result.inspection.hive_id !== hive.id) {
        throw new ConflictError(`L'identifiant ${data.id} est déjà utilisé par une inspection d'une autre ruche.`);
      }
      return result;
    },

    // Le lot est traité dans l'ordre, un élément après l'autre : un refus n'arrête pas les suivants.
    async syncInspections(user, items) {
      const summary = { created: 0, unchanged: 0, updated: 0, conflict: 0, rejected: 0 };
      const results = [];
      for (const item of items) {
        const result = await syncOne(user, item);
        summary[result.status] += 1;
        results.push(result);
      }
      return { summary, results };
    },
  };
}
