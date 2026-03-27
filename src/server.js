const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// 👇 CAMINHO CORRETO
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB conectado"))
  .catch(err => console.error("❌ Erro MongoDB:", err));

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

app.post("/ordens", async (req, res) => {
  try {
    const nova = new Ordem(req.body);
    await nova.save();
    res.status(201).json(nova);