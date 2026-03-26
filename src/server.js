const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// ⚠️ COLE SUA STRING DO MONGODB AQUI
const MONGO_URI = process.env.MONGO_URI || "COLE_SUA_STRING_AQUI";

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB conectado"))
  .catch(err => console.error("❌ Erro ao conectar MongoDB:", err));

// Rota teste
app.get("/", (req, res) => {
  res.send("Servidor funcionando 🚀");
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "online" });
});

// Modelo Produto
const ProdutoSchema = new mongoose.Schema({
  nome: String,
  preco: Number,
  estoque: Number
});

const Produto = mongoose.model("Produto", ProdutoSchema);

// Criar produto
app.post("/produtos", async (req, res) => {
  try {
    const produto = new Produto(req.body);
    await produto.save();
    res.status(201).json(produto);
  } catch (error) {
    res.status(400).json({ erro: error.message });
  }
});

// Listar produtos
app.get("/produtos", async (req, res) => {
  try {
    const produtos = await Produto.find();
    res.json(produtos);
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});