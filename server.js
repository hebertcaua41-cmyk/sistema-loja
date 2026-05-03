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

const Usuario = mongoose.model("Usuario",{
  usuario:String,
  senha:String,
  role:{type:String, default:"admin"},
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

const Venda = mongoose.model("Venda",{valor:Number,storeId:String,data:{type:Date,default:Date.now}})
const Despesa = mongoose.model("Despesa",{valor:Number,storeId:String})

// ===== AUTH =====

function auth(req,res,next){
  const token = req.headers.authorization
  if(!token) return res.status(401).json({erro:"Sem token"})
  try{
    req.user = jwt.verify(token,"segredo")
    next()
  }catch{
    res.status(401).json({erro:"Token inválido"})
  }
}

function allow(roles){
  return (req,res,next)=>{
    if(!roles.includes(req.user.role)) return res.status(403).json({erro:"Sem permissão"})
    next()
  }
}

// ===== LOGIN =====

app.post("/login", async(req,res)=>{
  const u = await Usuario.findOne({usuario:req.body.usuario})
  if(!u) return res.status(401).json({erro:"Erro"})

  const ok = await bcrypt.compare(req.body.senha,u.senha)
  if(!ok) return res.status(401).json({erro:"Erro"})

  const token = jwt.sign({
    id:u._id,
    storeId:u.storeId,
    role:u.role
  },"segredo")

  res.json({token})
})

// ===== USUÁRIOS =====

app.post("/usuarios", auth, allow(["admin"]), async(req,res)=>{
  const hash = await bcrypt.hash(req.body.senha,10)
  res.json(await Usuario.create({
    usuario:req.body.usuario,
    senha:hash,
    role:req.body.role,
    storeId:req.user.storeId
  }))
})

// ===== CLIENTES =====

app.post("/clientes", auth, async(req,res)=>{
  res.json(await Cliente.create({...req.body,storeId:req.user.storeId}))
})

app.get("/clientes", auth, async(req,res)=>{
  res.json(await Cliente.find({storeId:req.user.storeId}))
})

app.get("/clientes/busca", auth, async(req,res)=>{
  const q = req.query.q || ""
  res.json(await Cliente.find({
    storeId:req.user.storeId,
    nome:{$regex:q,$options:"i"}
  }))
})

app.get("/cliente/:id/os", auth, async(req,res)=>{
  res.json(await OS.find({
    clienteId:req.params.id,
    storeId:req.user.storeId
  }).sort({numero:-1}))
})

// ===== ESTOQUE =====

app.get("/estoque", auth, async(req,res)=>{
  res.json(await Estoque.find({storeId:req.user.storeId}))
})

app.post("/estoque", auth, async(req,res)=>{
  res.json(await Estoque.create({
    ...req.body,
    quantidade:Number(req.body.quantidade)||0,
    precoCusto:Number(req.body.precoCusto)||0,
    precoVenda:Number(req.body.precoVenda)||0,
    storeId:req.user.storeId
  }))
})

// ===== OS =====

app.post("/os", auth, async(req,res)=>{
  const ultima = await OS.findOne({storeId:req.user.storeId}).sort({numero:-1})
  const numero = ultima ? ultima.numero+1 : 1

  res.json(await OS.create({
    ...req.body,
    numero,
    valor:Number(req.body.valor)||0,
    storeId:req.user.storeId
  }))
})

app.get("/os", auth, async(req,res)=>{
  res.json(await OS.find({storeId:req.user.storeId}))
})

// ===== DASHBOARD =====

app.get("/dashboard", auth, async(req,res)=>{
  const estoque = await Estoque.find({storeId:req.user.storeId})

  const custo = estoque.reduce((t,i)=>t+(i.quantidade*i.precoCusto),0)
  const venda = estoque.reduce((t,i)=>t+(i.quantidade*i.precoVenda),0)

  res.json({custo,venda,lucro:venda-custo})
})

// ===== GRAFICO MENSAL =====

app.get("/dashboard/mensal", auth, async(req,res)=>{
  const vendas = await Venda.find({storeId:req.user.storeId})
  const map={}

  vendas.forEach(v=>{
    const d=new Date(v.data)
    const chave=`${d.getFullYear()}-${d.getMonth()+1}`
    map[chave]=(map[chave]||0)+(v.valor||0)
  })

  res.json({
    labels:Object.keys(map),
    valores:Object.values(map)
  })
})

// ===== PDF + QR =====

app.get("/os/:id/pdf", auth, async(req,res)=>{
  const os = await OS.findById(req.params.id)
  const doc = new PDFDocument()

  res.setHeader("Content-Type","application/pdf")
  doc.pipe(res)

  const qr = await QRCode.toDataURL("OS "+os.numero)

  doc.text("ORDEM DE SERVIÇO")
  doc.text("Nº "+os.numero)
  doc.text("Cliente: "+os.cliente)
  doc.text("Serviço: "+os.servico)
  doc.text("Valor: R$ "+os.valor)

  doc.image(qr,{width:80})

  doc.end()
})

// ===== IMPRESSÃO TÉRMICA =====

app.get("/os/:id/print", auth, async(req,res)=>{
  const os = await OS.findById(req.params.id)

  res.send(`
  <body style="width:58mm;font-family:monospace">
  <h3>HS CELL</h3>
  OS ${os.numero}<br>
  ${os.cliente}<br>
  ${os.servico}<br>
  R$ ${os.valor}
  <script>window.print()</script>
  </body>
  `)
})

// ===== BACKUP =====

app.get("/backup", auth, allow(["admin"]), async(req,res)=>{
  const storeId = req.user.storeId

  const data = {
    clientes: await Cliente.find({storeId}),
    estoque: await Estoque.find({storeId}),
    os: await OS.find({storeId}),
    vendas: await Venda.find({storeId}),
    despesas: await Despesa.find({storeId})
  }

  res.json(data)
})

// ===== START =====

app.listen(process.env.PORT||3000,()=>console.log("Rodando 🚀"))