export function createHivesController({ hivesService, measuresService, inspectionsService }) {
  return {
    list: async (req, res) => res.json(await hivesService.list(req.query)),
    get: async (req, res) => res.json(await hivesService.getById(req.params.id)),
    addMeasure: async (req, res) => res.status(201).json(await measuresService.add(req.params.id, req.body)),
    listMeasures: async (req, res) => res.json(await measuresService.list(req.params.id, req.query)),
    listInspections: async (req, res) => res.json(await inspectionsService.list(req.params.id)),
    addInspection: async (req, res) => res.status(201).json(await inspectionsService.add(req.params.id, req.body)),
  };
}
