import Joi from "joi";

// raw() garde la date en texte ISO : Joi la vérifie sans la convertir en objet Date.
// Les paramètres de requête arrivent en chaînes : Joi les convertit et applique les défauts.
export const paginationSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(500).default(50),
  offset: Joi.number().integer().min(0).default(0),
});

export const hivesQuerySchema = Joi.object({
  site_id: Joi.string(),
});

// Trame du § 6.5, avec les plages physiques du TP 4. Un champ facultatif peut valoir null.
export const measureSchema = Joi.object({
  hive_id: Joi.string(),
  site_id: Joi.string(),
  timestamp: Joi.date().iso().raw().required(),
  position_lat: Joi.number().min(-90).max(90).allow(null),
  position_lon: Joi.number().min(-180).max(180).allow(null),
  weight_kg: Joi.number().min(0).max(150).required(),
  temp_internal_c: Joi.number().min(-10).max(60).allow(null),
  temp_external_c: Joi.number().min(-20).max(60).allow(null),
  humidity_pct: Joi.number().integer().min(0).max(100).allow(null),
  acoustic_activity_score: Joi.number().min(0).max(1).allow(null),
  battery_pct: Joi.number().integer().min(0).max(100).allow(null),
});

// Joi.object refuse tout champ non déclaré : un client ne peut pas glisser un author_id.
export const inspectionSchema = Joi.object({
  id: Joi.string().guid().required(),
  hive_id: Joi.string(),
  inspected_at: Joi.date().iso().max("now").raw().required(),
  colony_status: Joi.string().valid("forte", "normale", "faible", "morte").required(),
  queen_present: Joi.boolean().allow(null),
  observations: Joi.string().max(2000).allow("", null),
});

// tlds: { allow: false } : sinon les adresses en .test du jeu de données seraient refusées.
const email = Joi.string().email({ tlds: { allow: false } }).max(254);

export const loginSchema = Joi.object({
  email: email.required(),
  password: Joi.string().required(),
});

export const refreshSchema = Joi.object({
  refresh_token: Joi.string().required(),
});

export const registerSchema = Joi.object({
  email: email.required(),
  password: Joi.string().min(12).max(72).required(), // bcrypt ignore tout au-delà de 72 octets
  role: Joi.string().valid("apiculteur", "coordinateur", "gestionnaire", "admin").required(),
  site_id: Joi.when("role", {
    is: Joi.valid("apiculteur", "coordinateur"),
    then: Joi.string().required(),
    otherwise: Joi.forbidden(),
  }),
});
