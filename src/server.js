const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "../public")));


// =============================
// CONEXÃO MONGODB
// =============================

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log("✅ MongoDB conectado");

  // Só cria admin depois que conectar
  await criarAdminPadrao();
})
.catch(err => console.log("❌ Erro Mongo:", err));


// =============================
// MODELO USUÁRIO
// =============================

const UsuarioSchema = new mongoose.Schema({
  usuario: { type: String, unique: true },
  senha: String,
  nivel: String
});

const Usuario = mongoose.model("Usuario", UsuarioSchema);


// =============================
// CRIAR ADMIN AUTOMÁTICO
// =============================

async function criarAdminPadrao() {
  try {
    const existe = await Usuario.findOne({ usuario: "admin" });

    if (!existe) {
      const senhaHash = await bcrypt.hash("123456", 10);

      await Usuario.create({
        usuario: "admin",
        senha: senhaHash,
        nivel: "admin"
      });

      console.log("🔥 Admin criado: admin / 123456");
    } else {
      console.log("ℹ Admin já existe");
    }
  } catch (err) {
    console.log("Erro ao criar admin:", err);
  }
}


// =============================
//