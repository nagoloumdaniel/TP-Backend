// Les données arrivent déjà validées dans req.validated (voir middlewares/validate.js).
// req.user vient du jeton (middlewares/auth.js) et passe toujours en premier argument.
export function createHivesController({ hivesService, measuresService, inspectionsService }) {
  return {
    list: async (req, res) => res.json(await hivesService.listHives(req.user, req.validated)),
    get: async (req, res) => res.json(await hivesService.getHive(req.user, req.params.id)),
    addMeasure: async (req, res) =>
      res.status(201).json(await measuresService.addMeasure(req.user, req.params.id, req.validated)),
    listMeasures: async (req, res) =>
      res.json(await measuresService.listMeasures(req.user, req.params.id, req.validated)),
    listInspections: async (req, res) => res.json(await inspectionsService.listInspections(req.user, req.params.id)),
    addInspection: async (req, res) =>
      res.status(201).json(await inspectionsService.addInspection(req.user, req.params.id, req.validated)),
  };
}
