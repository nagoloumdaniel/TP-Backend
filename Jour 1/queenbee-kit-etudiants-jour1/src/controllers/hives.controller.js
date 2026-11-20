// Les données arrivent déjà validées dans req.validated (voir middlewares/validate.js).
// req.user vient du jeton (middlewares/auth.js) et passe toujours en premier argument.
export function createHivesController({ hivesService, measuresService, inspectionsService }) {
  return {
    list: async (req, res) => res.json(await hivesService.listHives(req.user, req.validated)),
    get: async (req, res) => res.json(await hivesService.getHive(req.user, req.params.id)),
    // 201 à la création, 200 si la trame était déjà reçue : le rejeu n'est pas une erreur.
    addMeasure: async (req, res) => {
      const { measure, created } = await measuresService.addMeasure(req.user, req.params.id, req.validated);
      res.status(created ? 201 : 200).json(measure);
    },
    listMeasures: async (req, res) =>
      res.json(await measuresService.listMeasures(req.user, req.params.id, req.validated)),
    listInspections: async (req, res) => res.json(await inspectionsService.listInspections(req.user, req.params.id)),
    addInspection: async (req, res) => {
      const { inspection, created } = await inspectionsService.addInspection(req.user, req.params.id, req.validated);
      res.status(created ? 201 : 200).json(inspection);
    },
  };
}
