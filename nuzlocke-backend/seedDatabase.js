require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Pokemon = require('./models/Pokemon');
// NEU: Importiere das Move-Modell
const Move = require('./models/Move'); 

const dbURI = process.env.MONGODB_URI;

const seedDB = async () => {
  try {
    await mongoose.connect(dbURI);
    console.log('Erfolgreich mit MongoDB verbunden...');

    // --- Pokémon Sektion (unverändert) ---
    console.log('Lösche alte Pokémon-Daten...');
    await Pokemon.deleteMany({});
    console.log('Alte Pokémon-Daten erfolgreich gelöscht.');
    const pokedexPath = path.join(__dirname, 'output', 'pokedex.json');
    const pokedexData = JSON.parse(fs.readFileSync(pokedexPath, 'utf-8'));
    console.log(`${pokedexData.length} Pokémon gefunden.`);
    console.log('Füge neue Pokémon-Daten in die Datenbank ein...');
    await Pokemon.insertMany(pokedexData);
    console.log('--- POKÉMON-DATENBANK ERFOLGREICH GEFÜLLT! ---');

    // --- NEU: Attacken Sektion ---
    console.log('\nLösche alte Attacken-Daten...');
    await Move.deleteMany({});
    console.log('Alte Attacken-Daten erfolgreich gelöscht.');
    const movesPath = path.join(__dirname, 'output', 'moves.json');
    const movesData = JSON.parse(fs.readFileSync(movesPath, 'utf-8'));
    console.log(`${movesData.length} Attacken gefunden.`);
    console.log('Füge neue Attacken-Daten in die Datenbank ein...');
    await Move.insertMany(movesData);
    console.log('--- ATTACKEN-DATENBANK ERFOLGREICH GEFÜLLT! ---');


  } catch (err) {
    console.error('Ein Fehler ist aufgetreten:', err);
  } finally {
    mongoose.connection.close();
    console.log('\nDatenbank-Verbindung getrennt.');
  }
};

seedDB();