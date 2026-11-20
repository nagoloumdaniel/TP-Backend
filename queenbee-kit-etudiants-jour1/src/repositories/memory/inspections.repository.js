export function createMemoryInspectionsRepository() {
  const inspections = [];
  return {
    add(inspection) {
      inspections.push(inspection);
      return inspection;
    },
    findByHive: (hiveId) => inspections.filter((i) => i.hive_id === hiveId),
    existsById: (id) => inspections.some((i) => i.id === id),
  };
}
