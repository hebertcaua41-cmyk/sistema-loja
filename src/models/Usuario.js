const mongoose = require("mongoose");

const UsuarioSchema = new mongoose.Schema({
  usuario: { type: String, unique: true },
  senha: String,
  nivel: { type: String, default: "funcionario" }
});

module.exports = mongoose.model("Usuario", UsuarioSchema);