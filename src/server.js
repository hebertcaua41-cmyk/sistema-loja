const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const PDFDocument = require("pdfkit");
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

/* ================= AUTH ================= */

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
    return res.status(403).json({erro:"Apenas admin"});
  }
  next();
}

/* ================= LOGIN ================= */

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

app.delete("/ordens/:id", auth, somenteAdmin, async (req,res)=>{
  await Ordem.findByIdAndDelete(req.params.id);
  res.json({mensagem:"Ordem excluída"});
});

/* ================= GERAR PDF DA OS ================= */

app.get("/ordens/:id/pdf", auth, async (req,res)=>{
  const ordem = await Ordem.findById(req.params.id);
  if(!ordem) return res.status(404).json({erro:"OS não encontrada"});

  const doc = new PDFDocument();

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=OS-${ordem._id}.pdf`);

  doc.pipe(res);

  doc.fontSize(20).text("HS CELL IMPORTS", {align:"center"});
  doc.moveDown();

  doc.fontSize(14).text(`Ordem de Serviço`);
  doc.moveDown();

  doc.text(`Cliente: ${ordem.cliente}`);
  doc.text(`Aparelho: ${ordem.aparelho}`);
  doc.text(`Problema: ${ordem.problema}`);
  doc.text(`Valor: R$ ${ordem.valorServico}`);
  doc.text(`Garantia: ${ordem.garantia}`);
  doc.text(`Data: ${new Date(ordem.data).toLocaleDateString()}`);

  doc.moveDown();
  doc.text("Assinatura do Cliente: __________________________");

  doc.end();
});

/* ================= SERVIR FRONT ================= */

app.use(express.static(path.join(__dirname,"../public")));
app.get("*",(req,res)=>{
  res.sendFile(path.join(__dirname,"../public/index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log("Servidor rodando"));