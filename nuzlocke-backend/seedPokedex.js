require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const Pokemon = require('./models/Pokemon');
const Move = require('./models/Move');
const Ability = require('./models/Ability');

const API_BASE_URL = 'https://pokeapi.co/api/v2';
const POKEMON_LIMIT = 1025; // Alle Pokémon bis Gen 9

const findName = (names, lang) => names.find(n => n.language.name === lang)?.name;

// Hilfsfunktion, die eine Anfrage bei einem Fehler wiederholt.
async function axiosWithRetry(url, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            return await axios.get(url, { timeout: 10000 }); // Timeout nach 10 Sek.
        } catch (error) {
            const isRetryable = error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED';
            if (isRetryable && i < retries - 1) {
                console.warn(`\nWarnung: Anfrage für ${url} fehlgeschlagen (${error.code}). Wiederhole in ${delay / 1000}s... (Versuch ${i + 2})`);
                await new Promise(res => setTimeout(res, delay));
            } else {
                throw error;
            }
        }
    }
}

async function seedPokedex() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB verbunden.');

        await Pokemon.deleteMany({});
        await Move.deleteMany({});
        await Ability.deleteMany({});
        console.log('Datenbank bereinigt.');

        const abilitiesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'output', 'abilities.json'), 'utf-8'));
        await Ability.insertMany(abilitiesData);
        const movesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'output', 'moves.json'), 'utf-8'));
        await Move.insertMany(movesData);
        console.log('Fähigkeiten und Attacken in DB gespeichert.');

        const dbAbilityMap = new Map((await Ability.find({})).map(a => [a.name_slug, a._id]));
        const dbMoveMap = new Map((await Move.find({})).map(m => [m.name_slug, m._id]));
        const movesJsonMap = new Map(movesData.map(m => [m.name_slug, m]));
        console.log('Daten-Maps erstellt.');

        console.log(`Lade und verarbeite ${POKEMON_LIMIT} Pokémon...`);
        const listResponse = await axiosWithRetry(`${API_BASE_URL}/pokemon?limit=${POKEMON_LIMIT}`);
        const pokemonList = listResponse.data.results;
        
        // DIESE SEQUENZIELLE `for`-SCHLEIFE IST DER SCHLÜSSEL ZUM ERFOLG.
        for (let i = 0; i < pokemonList.length; i++) {
            try {
                const pokemonListItem = pokemonList[i];
                const res = await axiosWithRetry(pokemonListItem.url);
                const pokemonData = res.data;
                const speciesRes = await axiosWithRetry(pokemonData.species.url);
                const speciesData = speciesRes.data;

                const evolutionChainId = parseInt(speciesData.evolution_chain.url.split('/').filter(Boolean).pop());
                const englishName = findName(speciesData.names, 'en') || pokemonData.name;

                const movesByGame = {};
                pokemonData.moves.forEach(moveEntry => {
                    const moveId = dbMoveMap.get(moveEntry.move.name);
                    if (!moveId) return;

                    moveEntry.version_group_details.forEach(vgd => {
                        const game = vgd.version_group.name;
                        const method = vgd.move_learn_method.name;

                        if (!movesByGame[game]) {
                            movesByGame[game] = { 'level-up': [], 'machine': [], 'tutor': [], 'egg': [] };
                        }

                        if (method === 'machine') {
                            const moveJsonData = movesJsonMap.get(moveEntry.move.name);
                            const machineName = moveJsonData?.machines?.[game];
                            movesByGame[game][method].push({ move: moveId, machine: machineName || null });
                        } else if (movesByGame[game][method]) {
                            movesByGame[game][method].push({ move: moveId, level: vgd.level_learned_at });
                        }
                    });
                });

                const pokemonToSave = {
                    id: pokemonData.id,
                    pokedexId: speciesData.id,
                    name_slug: pokemonData.name,
                    name_en: englishName,
                    name_de: findName(speciesData.names, 'de') || englishName,
                    evolutionChainId: evolutionChainId,
                    types: pokemonData.types.map(t => t.type.name),
                    baseStats: pokemonData.stats.reduce((acc, s) => ({ ...acc, [s.stat.name]: s.base_stat }), {}),
                    abilities: pokemonData.abilities.map(a => ({ ability: dbAbilityMap.get(a.ability.name), is_hidden: a.is_hidden })).filter(a => a.ability),
                    moves: movesByGame
                };
                await Pokemon.create(pokemonToSave);
            } catch (e) {
                console.error(`\nFehler bei der Verarbeitung von Pokémon ${pokemonList[i]?.name || `Nr. ${i+1}`}. Überspringe... Fehler: ${e.message}`);
            }
            process.stdout.write(`   ... Pokémon ${i + 1} / ${pokemonList.length} verarbeitet \r`);
        }
        console.log(`\nPokémon erfolgreich gespeichert.`);
        console.log('--- DATENBANK ERFOLGREICH GEFÜLLT! ---');

    } catch (err) {
        console.error('Ein schwerwiegender Fehler ist aufgetreten:', err.stack);
    } finally {
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
            console.log('Datenbank-Verbindung getrennt.');
        }
    }
}

seedPokedex();