const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();

// 🔥 MIDDLEWARES
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔥 SERVIR ARQUIVOS DA PASTA PUBLIC
app.use(express.static(path.join(__dirname, 'public')));

// 🔥 CONEXÃO MONGODB
const MONGO_URI = "mongodb://heberts704_db_user:Tina2701@ac-u1kynyo-shard-00-00.8u5vdtw.mongodb.net:27017,ac-u1kynyo-shard-00-01.8u5vdtw.mongodb.net:27017,ac-u1kynyo-shard-00-02.8u5vdtw.mongodb.net:27017/sistemaloja?ssl=true&replicaSet=atlas-2sv9nr-shard-0&authSource=admin&retryWrites=true&w=majority&appName=hs";

mongoose.connect(MONGO_URI)
    .then(() => console.log("🔥 Banco conectado com sucesso!"))
    .catch((err) => console.log("❌ Erro ao conectar:", err));

/* ==============================
   📦 MODEL PRODUTO
============================== */

const Produto = mongoose.model('Produto', {
    nome: String,
    preco: Number,
    quantidade: Number
});

/* ==============================
   🛠 MODEL OS
============================== */

const OS = mongoose.model('OS', {
    cliente: String,
    aparelho: String,
    problema: String,
    valor: Number,
    status: {
        type: String,
        default: "Em andamento"
    },
    data: {
        type: Date,
        default: Date.now
    }
});

/* ==============================
   📦 ROTAS PRODUTOS
============================== */

app.get('/produtos', async (req, res) => {
    const produtos = await Produto.find();
    res.json(produtos);
});

app.post('/produtos', async (req, res) => {
    const novoProduto = new Produto(req.body);
    await novoProduto.save();
    res.json({ mensagem: 'Produto salvo com sucesso!' });
});

app.delete('/produtos/:id', async (req, res) => {
    await Produto.findByIdAndDelete(req.params.id);
    res.json({ mensagem: 'Produto deletado!' });
});

/* ==============================
   🛠 ROTAS OS
============================== */

app.get('/os', async (req, res) => {
    const lista = await OS.find();
    res.json(lista);
});

app.post('/os', async (req, res) => {
    const novaOS = new OS(req.body);
    await novaOS.save();
    res.json({ mensagem: 'OS criada com sucesso!' });
});

app.put('/os/:id', async (req, res) => {
    await OS.findByIdAndUpdate(req.params.id, req.body);
    res.json({ mensagem: 'OS atualizada!' });
});

app.delete('/os/:id', async (req, res) => {
    await OS.findByIdAndDelete(req.params.id);
    res.json({ mensagem: 'OS deletada!' });
});

/* ==============================
   🚀 INICIAR SERVIDOR
============================== */

app.listen(3000, '0.0.0.0', () => {
    console.log("🚀 Servidor rodando na porta 3000");
});