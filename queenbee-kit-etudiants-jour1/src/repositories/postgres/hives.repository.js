const COLONNES = "id, site_id, ref_lat, ref_lon, status";

export function createHivesRepository(pool) {
  return {
    async findAll() {
      const { rows } = await pool.query(`SELECT ${COLONNES} FROM hives ORDER BY id`);
      return rows;
    },
    async findBySite(siteId) {
      const { rows } = await pool.query(`SELECT ${COLONNES} FROM hives WHERE site_id = $1 ORDER BY id`, [siteId]);
      return rows;
    },
    async findById(id) {
      const { rows } = await pool.query(`SELECT ${COLONNES} FROM hives WHERE id = $1`, [id]);
      return rows[0] ?? null;
    },
  };
}
