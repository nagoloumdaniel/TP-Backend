const ENVIRONNEMENTS = ["development", "test", "production"];

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

  // Aucune valeur par défaut pour un mot de passe ni pour un secret.
  const password = env.DB_PASSWORD ?? "";
  if (password === "") {
    throw new Error("DB_PASSWORD est obligatoire (voir .env.example).");
  }

  const accessSecret = env.JWT_ACCESS_SECRET ?? "";
  const refreshSecret = env.JWT_REFRESH_SECRET ?? "";
  if (accessSecret === "") throw new Error("JWT_ACCESS_SECRET est obligatoire (voir .env.example).");
  if (refreshSecret === "") throw new Error("JWT_REFRESH_SECRET est obligatoire (voir .env.example).");
  if (accessSecret === refreshSecret) {
    throw new Error("JWT_ACCESS_SECRET et JWT_REFRESH_SECRET doivent être différents.");
  }

  return {
    port,
    nodeEnv,
    auth: {
      accessSecret,
      refreshSecret,
      accessTtl: env.JWT_ACCESS_TTL ?? "15m",
      refreshTtl: env.JWT_REFRESH_TTL ?? "7d",
      maxFailedLogins: 5,
      lockMinutes: 15,
    },
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
