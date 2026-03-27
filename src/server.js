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

const Estoque = mongoose.model("Estoque", {
  nome: String,
  quantidade: Number,
  custoUnitario: Number
});

const Despesa = mongoose.model("Despesa", {
  nome: String,
  valor: Number
});

const Ordem = mongoose.model("Ordem", {
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

const Venda = mongoose.model("Venda", {
  cliente: String,
  produto: String,
  quantidade: Number,
  valorUnitario: Number,
  total: Number,
  data: { type: Date, default: Date.now }
});

/* ================= ESTOQUE ================= */

app.post("/estoque", async (req, res) => {
  const nova = await Estoque.create(req.body);
  res.json(nova);
});

app.get("/estoque", async (req, res) => {
  res.json(await Estoque.find());
});

/* ================= DESPESAS ================= */

app.post("/despesas", async (req, res) => {
  res.json(await Despesa.create(req.body));
});

app.get("/despesas", async (req, res) => {
  res.json(await Despesa.find());
});

/* ================= ORDEM ================= */

app.post("/ordens", async (req, res) => {
  try {
    const {
      cliente, telefone, aparelho, defeito,
      pecaUsada, quantidadePeca,
      valorServico, garantiaDias
    } = req.body;

    let custoPeca = 0;

    if (pecaUsada && quantidadePeca > 0) {
      const peca = await Estoque.findOne({ nome: pecaUsada });

      if (!peca || peca.quantidade < quantidadePeca) {
        return res.status(400).json({ erro: "Estoque insuficiente" });
      }

      custoPeca = peca.custoUnitario * quantidadePeca;
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
      cliente, telefone, aparelho, defeito,
      pecaUsada, quantidadePeca,
      valorServico, custoPeca, lucro,
      garantiaDias, dataGarantia
    });

    res.json(nova);

  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get("/ordens", async (req, res) => {
  res.json(await Ordem.find().sort({ data: -1 }));
});

/* ================= VENDAS ================= */

app.post("/vendas", async (req, res) => {
  try {
    const { cliente, produto, quantidade, valorUnitario } = req.body;

    const item = await Estoque.findOne({ nome: produto });

    if (!item || item.quantidade < quantidade) {
      return res.status(400).json({ erro: "Estoque insuficiente" });
    }

    item.quantidade -= quantidade;
    await item.save();

    const total = quantidade * valorUnitario;

    const nova = await Venda.create({
      cliente, produto, quantidade, valorUnitario, total
    });

    res.json(nova);

  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get("/vendas", async (req, res) => {
  res.json(await Venda.find().sort({ data: -1 }));
});

/* ================= DASHBOARD ================= */

app.get("/dashboard", async (req, res) => {

  const ordens = await Ordem.find();
  const despesas = await Despesa.find();
  const vendas = await Venda.find();

  const metaMensal = 5000;

  const mesAtual = new Date().getMonth();
  const anoAtual = new Date().getFullYear();

  const faturamentoMes =
    [...ordens, ...vendas]
      .filter(o => {
        const data = new Date(o.data);
        return data.getMonth() === mesAtual && data.getFullYear() === anoAtual;
      })
      .reduce((acc, o) => acc + (o.valorServico || o.total), 0);

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

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Servidor rodando na porta " + PORT));