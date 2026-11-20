const COLONNES = "id, hive_id, inspected_at, queen_present, colony_status, observations";

export function createInspectionsRepository(pool) {
  return {
    async add(i) {
      const { rows } = await pool.query(
        `INSERT INTO inspections (id, hive_id, author_id, inspected_at, queen_present, colony_status, observations)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING ${COLONNES}`,
        [i.id, i.hive_id, i.author_id, i.inspected_at, i.queen_present ?? null, i.colony_status, i.observations ?? null],
      );
      return rows[0];
    },
    async findByHive(hiveId) {
      const { rows } = await pool.query(
        `SELECT ${COLONNES} FROM inspections WHERE hive_id = $1 ORDER BY inspected_at DESC`,
        [hiveId],
      );
      return rows;
    },
    async existsById(id) {
      const { rowCount } = await pool.query("SELECT 1 FROM inspections WHERE id = $1", [id]);
      return rowCount > 0;
    },
  };
}
