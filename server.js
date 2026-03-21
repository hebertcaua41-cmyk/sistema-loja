const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();

/* ==============================
   🔥 MIDDLEWARES
============================== */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ==============================
   📁 ARQUIVOS ESTÁTICOS
============================== */
app.use(express.static(path.join(__dirname, 'public')));

/* ==============================
   🌍 CONEXÃO MONGODB ATLAS
============================== */

const MONGO_URI = process.env.MONGO_URI || "COLE_SUA_STRING_DO_MONGODB_AQUI";

mongoose.connect(MONGO_URI)
    .then(() => console.log("🔥 Banco conectado com sucesso!"))
    .catch((err) => console.error("❌ Erro ao conectar no MongoDB:", err));


/* ==============================
   📦 MODEL PRODUTO
============================== */
const Produto = mongoose.model('Produto', {
    nome: String,
    preco: Number,
    quantidade: Number
});


/* ==============================
   🛠 MODEL ORDEM DE SERVIÇO
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
    try {
        const produtos = await Produto.find();
        res.json(produtos);
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

app.post('/produtos', async (req, res) => {
    try {
        const novoProduto = new Produto(req.body);
        await novoProduto.save();
        res.json({ mensagem: "Produto salvo com sucesso!" });
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

app.delete('/produtos/:id', async (req, res) => {
    try {
        await Produto.findByIdAndDelete(req.params.id);
        res.json({ mensagem: "Produto deletado com sucesso!" });
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});


/* ==============================
   🛠 ROTAS ORDEM DE SERVIÇO
============================== */

app.get('/os', async (req, res) => {
    try {
        const lista = await OS.find().sort({ data: -1 });
        res.json(lista);
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

app.post('/os', async (req, res) => {
    try {
        const novaOS = new OS(req.body);
        await novaOS.save();
        res.json({ mensagem: "OS criada com sucesso!" });
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

app.put('/os/:id', async (req, res) => {
    try {
        await OS.findByIdAndUpdate(req.params.id, req.body);
        res.json({ mensagem: "OS atualizada com sucesso!" });
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

app.delete('/os/:id', async (req, res) => {
    try {
        await OS.findByIdAndDelete(req.params.id);
        res.json({ mensagem: "OS deletada com sucesso!" });
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});


/* ==============================
   ❤️ ROTA TESTE (Health Check)
============================== */
app.get('/health', (req, res) => {
    res.send("Servidor online 🚀");
});


/* ==============================
   🚀 INICIAR SERVIDOR (RENDER)
============================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});