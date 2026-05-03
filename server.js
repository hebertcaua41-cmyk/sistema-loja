<<<<<<< HEAD
require("dotenv").config()
const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")
const PDFDocument = require("pdfkit")
const QRCode = require("qrcode")

const app = express()
app.use(express.json())
app.use(cors())
app.use(express.static("public"))

mongoose.connect(process.env.MONGO_URI)

// ===== MODELS =====

const Loja = mongoose.model("Loja",{
  nome:String
})

const Usuario = mongoose.model("Usuario",{
  usuario:String,
  senha:String,
  storeId:String
})

const Cliente = mongoose.model("Cliente",{
  nome:String,
  telefone:String,
  storeId:String
})

const Estoque = mongoose.model("Estoque",{
  produto:String,
  quantidade:Number,
  precoCusto:Number,
  precoVenda:Number,
  storeId:String
})

const OS = mongoose.model("OS",{
  numero:Number,
  cliente:String,
  clienteId:String,
  aparelho:String,
  servico:String,
  valor:Number,
  garantia:String,
  storeId:String,
  data:{type:Date, default:Date.now}
})

// ===== INIT =====

async function init(){
  const loja = await Loja.findOne()
  if(!loja){
    const novaLoja = await Loja.create({nome:"Matriz"})
    const hash = await bcrypt.hash("admin",10)

    await Usuario.create({
      usuario:"admin",
      senha:hash,
      storeId:novaLoja._id
    })

    console.log("Login: admin/admin")
  }
}
init()

// ===== AUTH =====

function auth(req,res,next){
  const token = req.headers.authorization
  if(!token) return res.status(401).json({erro:"Sem token"})

  try{
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "segredo")
    req.user = decoded
    next()
  }catch{
    res.status(401).json({erro:"Token inválido"})
  }
}

// ===== LOGIN =====

app.post("/login", async(req,res)=>{
  const user = await Usuario.findOne({usuario:req.body.usuario})
  if(!user) return res.status(401).json({erro:"Usuário não encontrado"})

  const ok = await bcrypt.compare(req.body.senha,user.senha)
  if(!ok) return res.status(401).json({erro:"Senha incorreta"})

  const token = jwt.sign({
    id:user._id,
    storeId:user.storeId
  }, process.env.JWT_SECRET || "segredo")

  res.json({token})
})

// ===== CLIENTES =====

app.post("/clientes", auth, async(req,res)=>{
  res.json(await Cliente.create({...req.body, storeId:req.user.storeId}))
})

app.get("/clientes", auth, async(req,res)=>{
  res.json(await Cliente.find({storeId:req.user.storeId}))
})

// ===== ESTOQUE =====

app.get("/estoque", auth, async(req,res)=>{
  res.json(await Estoque.find({storeId:req.user.storeId}))
})

app.post("/estoque", auth, async(req,res)=>{
  res.json(await Estoque.create({...req.body, storeId:req.user.storeId}))
})

app.put("/estoque/:id", auth, async(req,res)=>{
  res.json(await Estoque.findByIdAndUpdate(req.params.id,req.body,{new:true}))
})

app.delete("/estoque/:id", auth, async(req,res)=>{
  await Estoque.findByIdAndDelete(req.params.id)
  res.json({ok:true})
})

// ===== OS =====

app.post("/os", auth, async(req,res)=>{
  const ultima = await OS.findOne({storeId:req.user.storeId}).sort({numero:-1})
  const numero = ultima ? ultima.numero + 1 : 1

  const nova = await OS.create({
    ...req.body,
    numero,
    storeId:req.user.storeId
  })

  res.json(nova)
})

app.get("/os", auth, async(req,res)=>{
  res.json(await OS.find({storeId:req.user.storeId}))
})

// ===== DASHBOARD =====

app.get("/dashboard", auth, async(req,res)=>{
  const estoque = await Estoque.find({storeId:req.user.storeId})

  const custo = estoque.reduce((t,i)=>t+(i.quantidade*i.precoCusto),0)
  const venda = estoque.reduce((t,i)=>t+(i.quantidade*i.precoVenda),0)

  res.json({
    custo,
    venda,
    lucro: venda - custo
  })
})

// ===== PDF =====

app.get("/os/:id/pdf", auth, async(req,res)=>{
  const os = await OS.findById(req.params.id)

  const doc = new PDFDocument()
  res.setHeader("Content-Type","application/pdf")
  doc.pipe(res)

  const url = `https://seusite.onrender.com/os/${os._id}`
  const qr = await QRCode.toDataURL(url)

  doc.fontSize(16).text("ORDEM DE SERVIÇO")
  doc.text(`Nº ${os.numero}`)
  doc.text(`Cliente: ${os.cliente}`)
  doc.text(`Aparelho: ${os.aparelho}`)
  doc.text(`Serviço: ${os.servico}`)
  doc.text(`Valor: R$ ${os.valor}`)

  doc.image(qr, 400, 50, {width:80})

  doc.text("Garantia:")
  doc.text(os.garantia || "90 dias")

  doc.end()
})

// ===== SERVER =====

const PORT = process.env.PORT || 3000
app.listen(PORT,()=>console.log("Multi-loja rodando"))
=======
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
>>>>>>> faa33035cbd2cce85d6828b0dfb63612b7dde263
