const mongoose = require('mongoose');

const pokemonSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  pokedexId: { type: Number, required: true },
  name_en: { type: String, required: true },
  name_de: { type: String },
  evolutionChainId: { type: Number },
  evolutions: { type: Array, default: [] },
  types: { type: [String], default: [] },
  baseStats: { type: Object },
  moves: { type: Object },
  abilities: { type: Array, default: [] },
  catchRate: { type: Number },
  genderRatio: { type: Number },
  heldItems: { type: Array, default: [] },
});

// Erstellt einen Text-Index für eine effiziente, sprachübergreifende Suche
pokemonSchema.index({ name_en: 'text', name_de: 'text' });

module.exports = mongoose.models.Pokemon || mongoose.model('Pokemon', pokemonSchema);
