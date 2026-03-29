const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "../public")));


// ==================
// CONEXÃO MONGODB
// ==================

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB conectado"))
.catch(err => console.log(err));


// ==================
// MODELO USUÁRIO
// ==================

const UsuarioSchema = new mongoose.Schema({
  usuario: String,
  senha: String,
  nivel: String
});

const Usuario = mongoose.model("Usuario", UsuarioSchema);


// ==================
// CRIAR ADMIN AUTOMÁTICO
// ==================

async function criarAdminPadrao() {
  const existe = await Usuario.findOne({ usuario: "admin" });

  if (!existe) {
    const senhaHash = await bcrypt.hash("123456", 10);

    await Usuario.create({
      usuario: "admin",
      senha: senhaHash,
      nivel: "admin"
    });

    console.log("Admin padrão criado: admin / 123456");
  }
}

criarAdminPadrao();


// ==================
// LOGIN
// ==================

app.post("/login", async (req, res) => {
  try {
    const { usuario, senha } = req.body;

    if (!usuario || !senha) {
      return res.status(400).json({ erro: "Preencha todos os campos" });
    }

    const user = await Usuario.findOne({ usuario });

    if (!user) {
      return res.status(400).json({ erro: "Usuário não encontrado" });
    }

    const senhaValida = await bcrypt.compare(senha, user.senha);

    if (!senhaValida) {
      return res.status(400).json({ erro: "Senha inválida" });
    }

    const token = jwt.sign(
      { id: user._id, nivel: user.nivel },
      "segredo_super",
      { expiresIn: "8h" }
    );

    res.json({ mensagem: "Login realizado", token });

  } catch (error) {
    res.status(500).json({ erro: "Erro no servidor" });
  }
});


// ==================
// RECUPERAR (SIMPLES)
// ==================

app.post("/recuperar", async (req, res) => {
  const { usuario } = req.body;

  const user = await Usuario.findOne({ usuario });

  if (!user) {
    return res.status(404).json({ erro: "Usuário não encontrado" });
  }

  res.json({ mensagem: "Procure o administrador para redefinir sua senha." });
});


// ==================
// SERVIR INDEX
// ==================

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});


// ==================
// INICIAR SERVIDOR
// ==================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});