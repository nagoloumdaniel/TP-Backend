// Intitulés RFC 9457 : un titre par code, le même pour toutes les erreurs de ce code.
const TITLES = {
  400: "Requête invalide",
  404: "Ressource introuvable",
  409: "Conflit",
  413: "Contenu trop volumineux",
  500: "Erreur interne",
};

export function sendProblem(res, status, detail) {
  res
    .status(status)
    .type("application/problem+json")
    .json({ type: "about:blank", title: TITLES[status] ?? "Erreur", status, detail });
}
