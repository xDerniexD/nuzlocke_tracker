const mongoose = require('mongoose');

const encounterSchema = new mongoose.Schema({
  // Ersetzt das alte 'locationName'-Feld
  locationName_de: { type: String, required: true },
  locationName_en: { type: String, required: true },
  
  sequence: { type: Number },
  isEncounter: { type: Boolean, default: false },
  isEvent: { type: Boolean, default: false },
  isTrainer: { type: Boolean, default: false },

  levelCap: { type: Number, default: null },
  team: { type: Array, default: [] },
  badgeImage: { type: String, default: null },

  // Spieler 1
  pokemon1: { type: String, default: null },
  pokemonId1: { type: Number, default: null },
  types1: { type: [String], default: [] },
  evolutionChainId1: { type: Number, required: false },
  nickname1: { type: String, default: null },
  status1: { type: String, required: true, enum: ['pending', 'caught', 'fainted', 'missed', 'gift'], default: 'pending' },

  // Spieler 2
  pokemon2: { type: String, default: null },
  pokemonId2: { type: Number, default: null },
  types2: { type: [String], default: [] },
  evolutionChainId2: { type: Number, required: false },
  nickname2: { type: String, default: null },
  status2: { type: String, required: true, enum: ['pending', 'caught', 'fainted', 'missed', 'gift'], default: 'pending' },
});

const nuzlockeSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  runName: { type: String, required: true, trim: true },
  game: { type: String, required: true },
  type: { type: String, required: true, enum: ['solo', 'soullink'], default: 'solo' },
  isArchived: { type: Boolean, default: false },
  inviteCode: { type: String, unique: true, sparse: true },
  rules: {
    dupesClause: { type: Boolean, default: true },
    shinyClause: { type: Boolean, default: true },
    customRules: { type: String, default: '' },
  },
  encounters: [encounterSchema] 
}, {
  timestamps: true
});

module.exports = mongoose.models.Nuzlocke || mongoose.model('Nuzlocke', nuzlockeSchema);