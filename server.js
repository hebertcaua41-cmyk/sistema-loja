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
const JWT_SECRET = process.env.JWT_SECRET || "hs_cell_super_secret";

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
   MODEL USER
========================= */

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  role: { type: String, default: "admin" }
});

const User = mongoose.model("User", UserSchema);

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

// TESTE BACKEND
app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

// ROTA RAIZ (resolve Cannot GET /)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// LOGIN
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "Usuário não encontrado" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ message: "Senha inválida" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token });

  } catch (err) {
    res.status(500).json({ message: "Erro no servidor" });
  }
});

/* =========================
   START SERVER
========================= */

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});