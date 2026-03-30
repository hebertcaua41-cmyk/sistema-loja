const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const PDFDocument = require("pdfkit");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB conectado"))
.catch(err => console.log(err));

/* =========================
   MODELS
========================= */

const Usuario = mongoose.model("Usuario", {
  usuario: String,
  senha: String
});

const OS = mongoose.model("OS", {
  cliente: String,
  telefone: String,
  aparelho: String,
  defeito: String,
  valor: Number,
  garantia: String,
  status: String,
  data: { type: Date, default: Date.now }
});

const Estoque = mongoose.model("Estoque", {
  produto: String,
  quantidade: Number,
  preco: Number
});

const Venda = mongoose.model("Venda", {
  produto: String,
  quantidade: Number,
  valor: Number,
  data: { type: Date, default: Date.now }
});

/* =========================
   ROTA PRINCIPAL
========================= */

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* =========================
   LOGIN
========================= */

app.post("/login", async (req, res) => {
  const { usuario, senha } = req.body;

  const user = await Usuario.findOne({ usuario, senha });

  if (!user) {
    return res.status(400).json({ erro: "Usuário não encontrado" });
  }

  res.json({ mensagem: "Login realizado com sucesso" });
});

/* =========================
   ORDEM DE SERVIÇO
========================= */

app.post("/os", async (req, res) => {
  const nova = new OS(req.body);
  await nova.save();
  res.json(nova);
});

app.get("/os", async (req, res) => {
  const lista = await OS.find().sort({ data: -1 });
  res.json(lista);
});

app.put("/os/:id", async (req, res) => {
  await OS.findByIdAndUpdate(req.params.id, req.body);
  res.json({ mensagem: "OS atualizada" });
});

app.delete("/os/:id", async (req, res) => {
  await OS.findByIdAndDelete(req.params.id);
  res.json({ mensagem: "OS excluída" });
});

/* =========================
   PDF DA OS
========================= */

app.get("/os/:id/pdf", async (req, res) => {
  const os = await OS.findById(req.params.id);

  if (!os) return res.status(404).send("OS não encontrada");

  const doc = new PDFDocument();
  res.setHeader("Content-Type", "application/pdf");
  doc.pipe(res);

  doc.fontSize(18).text("HS Cell Imports", { align: "center" });
  doc.moveDown();

  doc.fontSize(12).text(`Cliente: ${os.cliente}`);
  doc.text(`Telefone: ${os.telefone}`);
  doc.text(`Aparelho: ${os.aparelho}`);
  doc.text(`Defeito: ${os.defeito}`);
  doc.text(`Valor: R$ ${os.valor}`);
  doc.text(`Garantia: ${os.garantia} dias`);
  doc.text(`Status: ${os.status}`);
  doc.text(`Data: ${os.data.toLocaleDateString()}`);

  doc.end();
});

/* =========================
   ESTOQUE
========================= */

app.post("/estoque", async (req, res) => {
  const novo = new Estoque(req.body);
  await novo.save();
  res.json(novo);
});

app.get("/estoque", async (req, res) => {
  const lista = await Estoque.find();
  res.json(lista);
});

app.put("/estoque/:id", async (req, res) => {
  await Estoque.findByIdAndUpdate(req.params.id, req.body);
  res.json({ mensagem: "Produto atualizado" });
});

app.delete("/estoque/:id", async (req, res) => {
  await Estoque.findByIdAndDelete(req.params.id);
  res.json({ mensagem: "Produto removido" });
});

/* =========================
   VENDAS (BAIXA AUTOMÁTICA)
========================= */

app.post("/venda", async (req, res) => {
  const { produto, quantidade } = req.body;

  const item = await Estoque.findOne({ produto });

  if (!item) return res.status(400).json({ erro: "Produto não encontrado" });

  if (item.quantidade < quantidade)
    return res.status(400).json({ erro: "Estoque insuficiente" });

  item.quantidade -= quantidade;
  await item.save();

  const venda = new Venda({
    produto,
    quantidade,
    valor: item.preco * quantidade
  });

  await venda.save();

  res.json({ mensagem: "Venda realizada com sucesso" });
});

app.get("/vendas", async (req, res) => {
  const lista = await Venda.find().sort({ data: -1 });
  res.json(lista);
});

/* =========================
   PORTA
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});