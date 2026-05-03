const mongoose = require("mongoose");

const VendaSchema = new mongoose.Schema({
  cliente: String,
  produto: String,
  valor: Number,
  data: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Venda", VendaSchema);