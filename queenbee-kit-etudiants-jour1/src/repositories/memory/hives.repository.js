const RUCHES_DEPART = [
  { id: "SN-CASA-001", site_id: "SN-CASA", status: "active" },
  { id: "SN-CASA-002", site_id: "SN-CASA", status: "active" },
  { id: "SN-CASA-003", site_id: "SN-CASA", status: "active" },
  { id: "CI-AGBO-001", site_id: "CI-AGBO", status: "active" },
  { id: "CI-AGBO-002", site_id: "CI-AGBO", status: "active" },
];

export function createMemoryHivesRepository(initial = RUCHES_DEPART) {
  const hives = [...initial];
  return {
    findAll: () => hives,
    findBySite: (siteId) => hives.filter((h) => h.site_id === siteId),
    findById: (id) => hives.find((h) => h.id === id),
  };
}
