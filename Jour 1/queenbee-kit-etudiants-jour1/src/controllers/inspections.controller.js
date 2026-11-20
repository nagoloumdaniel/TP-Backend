export function createInspectionsController({ inspectionsService }) {
  return {
    // Toujours 200 si le lot est bien formé : le détail de chaque élément est dans la réponse.
    sync: async (req, res) => res.json(await inspectionsService.syncInspections(req.user, req.validated.inspections)),
  };
}
