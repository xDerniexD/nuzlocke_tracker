const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const Move = require('./models/Move');

const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2';

const connectDB = async () => {
    if (!process.env.MONGODB_URI) {
        console.error('\x1b[31m%s\x1b[0m', 'Fehler: MONGODB_URI nicht gefunden!');
        process.exit(1);
    }
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB für Attacken-Seeding verbunden...');
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};

/**
 * Holt die Detaildaten für eine einzelne Attacke.
 */
const fetchMoveData = async (moveUrl) => {
    try {
        const response = await axios.get(moveUrl);
        return response.data;
    } catch (error) {
        console.error(`Fehler beim Abrufen von Attacke unter ${moveUrl}:`, error.message);
        return null;
    }
};

/**
 * Verarbeitet die API-Daten und formatiert sie für unser Schema.
 */
const processMove = (apiData) => {
    if (!apiData) return null;

    const nameDe = apiData.names.find(n => n.language.name === 'de')?.name || apiData.name;

    // Finde die aktuellste englische und deutsche Beschreibung
    // PokeAPI hat hier oft viele Versionen, wir nehmen eine der letzten verfügbaren
    const flavorTextEn = apiData.flavor_text_entries.find(ft => ft.language.name === 'en')?.flavor_text;
    const flavorTextDe = apiData.flavor_text_entries.find(ft => ft.language.name === 'de')?.flavor_text || flavorTextEn;

    const moveDocument = {
        id: apiData.id,
        name_slug: apiData.name,
        name_en: apiData.name,
        name_de: nameDe,
        description_en: flavorTextEn,
        description_de: flavorTextDe,
        power: apiData.power,
        pp: apiData.pp,
        accuracy: apiData.accuracy,
        type: apiData.type.name,
        damage_class: apiData.damage_class.name,
    };

    return moveDocument;
};

/**
 * Hauptfunktion zum Befüllen der Attacken-Datenbank.
 */
const seedMoves = async () => {
    await connectDB();
    console.log('Starte das Seeding der Attacken-Datenbank...');

    try {
        // 1. Hole die Liste aller Attacken
        const moveListResponse = await axios.get(`${POKEAPI_BASE_URL}/move?limit=950`); // Es gibt ca. 920 Attacken, 950 ist sicher.
        const allMoves = moveListResponse.data.results;

        for (const moveInfo of allMoves) {
            console.log(`Verarbeite Attacke: ${moveInfo.name}`);
            const moveData = await fetchMoveData(moveInfo.url);

            if (moveData) {
                const moveDoc = processMove(moveData);
                if (moveDoc) {
                    await Move.updateOne({ id: moveDoc.id }, moveDoc, { upsert: true });
                    console.log(`  => Gespeichert: ${moveDoc.name_en}`);
                }
            }
        }
    } catch (error) {
        console.error('Ein schwerwiegender Fehler ist beim Seeding aufgetreten:', error);
    }

    console.log('\nAttacken-Seeding vollständig abgeschlossen!');
    mongoose.connection.close();
};

seedMoves();