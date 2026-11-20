export function createHivesController({ hivesService, measuresService, inspectionsService }) {
  return {
    list: (req, res) => res.json(hivesService.list(req.query)),
    get: (req, res) => res.json(hivesService.getById(req.params.id)),
    addMeasure: (req, res) => res.status(201).json(measuresService.add(req.params.id, req.body)),
    listMeasures: (req, res) => res.json(measuresService.list(req.params.id, req.query)),
    listInspections: (req, res) => res.json(inspectionsService.list(req.params.id)),
    addInspection: (req, res) => res.status(201).json(inspectionsService.add(req.params.id, req.body)),
  };
}
