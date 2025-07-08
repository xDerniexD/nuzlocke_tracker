const mongoose = require('mongoose');

const moveSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name_slug: { type: String, required: true, unique: true, index: true },
  name_en: { type: String, required: true },
  name_de: { type: String }, // Optional
  type: { type: String, required: true },
  damage_class: { type: String, required: true },
  power: { type: Number, default: null },
  pp: { type: Number, required: true },
  accuracy: { type: Number, default: null },
  effect_text_en: { type: String }, // Optional
  effect_text_de: { type: String }, // Optional
});

moveSchema.index({ name_en: 'text', name_de: 'text' });

module.exports = mongoose.models.Move || mongoose.model('Move', moveSchema);