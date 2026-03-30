const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const PDFDocument = require("pdfkit");

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("MongoDB conectado"))
.catch(err=>console.log(err));

/* ================= MODELS ================= */

const osSchema = new mongoose.Schema({
  cliente:String,
  telefone:String,
  aparelho:String,
  defeito:String,
  valor:Number,
  garantia:String,
  status:String,
  data:{type:Date, default:Date.now}
});

const estoqueSchema = new mongoose.Schema({
  produto:String,
  quantidade:Number,
  preco:Number
});

const vendaSchema = new mongoose.Schema({
  cliente:String,
  produto:String,
  quantidade:Number,
  total:Number,
  data:{type:Date, default:Date.now}
});

const despesaSchema = new mongoose.Schema({
  descricao:String,
  valor:Number,
  data:{type:Date, default:Date.now}
});

const OS = mongoose.model("OS", osSchema);
const Estoque = mongoose.model("Estoque", estoqueSchema);
const Venda = mongoose.model("Venda", vendaSchema);
const Despesa = mongoose.model("Despesa", despesaSchema);

/* ================= OS ================= */

app.post("/os", async(req,res)=>{
  const nova = await OS.create(req.body);
  res.json(nova);
});

app.get("/os", async(req,res)=>{
  const lista = await OS.find().sort({data:-1});
  res.json(lista);
});

app.delete("/os/:id", async(req,res)=>{
  await OS.findByIdAndDelete(req.params.id);
  res.json({ok:true});
});

app.get("/os/:id/pdf", async(req,res)=>{
  const os = await OS.findById(req.params.id);
  if(!os) return res.status(404).send("OS não encontrada");

  const doc = new PDFDocument();
  res.setHeader("Content-Type","application/pdf");
  doc.pipe(res);

  doc.fontSize(18).text("HS Cell Imports",{align:"center"});
  doc.moveDown();
  doc.text(`Cliente: ${os.cliente}`);
  doc.text(`Telefone: ${os.telefone}`);
  doc.text(`Aparelho: ${os.aparelho}`);
  doc.text(`Defeito: ${os.defeito}`);
  doc.text(`Valor: R$ ${os.valor}`);
  doc.text(`Garantia: ${os.garantia}`);
  doc.text(`Status: ${os.status}`);
  doc.text(`Data: ${os.data}`);

  doc.end();
});

/* ================= ESTOQUE ================= */

app.post("/estoque", async(req,res)=>{
  const novo = await Estoque.create(req.body);
  res.json(novo);
});

app.get("/estoque", async(req,res)=>{
  const lista = await Estoque.find();
  res.json(lista);
});

/* ================= VENDA ================= */

app.post("/venda", async(req,res)=>{
  const {cliente, produto, quantidade} = req.body;

  const item = await Estoque.findOne({produto});
  if(!item) return res.status(400).json({erro:"Produto não encontrado"});
  if(item.quantidade < quantidade) return res.status(400).json({erro:"Estoque insuficiente"});

  item.quantidade -= quantidade;
  await item.save();

  const total = item.preco * quantidade;

  const novaVenda = await Venda.create({
    cliente,
    produto,
    quantidade,
    total
  });

  res.json(novaVenda);
});

app.get("/vendas", async (req, res) => {
  const lista = await Venda.find().sort({ data: -1 });
  res.json(lista);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(Servidor rodando na porta ${PORT});
});