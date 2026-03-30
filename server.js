require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const PDFDocument = require("pdfkit");

const app = express();

/* ================= CONFIG ================= */

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

app.get("/os", async (req, res) => {
  const lista = await OS.find({ excluido: false }).sort({ data: -1 });
  res.json(lista);
});

app.delete("/os/:id", async (req, res) => {
  if (!validarAdmin(req, res)) return;
  await OS.findByIdAndUpdate(req.params.id, { excluido: true });
  res.json({ ok: true });
});

/* ================= PDF OS ================= */

app.get("/os/:id/pdf", async (req, res) => {
  try {
    const os = await OS.findById(req.params.id);
    if (!os) return res.status(404).send("OS não encontrada");

    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=OS-${os._id}.pdf`);

    doc.pipe(res);

    doc.fontSize(20).text("HS CELL IMPORTS", { align: "center" });
    doc.moveDown();
    doc.fontSize(14).text(`Cliente: ${os.cliente}`);
    doc.text(`Telefone: ${os.telefone}`);
    doc.text(`Aparelho: ${os.aparelho}`);
    doc.text(`Defeito: ${os.defeito}`);
    doc.text(`Valor: R$ ${os.valor}`);
    doc.text(`Garantia: ${os.garantia} dias`);
    doc.text(`Status: ${os.status}`);
    doc.text(`Data: ${new Date(os.data).toLocaleDateString()}`);

    doc.end();
  } catch (err) {
    console.log(err);
    res.status(500).send("Erro ao gerar PDF");
  }
});

/* ================= ESTOQUE ================= */

app.post("/estoque", async (req, res) => {
  const novo = await Estoque.create(req.body);
  res.json(novo);
});

app.get("/estoque", async (req, res) => {
  const lista = await Estoque.find({ excluido: false });
  res.json(lista);
});

/* ================= VENDAS ================= */

app.post("/venda", async (req, res) => {
  const { cliente, produto, quantidade } = req.body;

  const item = await Estoque.findOne({ produto, excluido: false });
  if (!item) return res.status(400).json({ erro: "Produto não encontrado" });
  if (item.quantidade < quantidade)
    return res.status(400).json({ erro: "Estoque insuficiente" });

  item.quantidade -= quantidade;
  await item.save();

  const total = item.preco * quantidade;

  const novaVenda = await Venda.create({
    cliente,
    produto,
    quantidade,
    total
  });

  res.json(novaVenda);
});

app.get("/vendas", async (req, res) => {
  const lista = await Venda.find({ excluido: false }).sort({ data: -1 });
  res.json(lista);
});

/* ================= DESPESAS ================= */

app.post("/despesas", async (req, res) => {
  const nova = await Despesa.create(req.body);
  res.json(nova);
});

app.get("/despesas", async (req, res) => {
  const lista = await Despesa.find({ excluido: false }).sort({ data: -1 });
  res.json(lista);
});

/* ================= DASHBOARD ================= */

app.get("/dashboard", async (req, res) => {
  const totalOS = await OS.countDocuments({ excluido: false });
  const totalVendas = await Venda.aggregate([
    { $match: { excluido: false } },
    { $group: { _id: null, total: { $sum: "$total" } } }
  ]);

  const totalDespesas = await Despesa.aggregate([
    { $match: { excluido: false } },
    { $group: { _id: null, total: { $sum: "$valor" } } }
  ]);

  res.json({
    totalOS,
    totalVendas: totalVendas[0]?.total || 0,
    totalDespesas: totalDespesas[0]?.total || 0,
    lucro:
      (totalVendas[0]?.total || 0) -
      (totalDespesas[0]?.total || 0)
  });
});

/* ================= ROOT ================= */

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/health", (req, res) => {
  res.send("OK");
});

/* ================= SERVER ================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Servidor rodando na porta " + PORT);
});