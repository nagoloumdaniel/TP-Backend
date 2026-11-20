import { ValidationError } from "../errors.js";

// Plages physiques (UC-CY02) : une mesure hors plage est une panne de capteur, pas une donnée.
export const PLAGES = {
  position_lat: [-90, 90],
  position_lon: [-180, 180],
  weight_kg: [0, 150],
  temp_internal_c: [-10, 60],
  temp_external_c: [-20, 60],
  humidity_pct: [0, 100],
  acoustic_activity_score: [0, 1],
  battery_pct: [0, 100],
};

// Entier décimal strict : "abc", "", "1.5" et "-1" sont refusés.
function parseEntier(valeur, defaut) {
  if (valeur === undefined) return defaut;
  return typeof valeur === "string" && /^\d+$/.test(valeur) ? Number(valeur) : NaN;
}

function verifierPlages(mesure) {
  for (const [champ, [min, max]] of Object.entries(PLAGES)) {
    const v = mesure[champ];
    if (v === undefined) continue;
    if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) {
      throw new ValidationError(`Le champ ${champ} doit être un nombre compris entre ${min} et ${max}.`);
    }
  }
}

export function createMeasuresService({ hivesService, measuresRepository }) {
  return {
    async add(hiveId, body) {
      const hive = await hivesService.getById(hiveId);
      const donnees = body ?? {};
      if (!donnees.timestamp || typeof donnees.weight_kg !== "number") {
        throw new ValidationError("Les champs timestamp et weight_kg (nombre) sont obligatoires.");
      }
      if (donnees.hive_id !== undefined && donnees.hive_id !== hive.id) {
        throw new ValidationError("Le champ hive_id ne correspond pas à la ruche du chemin.");
      }
      verifierPlages(donnees);

      // Le timestamp est celui de la trame (instant de la prise par le capteur), pas celui de la réception.
      return measuresRepository.add({ ...donnees, hive_id: hive.id, site_id: hive.site_id });
    },

    async list(hiveId, query = {}) {
      const hive = await hivesService.getById(hiveId);
      const limit = parseEntier(query.limit, 50);
      if (!(limit >= 1 && limit <= 500)) {
        throw new ValidationError("Le paramètre limit doit être un entier compris entre 1 et 500.");
      }
      const offset = parseEntier(query.offset, 0);
      if (Number.isNaN(offset)) {
        throw new ValidationError("Le paramètre offset doit être un entier positif ou nul.");
      }

      // Tri (plus récente d'abord) et pagination sont faits par le dépôt : en SQL, ORDER BY + LIMIT/OFFSET.
      const items = await measuresRepository.findByHive(hive.id, { limit, offset });
      return { items, limit, offset };
    },
  };
}
