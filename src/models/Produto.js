const mongoose = require("mongoose");

const ProdutoSchema = new mongoose.Schema({
  nome: String,
  quantidade: Number,
  custo: Number,
  preco: Number
});

module.exports = mongoose.model("Produto", ProdutoSchema);