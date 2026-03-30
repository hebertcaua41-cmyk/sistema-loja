require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const PDFDocument = require("pdfkit");

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static("public"));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB conectado"))
  .catch(err => console.log(err));

/* ================= MODELS ================= */

const osSchema = new mongoose.Schema({
  cliente: String,
  telefone: String,
  aparelho: String,
  defeito: String,
  valor: Number,
  garantia: String,
  status: String,
  excluido: { type: Boolean, default: false },
  data: { type: Date, default: Date.now }
});

const estoqueSchema = new mongoose.Schema({
  produto: String,
  quantidade: Number,
  preco: Number,
  excluido: { type: Boolean, default: false }
});

const vendaSchema = new mongoose.Schema({
  cliente: String,
  produto: String,
  quantidade: Number,
  total: Number,
  excluido: { type: Boolean, default: false },
  data: { type: Date, default: Date.now }
});

const despesaSchema = new mongoose.Schema({
  descricao: String,
  valor: Number,
  excluido: { type: Boolean, default: false },
  data: { type: Date, default: Date.now }
});

const OS = mongoose.model("OS", osSchema);
const Estoque = mongoose.model("Estoque", estoqueSchema);
const Venda = mongoose.model("Venda", vendaSchema);
const Despesa = mongoose.model("Despesa", despesaSchema);

/* ================= FUNÇÃO ADMIN ================= */

function validarAdmin(req, res) {
  const { senhaAdmin } = req.body;
  if (!senhaAdmin || senhaAdmin !== process.env.ADMIN_PASSWORD) {
    res.status(403).json({ erro: "Senha admin incorreta" });
    return false;
  }
  return true;
}

/* ================= OS ================= */

app.post("/os", async (req, res) => {
  const nova = await OS.create(req.body);
  res.json(nova);
});

app.get("/os