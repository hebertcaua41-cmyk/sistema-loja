const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// 🔥 SERVIR PASTA PUBLIC (fora do src)
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

// 🔥 CONEXÃO MONGO
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB conectado"))
  .catch((err) => console.error("❌ Erro MongoDB:", err));

// 🔥 MODEL
const OrdemSchema = new mongoose.Schema({
  cliente: String,
  telefone: String,
  aparelho: String,
  defeito: String,
  valorServico: Number,
  custoPeca: Number,
  status: { type: String, default: "Em análise" },
  data: { type: Date, default: Date.now }
});

const Ordem = mongoose.model("Ordem", OrdemSchema);

// 🔥 ROTAS
app.post("/ordens", async (req, res) => {
  try {
    const nova = new Ordem(req.body);
    await nova.save();
    res.status(201).json(nova);
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

app.get("/ordens", async (req, res) => {
  try {
    const ordens = await Ordem.find().sort({ data: -1 });
    res.json(ordens);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "online" });
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});