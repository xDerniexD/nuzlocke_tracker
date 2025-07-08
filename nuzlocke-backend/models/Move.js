const mongoose = require('mongoose');
const moveSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name_slug: { type: String, required: true, unique: true, index: true },
  name_en: { type: String, required: true },
  name_de: { type: String },
  type: { type: String },
  damage_class: { type: String },
  power: { type: Number, default: null },
  pp: { type: Number, default: null },
  accuracy: { type: Number, default: null },
});
module.exports = mongoose.models.Move || mongoose.model('Move', moveSchema);