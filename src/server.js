const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB conectado"))
  .catch(err => console.log(err));

/* ================= MODELS ================= */

const EstoqueSchema = new mongoose.Schema({
  nome: String,
  quantidade: Number,
  custoUnitario: Number
});

const DespesaSchema = new mongoose.Schema({
  nome: String,
  valor: Number
});

const OrdemSchema = new mongoose.Schema({
  cliente: String,
  telefone: String,
  aparelho: String,
  defeito: String,
  pecaUsada: String,
  quantidadePeca: Number,
  valorServico: Number,
  custoPeca: Number,
  lucro: Number,
  garantiaDias: Number,
  dataGarantia: Date,
  data: { type: Date, default: Date.now }
});

const Estoque = mongoose.model("Estoque", EstoqueSchema);
const Despesa = mongoose.model("Despesa", DespesaSchema);
const Ordem = mongoose.model("Ordem", OrdemSchema);

/* ================= ESTOQUE ================= */

// cadastrar peça
app.post("/estoque", async (req, res) => {
  const nova = await Estoque.create(req.body);
  res.json(nova);
});

// listar estoque
app.get("/estoque", async (req, res) => {
  const lista = await Estoque.find();
  res.json(lista);
});

/* ================= DESPESAS ================= */

app.post("/despesas", async (req, res) => {
  const nova = await Despesa.create(req.body);
  res.json(nova);
});

app.get("/despesas", async (req, res) => {
  const lista = await Despesa.find();
  res.json(lista);
});

/* ================= ORDEM ================= */

app.post("/ordens", async (req, res) => {
  try {
    const {
      cliente,
      telefone,
      aparelho,
      defeito,
      pecaUsada,
      quantidadePeca,
      valorServico,
      garantiaDias
    } = req.body;

    let custoPeca = 0;

    if (pecaUsada) {
      const peca = await Estoque.findOne({ nome: pecaUsada });

      if (!peca || peca.quantidade < quantidadePeca) {
        return res.status(400).json({ erro: "Estoque insuficiente" });
      }

      custoPeca = peca.custoUnitario * quantidadePeca;

      // baixa no estoque
      peca.quantidade -= quantidadePeca;
      await peca.save();
    }

    const lucro = valorServico - custoPeca;

    let dataGarantia = null;
    if (garantiaDias > 0) {
      dataGarantia = new Date();
      dataGarantia.setDate(dataGarantia.getDate() + garantiaDias);
    }

    const nova = await Ordem.create({
      cliente,
      telefone,
      aparelho,
      defeito,
      pecaUsada,
      quantidadePeca,
      valorServico,
      custoPeca,
      lucro,
      garantiaDias,
      dataGarantia
    });

    res.json(nova);

  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

app.get("/ordens", async (req, res) => {
  const lista = await Ordem.find().sort({ data: -1 });
  res.json(lista);
});

/* ================= DASHBOARD ================= */

app.get("/dashboard", async (req, res) => {
  const ordens = await Ordem.find();
  const despesas = await Despesa.find();

  const metaMensal = 5000;

  const mesAtual = new Date().getMonth();
  const anoAtual = new Date().getFullYear();

  const faturamentoMes = ordens
    .filter(o => {
      const data = new Date(o.data);
      return data.getMonth() === mesAtual && data.getFullYear() === anoAtual;
    })
    .reduce((acc, o) => acc + o.valorServico, 0);

  const lucroBruto = ordens.reduce((acc, o) => acc + o.lucro, 0);
  const totalDespesas = despesas.reduce((acc, d) => acc + d.valor, 0);
  const lucroLiquido = lucroBruto - totalDespesas;

  const progressoMeta = ((faturamentoMes / metaMensal) * 100).toFixed(1);

  res.json({
    metaMensal,
    faturamentoMes,
    progressoMeta,
    lucroBruto,
    totalDespesas,
    lucroLiquido
  });
});

/* ================= SERVIDOR ================= */

app.get("*",