const ENVIRONNEMENTS = ["development", "test", "production"];
const STOCKAGES = ["postgres", "memory"];

function entierBorne(nom, brut, max) {
  const n = /^\d+$/.test(brut) ? Number(brut) : NaN;
  if (!(n >= 1 && n <= max)) {
    throw new Error(`${nom} invalide : "${brut}". Attendu : un entier entre 1 et ${max}.`);
  }
  return n;
}

export function loadConfig(env = process.env) {
  const port = entierBorne("PORT", env.PORT ?? "3000", 65535);

  const nodeEnv = env.NODE_ENV ?? "development";
  if (!ENVIRONNEMENTS.includes(nodeEnv)) {
    throw new Error(`NODE_ENV invalide : "${nodeEnv}". Attendu : ${ENVIRONNEMENTS.join(", ")}.`);
  }

  const storage = env.STORAGE ?? "postgres";
  if (!STOCKAGES.includes(storage)) {
    throw new Error(`STORAGE invalide : "${storage}". Attendu : ${STOCKAGES.join(" ou ")}.`);
  }

  // Aucune valeur par défaut pour un mot de passe.
  const password = env.DB_PASSWORD ?? "";
  if (storage === "postgres" && password === "") {
    throw new Error("DB_PASSWORD est obligatoire quand STORAGE vaut postgres (voir .env.example).");
  }

  return {
    port,
    nodeEnv,
    storage,
    db: {
      host: env.DB_HOST ?? "localhost",
      port: entierBorne("DB_PORT", env.DB_PORT ?? "5432", 65535),
      user: env.DB_USER ?? "queenbee",
      password,
      database: env.DB_NAME ?? "queenbee",
      poolMax: entierBorne("DB_POOL_MAX", env.DB_POOL_MAX ?? "10", 100),
    },
  };
}

// Chargée une seule fois ; une configuration invalide arrête le démarrage avec un message clair.
function charger() {
  try {
    return loadConfig();
  } catch (err) {
    console.error(`Démarrage impossible : ${err.message}`);
    process.exit(1);
  }
}

export const config = charger();
