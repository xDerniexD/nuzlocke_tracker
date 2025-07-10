const mongoose = require('mongoose');

// NEU: Schema für legendäre Begegnungen
const legendaryEncounterSchema = new mongoose.Schema({
  pokemonId: { type: Number, required: true },
  pokemonName: { type: String, required: true },
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  encounterType: { type: String, default: null }
}, { _id: true }); // Jede Begegnung bekommt eine eigene ID

const encounterSchema = new mongoose.Schema({
  locationName_de: { type: String, required: true },
  locationName_en: { type: String, required: true },
  sequence: { type: Number },
  encounterType: {
    type: String,
    required: true,
    enum: ['standard', 'static', 'gift', 'event'],
    default: 'standard'
  },
  levelCap: { type: Number, default: null },
  badgeImage: { type: String, default: null },
  pokemon1: { type: String, default: null },
  pokemonId1: { type: Number, default: null },
  types1: { type: [String], default: [] },
  evolutionChainId1: { type: Number, required: false },
  nickname1: { type: String, default: null },
  status1: { type: String, required: true, enum: ['pending', 'caught', 'fainted', 'missed', 'gift'], default: 'pending' },
  faintReason1: { type: String, default: null },
  pokemon2: { type: String, default: null },
  pokemonId2: { type: Number, default: null },
  types2: { type: [String], default: [] },
  evolutionChainId2: { type: Number, required: false },
  nickname2: { type: String, default: null },
  status2: { type: String, required: true, enum: ['pending', 'caught', 'fainted', 'missed', 'gift'], default: 'pending' },
  faintReason2: { type: String, default: null },
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
  spectatorId: { type: String, unique: true, sparse: true },
  rules: {
    dupesClause: { type: Boolean, default: true },
    shinyClause: { type: Boolean, default: true },
    customRules: { type: String, default: '' },
  },
  team: [{ type: mongoose.Schema.Types.ObjectId }],
  encounters: [encounterSchema],
  // NEU: Das Array für die legendären Begegnungen
  legendaryEncounters: [legendaryEncounterSchema]
}, {
  timestamps: true
});

module.exports = mongoose.models.Nuzlocke || mongoose.model('Nuzlocke', nuzlockeSchema);