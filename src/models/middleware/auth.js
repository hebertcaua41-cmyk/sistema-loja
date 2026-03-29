const jwt = require("jsonwebtoken");

module.exports = function(req, res, next) {
  const token = req.headers.authorization;

  if (!token) return res.status(401).json({ erro: "Acesso negado" });

  try {
    const decoded = jwt.verify(token, "segredo_super");
    req.user = decoded;
    next();
  } catch {
    res.status(400).json({ erro: "Token inválido" });
  }
};