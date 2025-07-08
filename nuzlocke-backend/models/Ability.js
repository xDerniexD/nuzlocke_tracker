const mongoose = require('mongoose');
const abilitySchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name_slug: { type: String, required: true, unique: true, index: true },
  name_en: { type: String, required: true },
  name_de: { type: String },
  effect_text_en: { type: String },
  effect_text_de: { type: String },
});
module.exports = mongoose.models.Ability || mongoose.model('Ability', abilitySchema);