const axios = require('axios');
const fs = require('fs');

const GAME_VERSION = 'platinum';
const REGION = 'sinnoh';
const OUTPUT_PATH = `./output/${GAME_VERSION}.json`;
const GENERATION = 4;

const platinumEvents = [
  { name: { de: "Arena von Erzelingen", en: "Oreburgh Gym" }, type: "gym", levelCap: 14, badge: { de: "Kohlorden", en: "Coal Badge" }},
  { name: { de: "Arena von Ewigenau", en: "Eterna Gym" }, type: "gym", levelCap: 22, badge: { de: "Waldorden", en: "Forest Badge" }},
  { name: { de: "Arena von Schleiede", en: "Veilstone Gym" }, type: "gym", levelCap: 32, badge: { de: "Bergorden", en: "Cobble Badge" }},
  { name: { de: "Arena von Weideburg", en: "Pastoria Gym" }, type: "gym", levelCap: 37, badge: { de: "Fennorden", en: "Fen Badge" }},
  { name: { de: "Arena von Herzhofen", en: "Hearthome Gym" }, type: "gym", levelCap: 41, badge: { de: "Reliktorden", en: "Relic Badge" }},
  { name: { de: "Arena von Fleetburg", en: "Canalave Gym" }, type: "gym", levelCap: 44, badge: { de: "Minenorden", en: "Mine Badge" }},
  { name: { de: "Arena von Blizzach", en: "Snowpoint Gym" }, type: "gym", levelCap: 49, badge: { de: "Firnorden", en: "Icicle Badge" }},
  { name: { de: "Arena von Sonnewik", en: "Sunyshore Gym" }, type: "gym", levelCap: 53, badge: { de: "Lichtorden", en: "Beacon Badge" }},
  { name: { de: "Top Vier Herbaro", en: "Elite Four Aaron" }, type: "elite-four", levelCap: 53 },
  { name: { de: "Top Vier Teresa", en: "Elite Four Bertha" }, type: "elite-four", levelCap: 55 },
  { name: { de: "Top Vier Ignaz", en: "Elite Four Flint" }, type: "elite-four", levelCap: 57 },
  { name: { de: "Top Vier Lucian", en: "Elite Four Lucian" }, type: "elite-four", levelCap: 59 },
  { name: { de: "Champion Cynthia", en: "Champion Cynthia" }, type: "champion", levelCap: 62 }
];

function findNameInLanguage(names, lang) {
  const result = names.find(name => name.language.name === lang);
  return result ? result.name : null;
}

function determineLocationType(englishName) {
  const name = englishName.toLowerCase();
  if (name.includes('route')) return 'route';
  if (name.includes('city') || name.includes('town')) return 'city';
  if (name.includes('cave') || name.includes('tunnel') || name.includes('mt.') || name.includes('mountain')) return 'cave';
  if (name.includes('forest')) return 'forest';
  if (name.includes('chateau') || name.includes('ironworks') || name.includes('tower') || name.includes('ruins')) return 'landmark';
  if (name.includes('lake') || name.includes('road') || name.includes('meadow')) return 'area';
  return 'area'; 
}

async function generateGameFile() {
  console.log(`Starte den Prozess für das Spiel: ${GAME_VERSION}...`);
  try {
    console.log(`1. Rufe alle Orte für die Region '${REGION}' ab...`);
    const regionResponse = await axios.get(`https://pokeapi.co/api/v2/region/${REGION}/`);
    const locationUrls = regionResponse.data.locations.map(loc => loc.url);
    
    console.log(`2. Rufe Detailinformationen für jeden Ort ab...`);
    const locationPromises = locationUrls.map(url => axios.get(url));
    const locationResponses = await Promise.all(locationPromises);
    const apiLocations = locationResponses.map(res => res.data);
    
    console.log(`3. Transformiere Daten in unser Zielformat...`);
    const ourLocations = apiLocations.map(apiLocation => {
      const germanName = findNameInLanguage(apiLocation.names, 'de');
      const englishName = findNameInLanguage(apiLocation.names, 'en');
      const type = determineLocationType(englishName || '');

      // --- HIER IST DIE ERWEITERTE LOGIK ---
      return {
        name: { de: germanName || englishName, en: englishName },
        type: type,
        hasStandardEncounter: type !== 'city', // Annahme: Nur Städte haben keine Standard-Begegnungen
        staticEncounters: [], // Leerer Platzhalter für manuelle Einträge
        giftPokemon: [],      // Leerer Platzhalter für manuelle Einträge
      };
    }).sort((a, b) => a.name.en.localeCompare(b.name.en));
    console.log(`   ... Transformation abgeschlossen.`);

    const finalGameObject = {
      _id: GAME_VERSION,
      name: {
        de: `Pokémon ${GAME_VERSION.charAt(0).toUpperCase() + GAME_VERSION.slice(1)}-Edition`,
        en: `Pokémon ${GAME_VERSION.charAt(0).toUpperCase() + GAME_VERSION.slice(1)} Version`
      },
      generation: GENERATION,
      locations: ourLocations,
      events: platinumEvents
    };

    console.log(`4. Speichere die Datei unter ${OUTPUT_PATH}...`);
    if (!fs.existsSync('./output')) {
      fs.mkdirSync('./output');
    }
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(finalGameObject, null, 2));
    console.log('--- FERTIG! ---');
    console.log(`Die Datei wurde erfolgreich mit der finalen Struktur erstellt.`);

  } catch (error) {
    console.error('Ein schwerwiegender Fehler ist aufgetreten:', error);
  }
}

generateGameFile();