import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UnauthorizedError } from "../errors.js";

const ISSUER = "queenbee-api";
const AUDIENCE = "queenbee";
const ALGORITHM = "HS256";
const INVALID_CREDENTIALS = "Adresse e-mail ou mot de passe incorrect.";
const INVALID_REFRESH = "Jeton de renouvellement invalide ou expiré.";
// Empreinte factice : une adresse inconnue prend le même temps qu'un vrai compte.
const DUMMY_HASH = bcrypt.hashSync("mot-de-passe-factice", 10);

export function createAuthService({ usersRepository, auth }) {
  function issueTokens(user) {
    const options = { algorithm: ALGORITHM, issuer: ISSUER, audience: AUDIENCE, subject: user.id };
    return {
      token_type: "Bearer",
      access_token: jwt.sign({ type: "access", role: user.role, site_id: user.site_id }, auth.accessSecret, {
        ...options,
        expiresIn: auth.accessTtl,
      }),
      refresh_token: jwt.sign({ type: "refresh" }, auth.refreshSecret, { ...options, expiresIn: auth.refreshTtl }),
    };
  }

  // Bonnes pratiques de la RFC 8725 : algorithme imposé, émetteur, audience et type vérifiés.
  function verify(token, secret, expectedType) {
    try {
      const payload = jwt.verify(token, secret, { algorithms: [ALGORITHM], issuer: ISSUER, audience: AUDIENCE });
      return payload.type === expectedType ? payload : null;
    } catch {
      return null; // signature fausse, jeton expiré, jeton modifié...
    }
  }

  function lockedMessage(lockedUntil) {
    const heure = new Date(lockedUntil).toISOString().slice(11, 16);
    return `Compte bloqué après ${auth.maxFailedLogins} échecs de connexion, jusqu'à ${heure} UTC.`;
  }

  const isLocked = (user) => user.locked_until && new Date(user.locked_until) > new Date();

  return {
    async login(email, password) {
      const user = await usersRepository.findByEmail(email.toLowerCase());
      if (!user) {
        await bcrypt.compare(password, DUMMY_HASH);
        throw new UnauthorizedError(INVALID_CREDENTIALS);
      }
      if (isLocked(user)) throw new UnauthorizedError(lockedMessage(user.locked_until));
      const passwordOk = await bcrypt.compare(password, user.password_hash);
      if (!passwordOk) {
        const lockedUntil = await usersRepository.recordFailedLogin(user.id, auth.maxFailedLogins, auth.lockMinutes);
        throw new UnauthorizedError(lockedUntil ? lockedMessage(lockedUntil) : INVALID_CREDENTIALS);
      }
      await usersRepository.resetFailedLogins(user.id);
      return issueTokens(user);
    },

    async refresh(refreshToken) {
      const payload = verify(refreshToken, auth.refreshSecret, "refresh");
      if (!payload) throw new UnauthorizedError(INVALID_REFRESH);
      // Relecture en base : le rôle a pu changer, le compte a pu être bloqué ou supprimé.
      const user = await usersRepository.findById(payload.sub);
      if (!user) throw new UnauthorizedError(INVALID_REFRESH);
      if (isLocked(user)) throw new UnauthorizedError(lockedMessage(user.locked_until));
      return issueTokens(user);
    },

    async register({ email, password, role, site_id }) {
      const password_hash = await bcrypt.hash(password, 10);
      // create() ne renvoie jamais l'empreinte.
      return usersRepository.create({ email: email.toLowerCase(), password_hash, role, site_id: site_id ?? null });
    },

    verifyAccessToken(token) {
      const payload = verify(token, auth.accessSecret, "access");
      if (!payload) throw new UnauthorizedError("Jeton d'accès invalide ou expiré.");
      return { id: payload.sub, role: payload.role, site_id: payload.site_id };
    },
  };
}
