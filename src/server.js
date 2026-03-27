const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// Servir arquivos do painel
app.use(express.static(path.join(__dirname, "../public")));

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB conectado"))
  .catch(err => console.error("❌ Erro MongoDB:", err));

// Modelo Ordem de Serviço
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

// Criar OS
app.post("/ordens", async (req, res) => {
  try {
    const nova = new Ordem(req.body);
    await nova.save();
    res.status(201).json(nova);
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

// Listar OS
app.get("/ordens", async (req, res) => {
  const ordens = await Ordem.find().sort({ data: -1 });
  res.json(ordens);
});

// Atualizar Status
app.put("/ordens/:id", async (req, res) => {
  try {
    const ordem = await Ordem.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    res.json(ordem);
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "online" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Servidor rodando na porta", PORT);
});