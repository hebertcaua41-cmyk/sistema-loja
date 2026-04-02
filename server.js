require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const PDFDocument = require("pdfkit");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/* ================== MONGO ================== */

mongoose.connect(process.env.MONGO_URI)
.then(()=> console.log("MongoDB conectado"))
.catch(err=> console.log(err));

/* ================== MODELS ================== */

const Ordem = mongoose.model("Ordem", {
  numeroOS: Number,
  cliente: String,
  telefone: String,
  aparelho: String,
  defeito: String,
  valor: Number,
  garantia: String,
  status: String,
  data: { type: Date, default: Date.now }
});

const Estoque = mongoose.model("Estoque", {
  produto: String,
  quantidade: Number,
  preco: Number
});

const Venda = mongoose.model("Venda", {
  produto: String,
  quantidade: Number,
  valor: Number,
  data: { type: Date, default: Date.now }
});

const Despesa = mongoose.model("Despesa", {
  descricao: String,
  valor: Number,
  data: { type: Date, default: Date.now }
});

/* ================== ROTAS ================== */

app.get("/", (req,res)=>{
  res.sendFile(path.join(__dirname,"public","index.html"));
});

/* ================== OS ================== */

app.post("/os", async (req, res) => {

  const ultimaOS = await Ordem.findOne().sort({ numeroOS: -1 });
  const novoNumero = ultimaOS ? ultimaOS.numeroOS + 1 : 1;

  await Ordem.create({
    ...req.body,
    numeroOS: novoNumero
  });

  res.json({ ok: true });
});

app.get("/os", async(req,res)=>{
  const lista = await Ordem.find().sort({data:-1});
  res.json(lista);
});

/* ================== PDF ORDEM SHOPPING ================== */

app.get("/os/:id/pdf", async (req, res) => {
  try {
    const os = await Ordem.findById(req.params.id);
    if (!os) return res.status(404).send("OS não encontrada");

    const doc = new PDFDocument({ margin: 40 });
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    const logoPath = path.join(__dirname, "public", "logo.png");
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 40, 30, { width: 90 });
    }

    doc
      .fontSize(18)
      .text("HS CELL IMPORTS", 150, 40)
      .fontSize(10)
      .text("Assistência Técnica Especializada", 150, 60);

    doc
      .fontSize(14)
      .text(`ORDEM DE SERVIÇO Nº ${String(os.numeroOS).padStart(4,'0')}`, 40, 110);

    doc.moveTo(40,130).lineTo(550,130).stroke();

    doc
      .fontSize(11)
      .text(`Cliente: ${os.cliente}`,50,150)
      .text(`Telefone: ${os.telefone}`,50,170)
      .text(`Aparelho: ${os.aparelho}`,50,190)
      .text(`Serviço executado: ${os.defeito}`,50,210);

    doc.moveDown(3);

    doc.rect(40,250,520,60).stroke();

    doc
      .fontSize(12)
      .text(`Valor Total: R$ ${os.valor}`,50,270)
      .text(`Garantia: ${os.garantia} dias`,220,270)
      .text(`Status: ${os.status}`,400,270);

    doc.moveDown(6);

    doc.fontSize(10)
    .text("Declaro estar ciente das condições do serviço prestado.",50,340);

    doc.text("_________________________________________",50,390);
    doc.text("Assinatura do Cliente",50,405);

    doc.text("_________________________________________",350,390);
    doc.text("HS Cell Imports",350,405);

    doc.end();

  } catch (err) {
    console.log(err);
    res.status(500).send("Erro ao gerar PDF");
  }
});

/* ================== CERTIFICADO GARANTIA SHOPPING ================== */

app.get("/os/:id/garantia", async (req, res) => {
  try {
    const os = await Ordem.findById(req.params.id);
    if (!os) return res.status(404).send("OS não encontrada");

    const doc = new PDFDocument({ margin: 40 });
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    const logoPath = path.join(__dirname, "public", "logo.png");
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 40, 30, { width: 90 });
    }

    doc
      .fontSize(18)
      .text("HS CELL IMPORTS", 150, 40)
      .fontSize(12)
      .text("CERTIFICADO DE GARANTIA", 150, 60);

    doc.moveDown(3);

    doc
      .fontSize(11)
      .text(`Referente à OS Nº ${String(os.numeroOS).padStart(4,'0')}`)
      .text(`Cliente: ${os.cliente}`)
      .text(`Aparelho: ${os.aparelho}`)
      .text(`Serviço realizado: ${os.defeito}`)
      .text(`Prazo de garantia: ${os.garantia} dias`)
      .text(`Data: ${new Date(os.data).toLocaleDateString()}`);

    doc.moveDown(2);

    doc
      .text("CONDIÇÕES DA GARANTIA:")
      .moveDown(1)
      .text("• Garantia válida somente para o serviço descrito.")
      .text("• Danos por queda, água ou mau uso cancelam a garantia.")
      .text("• Violação do lacre invalida automaticamente.")
      .text("• Apresentar este certificado para validação.");

    doc.moveDown(4);

    doc.text("_________________________________________",50);
    doc.text("Assinatura do Cliente",50);

    doc.text("_________________________________________",350,doc.y-20);
    doc.text("HS Cell Imports",350);

    doc.end();

  } catch (err) {
    console.log(err);
    res.status(500).send("Erro ao gerar garantia");
  }
});

/* ================== ESTOQUE ================== */

app.post("/estoque", async(req,res)=>{
  await Estoque.create(req.body);
  res.json({ok:true});
});

app.get("/estoque", async(req,res)=>{
  const lista = await Estoque.find();
  res.json(lista);
});

/* ================== VENDAS ================== */

app.post("/venda", async(req,res)=>{
  const produto = await Estoque.findOne({produto:req.body.produto});
  if(!produto) return res.status(400).send("Produto não encontrado");

  if(produto.quantidade < req.body.quantidade)
    return res.status(400).send("Estoque insuficiente");

  produto.quantidade -= req.body.quantidade;
  await produto.save();

  const total = produto.preco * req.body.quantidade;

  await Venda.create({
    produto:req.body.produto,
    quantidade:req.body.quantidade,
    valor:total
  });

  res.json({ok:true});
});

app.get("/vendas", async(req,res)=>{
  const lista = await Venda.find().sort({data:-1});
  res.json(lista);
});

/* ================== DESPESAS ================== */

app.post("/despesa", async(req,res)=>{
  await Despesa.create(req.body);
  res.json({ok:true});
});

app.get("/despesas", async(req,res)=>{
  const lista = await Despesa.find().sort({data:-1});
  res.json(lista);
});

/* ================== SERVER ================== */

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log("Servidor rodando na porta "+PORT));