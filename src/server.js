const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB conectado"))
  .catch(err => console.log(err));

const OrdemSchema = new mongoose.Schema({
  cliente: String,
  telefone: String,
  aparelho: String,
  defeito: String,
  valorServico: Number,
  custoPeca: Number,
  lucro: Number,
  status: { type: String, default: "Em análise" },
  garantiaDias: Number,
  dataGarantia: Date,
  data: { type: Date, default: Date.now }
});

const Ordem = mongoose.model("Ordem", OrdemSchema);

// Criar ordem
app.post("/ordens", async (req, res) => {
  try {
    const {
      cliente,
      telefone,
      aparelho,
      defeito,
      valorServico,
      custoPeca,
      garantiaDias
    } = req.body;

    const lucro = valorServico - custoPeca;

    let dataGarantia = null;

    if (garantiaDias && garantiaDias > 0) {
      dataGarantia = new Date();
      dataGarantia.setDate(dataGarantia.getDate() + garantiaDias);
    }

    const novaOrdem = new Ordem({
      cliente,
      telefone,
      aparelho,
      defeito,
      valorServico,
      custoPeca,
      lucro,
      garantiaDias,
      dataGarantia
    });

    await novaOrdem.save();
    res.status(201).json(novaOrdem);

  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// Listar ordens
app.get("/ordens", async (req, res) => {
  const ordens = await Ordem.find().sort({ data: -1 });
  res.json(ordens);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor rodando na porta " + PORT));

// DASHBOARD
app.get("/dashboard", async (req, res) => {
  try {
    const ordens = await Ordem.find();

    const totalOrdens = ordens.length;

    const totalFaturado = ordens.reduce((acc, o) => acc + o.valorServico, 0);
    const totalCusto = ordens.reduce((acc, o) => acc + o.custoPeca, 0);
    const lucroTotal = ordens.reduce((acc, o) => acc + o.lucro, 0);

    const mesAtual = new Date().getMonth();
    const anoAtual = new Date().getFullYear();

    const faturamentoMes = ordens
      .filter(o => {
        const data = new Date(o.data);
        return data.getMonth() === mesAtual && data.getFullYear() === anoAtual;
      })
      .reduce((acc, o) => acc + o.valorServico, 0);

    res.json({
      totalOrdens,
      totalFaturado,
      totalCusto,
      lucroTotal,
      faturamentoMes
    });

  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});