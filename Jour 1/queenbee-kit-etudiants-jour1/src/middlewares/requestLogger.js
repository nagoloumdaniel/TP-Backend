// Une ligne par requête : date, méthode, URL complète, statut, durée.
export function requestLogger(req, res, next) {
  const debut = performance.now();
  res.on("finish", () => {
    const duree = Math.round(performance.now() - debut);
    console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode} ${duree} ms`);
  });
  next();
}
