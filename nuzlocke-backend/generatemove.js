const axios = require('axios');
const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, 'output', 'moves.json');
const API_URL = 'https://pokeapi.co/api/v2';

const findName = (names, lang) => names.find(n => n.language.name === lang)?.name;

/**
 * Holt alle Maschinen-Details (TMs, HMs, TRs) von der API.
 * @returns {Promise<Map<string, string>>} Eine Map, die Maschinen-URLs auf ihre Item-Namen abbildet (z.B. 'tm01').
 */
async function fetchAllMachineDetails() {
    console.log('--- Lade alle Maschinen-Details (TM/HM/TR) ---');
    const machineMap = new Map();
    try {
        const listResponse = await axios.get(`${API_URL}/machine?limit=2000`); // Hohes Limit für alle Maschinen
        for (let i = 0; i < listResponse.data.results.length; i++) {
            const machineUrl = listResponse.data.results[i].url;
            try {
                const machineRes = await axios.get(machineUrl);
                const machineData = machineRes.data;
                // Der Name des Items (z.B. "tm01") ist der wichtige Teil.
                machineMap.set(machineUrl, machineData.item.name.toUpperCase());
            } catch (e) { /* Einzelnen Fehler ignorieren */ }
            process.stdout.write(`   ... Maschine ${i + 1} / ${listResponse.data.results.length} verarbeitet \r`);
        }
        console.log(`\nErfolgreich ${machineMap.size} Maschinen-Details geladen.`);
    } catch (error) {
        console.error('\nFehler beim Laden der Maschinen-Details:', error.message);
    }
    return machineMap;
}

async function fetchAllMoves() {
    console.log('--- Lade alle Attacken ---');
    // Zuerst alle Maschinen-Daten laden, um API-Anfragen in der Schleife zu vermeiden.
    const machineDetailsMap = await fetchAllMachineDetails();

    try {
        const listResponse = await axios.get(`${API_URL}/move?limit=1000`);
        const allMovesData = [];
        for (let i = 0; i < listResponse.data.results.length; i++) {
            try {
                const response = await axios.get(listResponse.data.results[i].url);
                const move = response.data;
                const englishName = findName(move.names, 'en') || move.name;

                // NEU: Verarbeite die Maschinen-Daten für diese Attacke
                const machines = {};
                if (move.machines && move.machines.length > 0) {
                    move.machines.forEach(machineEntry => {
                        const versionGroup = machineEntry.version_group.name;
                        const machineName = machineDetailsMap.get(machineEntry.machine.url);
                        if (machineName) {
                            machines[versionGroup] = machineName;
                        }
                    });
                }

                allMovesData.push({
                    id: move.id,
                    name_slug: move.name,
                    name_en: englishName,
                    name_de: findName(move.names, 'de') || englishName,
                    type: move.type.name,
                    damage_class: move.damage_class.name,
                    power: move.power,
                    pp: move.pp,
                    accuracy: move.accuracy,
                    machines: machines, // Füge die neuen Maschinen-Daten hinzu
                });
            } catch (e) { /* Ignoriere einzelne Fehler bei Attacken */ }
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