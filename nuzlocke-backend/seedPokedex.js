const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const Pokemon = require('./models/Pokemon');

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
        console.log('MongoDB verbunden...');
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};

const fetchPokemonFormData = async (url) => {
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error(`Fehler beim Abrufen von Pokémon-Form unter ${url}:`, error.message);
        return null;
    }
};

const processPokemonForm = async (apiData, speciesData) => {
    if (!apiData) return null;

    if (!apiData.is_default && (apiData.name.includes('-totem') || apiData.name.includes('-cosplay'))) {
        return null;
    }

    const formResponse = await axios.get(apiData.forms[0].url);
    const formApiData = formResponse.data;

    const evolutionChainId = speciesData.evolution_chain ?
        parseInt(speciesData.evolution_chain.url.split('/').slice(-2, -1)[0], 10) :
        null;

    const nameDe = speciesData.names.find(n => n.language.name === 'de')?.name || apiData.name;
    const formNameDe = formApiData.form_names.find(n => n.language.name === 'de')?.name;

    const pokemonDocument = {
        id: apiData.id,
        pokedexId: speciesData.id,
        // KORREKTUR: Speichere die eindeutige ID der Form
        formId: formApiData.id,
        name_slug: apiData.name,
        name_en: apiData.name.replace(/-/g, ' '),
        name_de: formNameDe || nameDe,
        evolutionChainId: evolutionChainId,
        types: new Map(),
        baseStats: new Map(),
        abilities: [],
        moves: {}
    };

    const processTypesForGeneration = (gen, typesData) => {
        pokemonDocument.types.set(`gen${gen}`, typesData.map(t => t.type.name));
    };

    apiData.past_types.forEach(pastTypeInfo => {
        const gen = parseInt(pastTypeInfo.generation.name.replace('generation-', ''));
        processTypesForGeneration(gen, pastTypeInfo.types);
    });

    for (let i = 1; i <= 9; i++) {
        if (!pokemonDocument.types.has(`gen${i}`)) {
            pokemonDocument.types.set(`gen${i}`, apiData.types.map(t => t.type.name));
        }
    }

    const getStat = (name) => apiData.stats.find(s => s.stat.name === name)?.base_stat || 0;

    pokemonDocument.baseStats.set('gen1', {
        hp: getStat('hp'),
        attack: getStat('attack'),
        defense: getStat('defense'),
        speed: getStat('speed'),
        special: getStat('special-attack')
    });

    const modernStats = {
        hp: getStat('hp'),
        attack: getStat('attack'),
        defense: getStat('defense'),
        speed: getStat('speed'),
        special_attack: getStat('special-attack'),
        special_defense: getStat('special-defense')
    };

    for (let i = 2; i <= 9; i++) {
        pokemonDocument.baseStats.set(`gen${i}`, modernStats);
    }

    return pokemonDocument;
};

const seedDatabase = async () => {
    await connectDB();
    console.log('Starte das Seeding der Pokémon-Datenbank (alle Formen)...');

    const speciesListResponse = await axios.get(`${POKEAPI_BASE_URL}/pokemon-species?limit=1025`);
    const allSpecies = speciesListResponse.data.results;

    for (const species of allSpecies) {
        try {
            const speciesDataResponse = await axios.get(species.url);
            const speciesData = speciesDataResponse.data;
            console.log(`\nVerarbeite Spezies #${speciesData.id}: ${speciesData.name}`);

            for (const variety of speciesData.varieties) {
                console.log(`  -> Lade Form: ${variety.pokemon.name}`);
                const formData = await fetchPokemonFormData(variety.pokemon.url);
                if (formData) {
                    const pokemonDoc = await processPokemonForm(formData, speciesData);
                    if (pokemonDoc) {
                        // KORREKTUR: Wir verwenden jetzt den zusammengesetzten Schlüssel zum Aktualisieren
                        await Pokemon.updateOne({ pokedexId: pokemonDoc.pokedexId, formId: pokemonDoc.formId }, pokemonDoc, { upsert: true });
                        console.log(`    => Gespeichert: ${pokemonDoc.name_en} (PokedexID: ${pokemonDoc.pokedexId}, FormID: ${pokemonDoc.formId})`);
                    }
                }
            }
        } catch (error) {
            console.error(`Fehler bei der Verarbeitung der Spezies ${species.name}:`, error.message);
        }
    }

    console.log('\nSeeding vollständig abgeschlossen!');
    mongoose.connection.close();
};

seedDatabase();