const axios = require('axios');
const fs = require('fs');

const OUTPUT_PATH = './output/pokedex.json';

// Diese Funktion holt die Namen für ein Pokémon in verschiedenen Sprachen
async function getLocalizedNames(speciesUrl) {
  try {
    const response = await axios.get(speciesUrl);
    const names = response.data.names;
    const germanName = names.find(n => n.language.name === 'de')?.name || null;
    const englishName = names.find(n => n.language.name === 'en')?.name || null;
    return { de: germanName, en: englishName };
  } catch (error) {
    console.error(`Fehler beim Abrufen der Spezies-Daten für ${speciesUrl}`);
    return { de: null, en: null };
  }
}

async function generatePokedexFile() {
  console.log('Starte das Abrufen der Pokédex-Daten...');
  try {
    // 1. Hole die Liste aller Pokémon (hier bis Generation 9, ID 1025)
    console.log('Schritt 1: Lade die Pokémon-Gesamtliste...');
    const allPokemonResponse = await axios.get('https://pokeapi.co/api/v2/pokemon?limit=1025');
    const pokemonList = allPokemonResponse.data.results;
    console.log(`... ${pokemonList.length} Pokémon gefunden.`);

    // 2. Erstelle ein Array von Promises, um für jedes Pokémon die Detaildaten zu holen
    console.log('Schritt 2: Rufe Detaildaten für jedes Pokémon ab... (Dies dauert einen Moment)');
    const pokedexPromises = pokemonList.map(async (p, index) => {
      const id = index + 1;
      const names = await getLocalizedNames(p.url.replace('/pokemon/', '/pokemon-species/'));
      return {
        id: id,
        name_en: names.en || p.name, // Fallback auf den internen Namen
        name_de: names.de,
      };
    });

    // 3. Warte, bis alle Anfragen abgeschlossen sind
    const fullPokedex = await Promise.all(pokedexPromises);
    console.log('... alle Detaildaten erfolgreich erhalten.');

    // 4. Speichere die finale Liste als JSON-Datei
    console.log(`Schritt 3: Speichere die Datei unter ${OUTPUT_PATH}...`);
    if (!fs.existsSync('./output')) {
      fs.mkdirSync('./output');
    }
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(fullPokedex, null, 2));

    console.log('--- POKÉDEX ERSTELLT! ---');
    console.log('Die Datei wurde erfolgreich generiert.');

  } catch (error) {
    console.error('Ein schwerwiegender Fehler ist aufgetreten:', error.message);
  }
}

generatePokedexFile();
