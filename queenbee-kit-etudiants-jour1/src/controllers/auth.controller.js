export function createAuthController({ authService }) {
  return {
    login: async (req, res) => {
      const { email, password } = req.validated;
      res.json(await authService.login(email, password));
    },
    refresh: async (req, res) => res.json(await authService.refresh(req.validated.refresh_token)),
    register: async (req, res) => res.status(201).json(await authService.register(req.validated)),
    me: (req, res) => res.json(req.user), // l'utilisateur issu du jeton
  };
}
