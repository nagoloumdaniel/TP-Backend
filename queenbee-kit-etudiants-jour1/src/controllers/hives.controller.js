// Les données arrivent déjà validées dans req.validated (voir middlewares/validate.js).
export function createHivesController({ hivesService, measuresService, inspectionsService }) {
  return {
    list: async (req, res) => res.json(await hivesService.list(req.validated)),
    get: async (req, res) => res.json(await hivesService.getById(req.params.id)),
    addMeasure: async (req, res) => res.status(201).json(await measuresService.add(req.params.id, req.validated)),
    listMeasures: async (req, res) => res.json(await measuresService.list(req.params.id, req.validated)),
    listInspections: async (req, res) => res.json(await inspectionsService.list(req.params.id)),
    addInspection: async (req, res) => res.status(201).json(await inspectionsService.add(req.params.id, req.validated)),
  };
}
