require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");

const app = express();

/* =========================
   CONFIGURAÇÃO
========================= */

const PORT = process.env.PORT || 10000;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET || "hs_cell_secret";

/* =========================
   MIDDLEWARE
========================= */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

/* =========================
   MODELS
========================= */

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  role: { type: String, default: "admin" }
});

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

const User = mongoose.model("User", UserSchema);
const OS = mongoose.model("OS", OSSchema);

/* =========================
   ROTAS BÁSICAS
========================= */

app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* =========================
   LOGIN
========================= */

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user)
      return res.status(400).json({ message: "Usuário não encontrado" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(400).json({ message: "Senha inválida" });

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
   ORDEM DE SERVIÇO
========================= */

app.post("/os", async (req, res) => {
  try {
    const nova = await OS.create(req.body);
    res.json(nova);
  } catch {
    res.status(500).json({ message: "Erro ao criar OS" });
  }
});

app.get("/os", async (req, res) => {
  const lista = await OS.find().sort({ data: -1 });
  res.json(lista);
});

app.put("/os/:id", async (req, res) => {
  await OS.findByIdAndUpdate(req.params.id, req.body);
  res.json({ message: "Atualizada" });
});

app.delete("/os/:id", async (req, res) => {
  await OS.findByIdAndDelete(req.params.id);
  res.json({ message: "Excluída" });
});

/* =========================
   DASHBOARD META
========================= */

app.get("/dashboard", async (req, res) => {
  const mes = new Date().getMonth();
  const ano = new Date().getFullYear();

  const ordens = await OS.find({
    data: {
      $gte: new Date(ano, mes, 1),
      $lt: new Date(ano, mes + 1, 1)
    }
  });

  const total = ordens.reduce((acc, os) => acc + (os.valor || 0), 0);

  res.json({
    totalMes: total,
    meta: 5000,
    falta: total >= 5000 ? 0 : 5000 - total
  });
});

/* =========================
   INICIAR SERVIDOR (IMPORTANTE)
========================= */

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log("🔥 MongoDB conectado");

    // Criar admin automático
    const exists = await User.findOne({ username: "admin" });
    if (!exists) {
      const hash = await bcrypt.hash("123456", 10);
      await User.create({
        username: "admin",
        password: hash,
        role: "admin"
      });
      console.log("✅ Admin criado: admin / 123456");
    }

    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
    });
  })
  .catch(err => {
    console.log("❌ Erro ao conectar Mongo:", err);
  });