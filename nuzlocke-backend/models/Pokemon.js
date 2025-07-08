const mongoose = require('mongoose');

const MoveVersionDetailSchema = new mongoose.Schema({
  move: { type: mongoose.Schema.Types.ObjectId, ref: 'Move' }, 
  level: { type: Number, required: true },
}, { _id: false });

const AbilitySlotSchema = new mongoose.Schema({
    ability: { type: mongoose.Schema.Types.ObjectId, ref: 'Ability' },
    is_hidden: { type: Boolean, required: true }
}, { _id: false });

const PokemonSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  pokedexId: { type: Number, required: true },
  name_slug: { type: String, required: true, unique: true, index: true },
  name_en: { type: String, required: true },
  name_de: { type: String },
  evolutionChainId: { type: Number }, // Dieses Feld ist entscheidend
  types: { type: [String], default: [] },
  baseStats: { type: Object },
  abilities: [AbilitySlotSchema],
  moves: { type: Object }
});

PokemonSchema.index({ name_en: 'text', name_de: 'text' });
module.exports = mongoose.models.Pokemon || mongoose.model('Pokemon', PokemonSchema);