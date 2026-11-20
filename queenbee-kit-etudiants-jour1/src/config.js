const ENVIRONNEMENTS = ["development", "test", "production"];

export function loadConfig(env = process.env) {
  const brut = env.PORT ?? "3000";
  const port = /^\d+$/.test(brut) ? Number(brut) : NaN;
  if (!(port >= 1 && port <= 65535)) {
    throw new Error(`PORT invalide : "${brut}". Attendu : un entier entre 1 et 65535.`);
  }

  const nodeEnv = env.NODE_ENV ?? "development";
  if (!ENVIRONNEMENTS.includes(nodeEnv)) {
    throw new Error(`NODE_ENV invalide : "${nodeEnv}". Attendu : ${ENVIRONNEMENTS.join(", ")}.`);
  }

  return { port, nodeEnv };
}
