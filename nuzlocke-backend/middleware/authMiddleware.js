const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Wir brauchen das User-Modell, um den Nutzer zu finden

// Unsere "Türsteher"-Funktion
const protect = async (req, res, next) => {
  let token;

  // Der Token wird üblicherweise im "Authorization"-Header der Anfrage gesendet
  // und sieht so aus: "Bearer <langer_token_string>"
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // 1. Den Token aus dem Header extrahieren (das Wort "Bearer" entfernen)
      token = req.headers.authorization.split(' ')[1];

      // 2. Den Token verifizieren (prüfen, ob er gültig und nicht abgelaufen ist)
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 3. Den Nutzer, der zum Token gehört, in der Datenbank finden und an die Anfrage anhängen
      // Wir holen den Nutzer, aber ohne sein Passwort-Feld
      req.user = await User.findById(decoded.id).select('-password');

      // 4. Alles gut, weiter zur nächsten Funktion (zur eigentlichen Endpunkt-Logik)
      next();

    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Nicht autorisiert, Token fehlgeschlagen' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Nicht autorisiert, kein Token' });
  }
};

module.exports = { protect };