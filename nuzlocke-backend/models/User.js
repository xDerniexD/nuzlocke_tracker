const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    // unique: true, // <-- DIESE ZEILE WURDE ENTFERNT, da der Index unten ausreicht.
    trim: true
  },
  password: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Stellt sicher, dass die 'unique' Prüfung case-insensitive ist.
// Diese Zeile ist mächtiger und bleibt bestehen.
userSchema.index({ username: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });


// Der Hook zum Hashen des Passworts bleibt unverändert
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
