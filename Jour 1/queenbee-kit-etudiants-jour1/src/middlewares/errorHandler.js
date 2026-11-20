import { sendProblem } from "../utils/problem.js";
import { AppError } from "../errors.js";

// Route inconnue : un 404 au format RFC 9457, au lieu de la page HTML d'Express.
export function notFoundHandler(req, res) {
  sendProblem(res, 404, `Aucune route ne correspond à ${req.method} ${req.originalUrl}.`);
}

// Point de passage unique de toutes les erreurs. Les quatre paramètres sont obligatoires :
// c'est à eux qu'Express reconnaît un intergiciel d'erreur.
// Le message d'une erreur PostgreSQL ne part jamais dans la réponse : il cite tables et contraintes.
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    // Journal des requêtes interdites : chaque refus laisse une trace.
    if (err.status === 401 || err.status === 403) {
      console.warn(`[accès refusé] ${err.status} ${req.method} ${req.originalUrl} ip=${req.ip} utilisateur=${req.user?.id ?? "-"}`);
    }
    if (err.status === 401) {
      res.set("WWW-Authenticate", 'Bearer realm="queenbee"'); // schéma attendu (RFC 6750)
    }
    return sendProblem(res, err.status, err.message);
  }
  if (err.type === "entity.parse.failed") {
    return sendProblem(res, 400, "Le corps de la requête n'est pas un JSON valide.");
  }
  if (err.type === "entity.too.large") {
    return sendProblem(res, 413, "Le corps de la requête dépasse 1 Mo.");
  }
  if (err.code === "23505") return sendProblem(res, 409, "Cette ressource existe déjà.");
  if (["23503", "23514", "22P02"].includes(err.code)) {
    return sendProblem(res, 400, "Les données envoyées sont refusées par la base.");
  }
  console.error(err); // la pile va dans le journal du serveur, jamais dans la réponse
  sendProblem(res, 500, "Une erreur interne est survenue.");
}
