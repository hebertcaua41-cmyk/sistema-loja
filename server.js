const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");

const Usuario = require("./models/Usuario");
const OS = require("./models/OS");
const Produto = require("./models/Produto");
const Despesa = require("./models/Despesa");
const Venda = require("./models/Venda");
const auth = require("./middleware/auth");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "../public")));

mongoose.connect(process.env.MONGO_URI)
.then(async () => {
  console.log("Mongo conectado");
  await criarAdmin();
});

async function criarAdmin() {
  const existe = await Usuario.findOne({ usuario: "admin" });
  if (!existe) {
    const hash = await bcrypt.hash("123456", 10);
    await Usuario.create({ usuario: "admin", senha: hash, nivel: "admin" });
    console.log("Admin criado");
  }
}

// LOGIN
app.post("/login", async (req, res) => {
  const { usuario, senha } = req.body;
  const user = await Usuario.findOne({ usuario });
  if (!user) return res.status(400).json({ erro: "Usuário não encontrado" });

  const valido = await bcrypt.compare(senha, user.senha);
  if (!valido) return res.status(400).json({ erro: "Senha inválida" });

  const token = jwt.sign({ id: user._id, nivel: user.nivel }, "segredo_super");
  res.json({ token });
});

// ================= OS =================
app.post("/os", auth, async (req, res) => {
  const nova = await OS.create(req.body);
  res.json(nova);
});

app.get("/os", auth, async (req, res) => {
  const lista = await OS.find();
  res.json(lista);
});

app.put("/os/:id", auth, async (req, res) => {
  const atualizar = await OS.findByIdAndUpdate(req.params.id, req.body);
  res.json(atualizar);
});

app.delete("/os/:id", auth, async (req, res) => {
  await OS.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// ================= ESTOQUE =================
app.post("/produto", auth, async (req, res) => {
  const novo = await Produto.create(req.body);
  res.json(novo);
});

app.get("/produto", auth, async (req, res) => {
  const lista = await Produto.find();
  res.json(lista);
});

// ================= DESPESAS =================
app.post("/despesa", auth, async (req, res) => {
  const nova = await Despesa.create(req.body);
  res.json(nova);
});

app.get("/despesa", auth, async (req, res) => {
  const lista = await Despesa.find();
  res.json(lista);
});

// ================= VENDAS =================
app.post("/venda", auth, async (req, res) => {
  const nova = await Venda.create(req.body);
  res.json(nova);
});

app.get("/relatorio", auth, async (req, res) => {
  const vendas = await Venda.find();
  const total = vendas.reduce((soma, v) => soma + v.valor, 0);
  res.json({ total });
});

const PORT = process.env.PORT;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor rodando na porta " + PORT);
});