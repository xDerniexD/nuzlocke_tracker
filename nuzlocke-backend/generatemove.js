const axios = require('axios');
const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, 'output', 'moves.json');
const API_URL = 'https://pokeapi.co/api/v2/move';

const findName = (names, lang) => names.find(n => n.language.name === lang)?.name;

async function fetchAllMoves() {
    console.log('--- Lade alle Attacken ---');
    try {
        const listResponse = await axios.get(`${API_URL}?limit=1000`);
        const allMovesData = [];
        for (let i = 0; i < listResponse.data.results.length; i++) {
            try {
                const response = await axios.get(listResponse.data.results[i].url);
                const move = response.data;
                const englishName = findName(move.names, 'en') || move.name;
                allMovesData.push({
                    id: move.id, name_slug: move.name, name_en: englishName, name_de: findName(move.names, 'de') || englishName,
                    type: move.type.name, damage_class: move.damage_class.name,
                    power: move.power, pp: move.pp, accuracy: move.accuracy,
                });
            } catch (e) { /* Ignoriere einzelne Fehler */ }
            process.stdout.write(`   ... Attacke ${i + 1} / ${listResponse.data.results.length} verarbeitet \r`);
        }
        if (!fs.existsSync(path.dirname(OUTPUT_PATH))) fs.mkdirSync(path.dirname(OUTPUT_PATH));
        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allMovesData, null, 2));
        console.log(`\nErfolgreich ${allMovesData.length} Attacken gespeichert.`);
    } catch (error) {
        console.error('\nEin schwerwiegender Fehler ist aufgetreten:', error.message);
    }
}
fetchAllMoves();