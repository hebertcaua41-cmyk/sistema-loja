require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");

const app = express();

/* =========================
   CONFIG
========================= */

const PORT = process.env.PORT || 10000;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET || "hs_cell_secret";

/* =========================
   MIDDLEWARES
========================= */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

/* =========================
   CONEXÃO MONGO
========================= */

mongoose.connect(MONGO_URI)
  .then(() => console.log("🔥 MongoDB conectado"))
  .catch(err => console.log("❌ Erro Mongo:", err));

/* =========================
   MODEL USUÁRIO
========================= */

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  role: { type: String, default: "admin" }
});

const User = mongoose.model("User", UserSchema);

/* =========================
   MODEL ORDEM DE SERVIÇO
========================= */

const OSSchema = new mongoose.Schema({
  cliente: String,
  telefone: String,
  aparelho: String,
  defeito: String,
  valor: Number,
  garantia: String,
  status: { type: String, default: "Em andamento" },
  data: { type: Date, default: Date.now }
});

const OS = mongoose.model("OS", OSSchema);

/* =========================
   CRIAR ADMIN AUTOMÁTICO
========================= */

async function createAdmin() {
  const exists = await User.findOne({ username: "admin" });

  if (!exists) {
    const hash = await bcrypt.hash("123456", 10);

    await User.create({
      username: "admin",
      password: hash,
      role: "admin"
    });

    console.log("✅ Admin criado");
    console.log("Usuário: admin");
    console.log("Senha: 123456");
  } else {
    console.log("ℹ️ Admin já existe");
  }
}

createAdmin();

/* =========================
   ROTAS
========================= */

// TESTE
app.get