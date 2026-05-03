const mongoose = require("mongoose");

const DespesaSchema = new mongoose.Schema({
  descricao: String,
  valor: Number,
  data: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Despesa", DespesaSchema);