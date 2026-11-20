export function createMemoryMeasuresRepository() {
  const measures = [];
  return {
    add(mesure) {
      measures.push(mesure);
      return mesure;
    },
    findByHive: (hiveId) => measures.filter((m) => m.hive_id === hiveId),
  };
}
