require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Pokemon = require('./models/Pokemon'); // Importiere unser neues Modell

const dbURI = process.env.MONGODB_URI;

const seedDB = async () => {
  try {
    // 1. Mit der Datenbank verbinden
    await mongoose.connect(dbURI);
    console.log('Erfolgreich mit MongoDB verbunden...');

    // 2. Die bestehende Collection leeren, um Duplikate zu vermeiden
    console.log('Lösche alte Pokémon-Daten...');
    await Pokemon.deleteMany({});
    console.log('Alte Daten erfolgreich gelöscht.');

    // 3. Die pokedex.json-Datei lesen
    console.log('Lese pokedex.json aus dem output-Ordner...');
    const pokedexPath = path.join(__dirname, 'output', 'pokedex.json');
    const pokedexData = JSON.parse(fs.readFileSync(pokedexPath, 'utf-8'));
    console.log(`${pokedexData.length} Pokémon gefunden.`);

    // 4. Alle Pokémon in die Datenbank einfügen
    console.log('Füge neue Pokémon-Daten in die Datenbank ein... (Dies kann einige Minuten dauern)');
    await Pokemon.insertMany(pokedexData);
    console.log('--- DATENBANK ERFOLGREICH GEFÜLLT! ---');

  } catch (err) {
    console.error('Ein Fehler ist aufgetreten:', err);
  } finally {
    // 5. Verbindung zur Datenbank trennen
    mongoose.connection.close();
    console.log('Datenbank-Verbindung getrennt.');
  }
};

// Führe das Skript aus
seedDB();
