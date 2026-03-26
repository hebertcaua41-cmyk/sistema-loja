const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

/* =========================
   CONEXÃO COM MONGODB
========================= */

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB conectado');
  })
  .catch((err) => {
    console.error('❌ Erro ao conectar no MongoDB:', err);
  });

/* =========================
   MODEL PRODUTO
========================= */

const ProdutoSchema = new mongoose.Schema({
  nome: String,
  preco: Number,
  descricao: String
});

const Produto = mongoose.model('Produto', ProdutoSchema);

/* =========================
   ROTAS
========================= */

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Listar produtos
app.get('/produtos', async (req, res) => {
  try {
    const produtos = await Produto.find();
    res.json(produtos);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar produtos' });
  }
});

// Criar produto
app.post('/produtos', async (req, res) => {
  try {
    const novoProduto = new Produto(req.body);
    await novoProduto.save();
    res.status(201).json(novoProduto);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao criar produto' });
  }
});

/* =========================
   INICIAR SERVIDOR
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});