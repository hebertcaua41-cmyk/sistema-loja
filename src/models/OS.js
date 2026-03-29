const mongoose = require("mongoose");

const OSSchema = new mongoose.Schema({
  cliente: String,
  aparelho: String,
  problema: String,
  valor: Number,
  status: { type: String, default: "Aberta" },
  data: { type: Date, default: Date.now }
});

module.exports = mongoose.model("OS", OSSchema);