const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI);

/* ================= SCHEMAS ================= */

const UsuarioSchema = new mongoose.Schema({
  usuario: String,
  senha: String,
  nivel: { type: String, default: "funcionario" },
  resetToken: String,
  resetExpira: Date
});

const EstoqueSchema = new mongoose.Schema({
  nome: String,
  quantidade: Number,
  custoUnitario: Number
});

const OrdemSchema = new mongoose.Schema({
  cliente: String,
  aparelho: String,
  problema: String,
  valorServico: Number,
  garantia: String,
  data: { type: Date, default: Date.now }
});

const VendaSchema = new mongoose.Schema({
  cliente: String,
  produto: String,
  quantidade: Number,
  valorUnitario: Number,
  total: Number,
  data: { type: Date, default: Date.now }
});

const Usuario = mongoose.model("Usuario", UsuarioSchema);
const Estoque = mongoose.model("Estoque", EstoqueSchema);
const Ordem = mongoose.model("Ordem", OrdemSchema);
const Venda = mongoose.model("Venda", VendaSchema);

/* ================= MIDDLEWARE ================= */

function auth(req,res,next){
  const authHeader = req.headers.authorization;
  if(!authHeader) return res.status(401).json({erro:"Sem token"});

  const token = authHeader.split(" ")[1];

  try{
    const decoded = jwt.verify(token,"SEGREDO_SUPER_FORTE");
    req.user = decoded;
    next();
  }catch{
    res.status(401).json({erro:"Token inválido"});
  }
}

function somenteAdmin(req,res,next){
  if(req.user.nivel !== "admin"){
    return res.status(403).json({erro:"Acesso apenas para admin"});
  }
  next();
}

/* ================= AUTH ================= */

// Registrar usuário
app.post("/register", async (req,res)=>{
  const {usuario, senha, nivel} = req.body;

  const hash = await bcrypt.hash(senha, 10);

  const novo = await Usuario.create({
    usuario,
    senha: hash,
    nivel: nivel || "funcionario"
  });

  res.json(novo);
});

// Login
app.post("/login", async (req,res)=>{
  const {usuario, senha} = req.body;

  const user = await Usuario.findOne({usuario});
  if(!user) return res.status(400).json({erro:"Usuário não encontrado"});

  const senhaValida = await bcrypt.compare(senha, user.senha);
  if(!senhaValida) return res.status(400).json({erro:"Senha inválida"});

  const token = jwt.sign(
    {id:user._id, nivel:user.nivel},
    "SEGREDO_SUPER_FORTE",
    {expiresIn:"1d"}
  );

  res.json({token, nivel:user.nivel});
});

/* ================= RECUPERAÇÃO ================= */

app.post("/recuperar", async (req,res)=>{
  const {usuario} = req.body;

  const user = await Usuario.findOne({usuario});
  if(!user) return res.json({erro:"Usuário não encontrado"});

  const token = Math.random().toString(36).substring(2);

  user.resetToken = token;
  user.resetExpira = Date.now() + 3600000;
  await user.save();

  res.json({mensagem:"Token gerado", token});
});

app.post("/resetar", async (req,res)=>{
  const {token, novaSenha} = req.body;

  const user = await Usuario.findOne({
    resetToken: token,
    resetExpira: {$gt: Date.now()}
  });

  if(!user) return res.json({erro:"Token inválido ou expirado"});

  user.senha = await bcrypt.hash(novaSenha, 10);
  user.resetToken = null;
  user.resetExpira = null;

  await user.save();

  res.json({mensagem:"Senha atualizada"});
});

/* ================= ESTOQUE ================= */

app.post("/estoque", auth, async (req,res)=>{
  const novo = await Estoque.create(req.body);
  res.json(novo);
});

app.get("/estoque", auth, async (req,res)=>{
  const lista = await Estoque.find();
  res.json(lista);
});

/* ================= ORDENS ================= */

app.post("/ordens", auth, async (req,res)=>{
  const nova = await Ordem.create(req.body);
  res.json(nova);
});

app.get("/ordens", auth, async (req,res)=>{
  const lista = await Ordem.find();
  res.json(lista);
});

app.put("/ordens/:id", auth, async (req,res)=>{
  const ordem = await Ordem.findByIdAndUpdate(req.params.id, req.body, {new:true});
  res.json(ordem);
});

// Somente admin pode excluir
app.delete("/ordens/:id", auth, somenteAdmin, async (req,res)=>{
  await Ordem.findByIdAndDelete(req.params.id);
  res.json({mensagem:"Ordem excluída"});
});

/* ================= VENDAS ================= */

app.post("/vendas", auth, async (req,res)=>{
  const {cliente,produto,quantidade,valorUnitario} = req.body;

  const estoque = await Estoque.findOne({nome:produto});
  if(!estoque || estoque.quantidade < quantidade){
    return res.json({erro:"Estoque insuficiente"});
  }

  estoque.quantidade -= quantidade;
  await estoque.save();

  const venda = await Venda.create({
    cliente,
    produto,
    quantidade,
    valorUnitario,
    total: quantidade * valorUnitario
  });

  res.json(venda);
});

app.get("/vendas", auth, async (req,res)=>{
  const lista = await Venda.find();
  res.json(lista);
});

/* ================= SERVIR FRONT ================= */

app.use(express.static(path.join(__dirname,"../public")));
app.get("*",(req,res)=>{
  res.sendFile(path.join(__dirname,"../public/index.html"));
});

/* ================= START ================= */

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log("Servidor rodando"));