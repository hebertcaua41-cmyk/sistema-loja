const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI);

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

const Estoque = mongoose.model("Estoque", EstoqueSchema);
const Ordem = mongoose.model("Ordem", OrdemSchema);
const Venda = mongoose.model("Venda", VendaSchema);

/* HEALTH */
app.get("/health", (req,res)=>{
  res.json({status:"online"});
});

/* ESTOQUE */
app.post("/estoque", async (req,res)=>{
  const novo = await Estoque.create(req.body);
  res.json(novo);
});

app.get("/estoque", async (req,res)=>{
  const lista = await Estoque.find();
  res.json(lista);
});

/* ORDEM */
app.post("/ordens", async (req,res)=>{
  const nova = await Ordem.create(req.body);
  res.json(nova);
});

app.get("/ordens", async (req,res)=>{
  const lista = await Ordem.find();
  res.json(lista);
});

app.put("/ordens/:id", async (req,res)=>{
  const ordem = await Ordem.findByIdAndUpdate(req.params.id, req.body, {new:true});
  res.json(ordem);
});

app.delete("/ordens/:id", async (req,res)=>{
  await Ordem.findByIdAndDelete(req.params.id);
  res.json({mensagem:"Excluída"});
});

/* VENDA */
app.post("/vendas", async (req,res)=>{
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

app.get("/vendas", async (req,res)=>{
  const lista = await Venda.find();
  res.json(lista);
});

/* SERVIR FRONTEND */
app.use(express.static(path.join(__dirname,"../public")));
app.get("*",(req,res)=>{
  res.sendFile(path.join(__dirname,"../public/index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log("Servidor rodando"));