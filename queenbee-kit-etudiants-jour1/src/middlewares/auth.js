import { UnauthorizedError, ForbiddenError } from "../errors.js";

// requireAuth a besoin du service d'authentification : il est créé dans app.js (injection).
export function createRequireAuth(authService) {
  return function requireAuth(req, res, next) {
    const [scheme, token] = (req.get("Authorization") ?? "").split(" ");
    if (scheme !== "Bearer" || !token) {
      throw new UnauthorizedError("Jeton d'accès manquant : ajoutez l'en-tête Authorization: Bearer <jeton>.");
    }
    req.user = authService.verifyAccessToken(token);
    next();
  };
}

export function requireRole(...roles) {
  return function checkRole(req, res, next) {
    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError(`Action réservée aux rôles suivants : ${roles.join(", ")}.`);
    }
    next();
  };
}
