const mongoose = require('mongoose');

const MoveVersionDetailSchema = new mongoose.Schema({
  // Referenz auf das Move-Dokument
  move: { type: mongoose.Schema.Types.ObjectId, ref: 'Move' }, 
  level: { type: Number, required: true },
  name_slug: { type: String } // Zur einfacheren Zuordnung
}, { _id: false });

const PokemonSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  pokedexId: { type: Number, required: true },
  name_en: { type: String, required: true },
  name_de: { type: String },
  evolutionChainId: { type: Number },
  types: { type: [String], default: [] },
  baseStats: { type: Object },
  abilities: { type: Array, default: [] },
  // KORREKTUR: Umstrukturierung für die Referenzierung
  moves: {
    platinum: {
      'level-up': [MoveVersionDetailSchema],
      'machine': [MoveVersionDetailSchema],
      'tutor': [MoveVersionDetailSchema],
      'egg': [MoveVersionDetailSchema],
    }
  }
});

PokemonSchema.index({ name_en: 'text', name_de: 'text' });
module.exports = mongoose.models.Pokemon || mongoose.model('Pokemon', PokemonSchema);