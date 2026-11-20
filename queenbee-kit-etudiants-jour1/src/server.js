import { config } from "./config.js";
import { createApp } from "./app.js";
import { createPostgresRepositories } from "./repositories/postgres/index.js";
import { createPool } from "./db.js";

const pool = createPool();
try {
  await pool.query("SELECT 1"); // un message clair maintenant, plutôt qu'une erreur à la 1re requête
} catch (err) {
  console.error(`Impossible de joindre PostgreSQL sur ${config.db.host}:${config.db.port} : ${err.message || err.code}`);
  process.exit(1);
}

const app = createApp(createPostgresRepositories(pool));

app.listen(config.port, () => {
  console.log(`API Queen Bee sur http://localhost:${config.port}`);
});
