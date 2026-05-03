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

const Loja = mongoose.model("Loja",{ nome:String })

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

const Venda = mongoose.model("Venda",{
  valor:Number,
  storeId:String,
  data:{type:Date, default:Date.now}
})

const Despesa = mongoose.model("Despesa",{
  valor:Number,
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

    console.log("Login: admin / admin")
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
  res.json(await Estoque.create({
    ...req.body,
    quantidade:Number(req.body.quantidade)||0,
    precoCusto:Number(req.body.precoCusto)||0,
    precoVenda:Number(req.body.precoVenda)||0,
    storeId:req.user.storeId
  }))
})

app.put("/estoque/:id", auth, async(req,res)=>{
  res.json(await Estoque.findByIdAndUpdate(req.params.id,req.body,{new:true}))
})

app.delete("/estoque/:id", auth, async(req,res)=>{
  await Estoque.findByIdAndDelete(req.params.id)
  res.json({ok:true})
})

// ===== VENDAS =====

app.get("/vendas", auth, async(req,res)=>{
  res.json(await Venda.find({storeId:req.user.storeId}))
})

app.post("/vendas", auth, async(req,res)=>{
  res.json(await Venda.create({
    valor:Number(req.body.valor)||0,
    storeId:req.user.storeId
  }))
})

// ===== DESPESAS =====

app.get("/despesas", auth, async(req,res)=>{
  res.json(await Despesa.find({storeId:req.user.storeId}))
})

app.post("/despesas", auth, async(req,res)=>{
  res.json(await Despesa.create({
    valor:Number(req.body.valor)||0,
    storeId:req.user.storeId
  }))
})

// ===== OS =====

app.post("/os", auth, async(req,res)=>{
  const ultima = await OS.findOne({storeId:req.user.storeId}).sort({numero:-1})
  const numero = ultima ? ultima.numero + 1 : 1

  const nova = await OS.create({
    ...req.body,
    valor:Number(req.body.valor)||0,
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
  const vendas = await Venda.find({storeId:req.user.storeId})
  const despesas = await Despesa.find({storeId:req.user.storeId})

  const estoqueCusto = estoque.reduce((t,i)=>t+(i.quantidade*i.precoCusto),0)
  const estoqueVenda = estoque.reduce((t,i)=>t+(i.quantidade*i.precoVenda),0)

  const totalVendas = vendas.reduce((t,v)=>t+(v.valor||0),0)
  const totalDespesas = despesas.reduce((t,d)=>t+(d.valor||0),0)

  res.json({
    estoqueCusto,
    estoqueVenda,
    lucroEstoque: estoqueVenda - estoqueCusto,
    totalVendas,
    totalDespesas,
    lucroLiquido: totalVendas - totalDespesas
  })
})

// ===== PDF COM QR =====

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

  doc.moveDown()
  doc.text("Garantia:")
  doc.text(os.garantia || "90 dias")

  doc.end()
})

// ===== START =====

const PORT = process.env.PORT || 3000
app.listen(PORT,()=>console.log("Servidor rodando"))