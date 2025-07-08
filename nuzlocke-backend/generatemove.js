const axios = require('axios');
const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, 'output', 'moves.json');
const API_URL = 'https://pokeapi.co/api/v2/move';
const MOVE_LIMIT = 1000;

const findName = (names, lang) => names.find(n => n.language.name === lang)?.name;

async function fetchAllMoves() {
    console.log('--- Schritt 1: Lade und bereinige alle Attacken ---');
    try {
        const listResponse = await axios.get(`${API_URL}?limit=${MOVE_LIMIT}`);
        const moveUrls = listResponse.data.results.map(m => m.url);
        console.log(`... ${moveUrls.length} Attacken gefunden. Verarbeite jetzt...`);

        const allMovesData = [];
        for (let i = 0; i < moveUrls.length; i++) {
            try {
                const response = await axios.get(moveUrls[i]);
                const move = response.data;
                const englishName = findName(move.names, 'en') || move.name;

                allMovesData.push({
                    id: move.id,
                    name_slug: move.name,
                    name_en: englishName,
                    name_de: findName(move.names, 'de') || englishName,
                    type: move.type.name,
                    damage_class: move.damage_class.name,
                    power: move.power,
                    pp: move.pp || 0,
                    accuracy: move.accuracy,
                    effect_text_en: move.flavor_text_entries.find(e => e.language.name === 'en')?.flavor_text.replace(/\n/g, ' ') || '',
                    effect_text_de: move.flavor_text_entries.find(e => e.language.name === 'de')?.flavor_text.replace(/\n/g, ' ') || '',
                });
                process.stdout.write(`   ... Attacke ${i + 1} / ${moveUrls.length} verarbeitet \r`);
            } catch (detailError) {
                console.error(`\nFEHLER beim Laden der Attacke "${moveUrls[i]}". Überspringe...`);
            }
        }
        
        console.log('\n... alle Attacken erfolgreich verarbeitet.');

        if (!fs.existsSync(path.dirname(OUTPUT_PATH))) {
            fs.mkdirSync(path.dirname(OUTPUT_PATH));
        }
        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allMovesData, null, 2));
        console.log(`Erfolgreich ${allMovesData.length} Attacken in ${OUTPUT_PATH} gespeichert.`);
        console.log('--- Schritt 1 abgeschlossen ---');

    } catch (error) {
        console.error('\nEin schwerwiegender Fehler ist aufgetreten:', error.message);
    }
}

fetchAllMoves();