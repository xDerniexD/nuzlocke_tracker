require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const Pokemon = require('./models/Pokemon');
const Move = require('./models/Move');
const Ability = require('./models/Ability');

const API_BASE_URL = 'https://pokeapi.co/api/v2';
const POKEMON_LIMIT = 1025; // Alle Pokémon bis Gen 9

const findName = (names, lang) => names.find(n => n.language.name === lang)?.name;
const findEffect = (effects, lang) => (effects.find(e => e.language.name === lang) || effects.find(e => e.language.name === 'en'))?.effect || '';

async function seedDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB verbunden.');

        await Pokemon.deleteMany({});
        await Move.deleteMany({});
        await Ability.deleteMany({});
        console.log('Datenbank bereinigt.');

        // 1. Fähigkeiten holen
        console.log('Lade Fähigkeiten...');
        const abilityList = (await axios.get(`${API_BASE_URL}/ability?limit=400`)).data.results;
        for (let i = 0; i < abilityList.length; i++) {
            try {
                const res = await axios.get(abilityList[i].url);
                const ability = res.data;
                const englishName = findName(ability.names, 'en') || ability.name;
                await Ability.create({
                    id: ability.id, name_slug: ability.name, name_en: englishName, name_de: findName(ability.names, 'de') || englishName,
                    effect_text_en: findEffect(ability.effect_entries, 'en'),
                    effect_text_de: findEffect(ability.effect_entries, 'de')
                });
            } catch (e) { console.warn(`Konnte Fähigkeit ${abilityList[i].name} nicht speichern.`); }
            process.stdout.write(`   ... Fähigkeit ${i + 1} / ${abilityList.length} \r`);
        }
        console.log(`\nFähigkeiten gespeichert.`);

        // 2. Attacken holen
        console.log('Lade Attacken...');
        const moveList = (await axios.get(`${API_BASE_URL}/move?limit=1000`)).data.results;
        for (let i = 0; i < moveList.length; i++) {
            try {
                const res = await axios.get(moveList[i].url);
                const move = res.data;
                const englishName = findName(move.names, 'en') || move.name;
                await Move.create({
                    id: move.id, name_slug: move.name, name_en: englishName, name_de: findName(move.names, 'de') || englishName,
                    type: move.type.name, damage_class: move.damage_class.name,
                    power: move.power, pp: move.pp, accuracy: move.accuracy
                });
            } catch (e) { console.warn(`Konnte Attacke ${moveList[i].name} nicht speichern.`); }
            process.stdout.write(`   ... Attacke ${i + 1} / ${moveList.length} \r`);
        }
        console.log(`\nAttacken gespeichert.`);

        // Maps erstellen
        const dbAbilityMap = new Map((await Ability.find({})).map(a => [a.name_slug, a._id]));
        const dbMoveMap = new Map((await Move.find({})).map(m => [m.name_slug, m._id]));
        console.log('Daten-Maps erstellt.');

        // 3. Pokémon holen und verknüpfen
        console.log(`Lade ${POKEMON_LIMIT} Pokémon...`);
        const pokemonList = (await axios.get(`${API_BASE_URL}/pokemon?limit=${POKEMON_LIMIT}`)).data.results;
        for (let i = 0; i < pokemonList.length; i++) {
            try {
                const res = await axios.get(pokemonList[i].url);
                const pokemonData = res.data;
                const speciesRes = await axios.get(pokemonData.species.url);
                const speciesData = speciesRes.data;
                
                // KORREKTUR: Die evolutionChainId wird hier korrekt aus der species-Antwort extrahiert
                const evolutionChainId = parseInt(speciesData.evolution_chain.url.split('/').filter(Boolean).pop(), 10);
                const englishName = findName(speciesData.names, 'en') || pokemonData.name;

                const movesByGame = {};
                pokemonData.moves.forEach(moveEntry => {
                    const moveId = dbMoveMap.get(moveEntry.move.name);
                    if (!moveId) return;
                    moveEntry.version_group_details.forEach(vgd => {
                        const game = vgd.version_group.name;
                        const method = vgd.move_learn_method.name;
                        if (!movesByGame[game]) movesByGame[game] = { 'level-up': [], 'machine': [], 'tutor': [], 'egg': [] };
                        if (movesByGame[game][method]) movesByGame[game][method].push({ move: moveId, level: vgd.level_learned_at });
                    });
                });

                const pokemonToSave = {
                    id: pokemonData.id,
                    pokedexId: speciesData.id,
                    name_slug: pokemonData.name,
                    name_en: englishName,
                    name_de: findName(speciesData.names, 'de') || englishName,
                    evolutionChainId: evolutionChainId, // Hier wird sie gespeichert
                    types: pokemonData.types.map(t => t.type.name),
                    baseStats: pokemonData.stats.reduce((acc, s) => ({ ...acc, [s.stat.name]: s.base_stat }), {}),
                    abilities: pokemonData.abilities.map(a => ({ ability: dbAbilityMap.get(a.ability.name), is_hidden: a.is_hidden })).filter(a => a.ability),
                    moves: movesByGame
                };
                await Pokemon.create(pokemonToSave);
            } catch (e) { console.warn(`\nKonnte Pokémon ${pokemonList[i].name} nicht speichern: ${e.message}`); }
            process.stdout.write(`   ... Pokémon ${i + 1} / ${pokemonList.length} verarbeitet \r`);
        }
        console.log(`\nPokémon erfolgreich gespeichert.`);
        console.log('--- DATENBANK ERFOLGREICH GEFÜLLT! ---');

    } catch (err) {
        console.error('Ein schwerwiegender Fehler ist aufgetreten:', err.stack);
    } finally {
        await mongoose.connection.close();
        console.log('Datenbank-Verbindung getrennt.');
    }
}
seedDatabase();