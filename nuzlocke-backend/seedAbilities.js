const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const Ability = require('./models/Ability');

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
        console.log('MongoDB für Fähigkeiten-Seeding verbunden...');
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};

/**
 * Holt die Detaildaten für eine einzelne Fähigkeit.
 */
const fetchAbilityData = async (abilityUrl) => {
    try {
        const response = await axios.get(abilityUrl);
        return response.data;
    } catch (error) {
        console.error(`Fehler beim Abrufen von Fähigkeit unter ${abilityUrl}:`, error.message);
        return null;
    }
};

/**
 * Verarbeitet die API-Daten und formatiert sie für unser Schema.
 */
const processAbility = (apiData) => {
    if (!apiData) return null;

    const nameDe = apiData.names.find(n => n.language.name === 'de')?.name || apiData.name;

    // Finde die aktuellste englische und deutsche Beschreibung (Flavor Text)
    const flavorTextEn = apiData.flavor_text_entries.find(ft => ft.language.name === 'en')?.flavor_text;
    const flavorTextDe = apiData.flavor_text_entries.find(ft => ft.language.name === 'de')?.flavor_text || flavorTextEn;

    const abilityDocument = {
        id: apiData.id,
        name_slug: apiData.name,
        name_en: apiData.name,
        name_de: nameDe,
        description_en: flavorTextEn,
        description_de: flavorTextDe,
    };

    return abilityDocument;
};

/**
 * Hauptfunktion zum Befüllen der Fähigkeiten-Datenbank.
 */
const seedAbilities = async () => {
    await connectDB();
    console.log('Starte das Seeding der Fähigkeiten-Datenbank...');

    try {
        // 1. Hole die Liste aller Fähigkeiten
        const abilityListResponse = await axios.get(`${POKEAPI_BASE_URL}/ability?limit=350`); // Es gibt ca. 307 Fähigkeiten, 350 ist sicher.
        const allAbilities = abilityListResponse.data.results;

        for (const abilityInfo of allAbilities) {
            console.log(`Verarbeite Fähigkeit: ${abilityInfo.name}`);
            const abilityData = await fetchAbilityData(abilityInfo.url);

            if (abilityData) {
                const abilityDoc = processAbility(abilityData);
                if (abilityDoc) {
                    await Ability.updateOne({ id: abilityDoc.id }, abilityDoc, { upsert: true });
                    console.log(`  => Gespeichert: ${abilityDoc.name_en}`);
                }
            }
        }
    } catch (error) {
        console.error('Ein schwerwiegender Fehler ist beim Seeding aufgetreten:', error);
    }

    console.log('\nFähigkeiten-Seeding vollständig abgeschlossen!');
    mongoose.connection.close();
};

seedAbilities();