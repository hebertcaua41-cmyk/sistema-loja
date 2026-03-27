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

// CRIAR ORDEM
app.post("/ordens", async (req, res) => {
  try {
    const { cliente, telefone, aparelho, defeito, valorServico, custoPeca, garantiaDias } = req.body;

    const lucro = valorServico - custoPeca;

    let dataGarantia = null;
    if (garantiaDias && garantiaDias > 0) {
      dataGarantia = new Date();
      dataGarantia.setDate(dataGarantia.getDate() + garantiaDias);
    }

    const nova = await Ordem.create({
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

    res.json(nova);

  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// EDITAR ORDEM
app.put("/ordens/:id", async (req, res) => {
  try {
    const { valorServico, custoPeca, garantiaDias } = req.body;

    const lucro = valorServico - custoPeca;

    let dataGarantia = null;
    if (garantiaDias && garantiaDias > 0) {
      dataGarantia = new Date();
      dataGarantia.setDate(dataGarantia.getDate() + garantiaDias);
    }

    const atualizada = await Ordem.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        lucro,
        garantiaDias,
        dataGarantia
      },
      { new: true }
    );

    res.json(atualizada);

  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// LISTAR ORDENS
app.get("/ordens", async (req, res) => {
  const ordens = await Ordem.find().sort({ data: -1 });
  res.json(ordens);
});

// DASHBOARD COM META 5K
app.get("/dashboard", async (req, res) => {
  try {
    const ordens = await Ordem.find();
    const metaMensal = 5000;

    const mesAtual = new Date().getMonth();
    const anoAtual = new Date().getFullYear();

    const faturamentoMes = ordens
      .filter(o => {
        const data = new Date(o.data);
        return data.getMonth() === mesAtual && data.getFullYear() === anoAtual;
      })
      .reduce((acc, o) => acc + o.valorServico, 0);

    const progressoMeta = ((faturamentoMes / metaMensal) * 100).toFixed(1);
    const lucroTotal = ordens.reduce((acc, o) => acc + o.lucro, 0);

    res.json({
      metaMensal,
      faturamentoMes,
      progressoMeta,
      lucroTotal
    });

  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// ROTA PRINCIPAL
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Servidor rodando na porta " + PORT));