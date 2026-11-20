export function createMemoryMeasuresRepository() {
  const measures = [];
  return {
    add(mesure) {
      measures.push(mesure);
      return mesure;
    },
    // Même contrat que la version PostgreSQL : plus récente d'abord, puis OFFSET/LIMIT.
    findByHive(hiveId, { limit = 50, offset = 0 } = {}) {
      return measures
        .filter((m) => m.hive_id === hiveId)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(offset, offset + limit);
    },
  };
}
