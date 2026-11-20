import { ValidationError } from "../errors.js";
import { MESSAGES } from "../validators/messages.js";

// validate(schema) vérifie req.body ; validate(schema, "query") vérifie req.query.
export function validate(schema, source = "body") {
  return function validateRequest(req, res, next) {
    const { value, error } = schema.validate(req[source] ?? {}, {
      abortEarly: false, // toutes les erreurs d'un coup, pas seulement la première
      messages: MESSAGES, // messages en français
      errors: { wrap: { label: false } }, // « weight_kg doit… » et non « "weight_kg" doit… »
    });
    if (error) {
      throw new ValidationError(error.details.map((d) => d.message).join(" "));
    }
    // Avec Express 5, req.query est en lecture seule : les données converties vont ailleurs.
    req.validated = value;
    next();
  };
}
