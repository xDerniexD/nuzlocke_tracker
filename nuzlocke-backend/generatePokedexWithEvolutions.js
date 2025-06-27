const axios = require('axios');
const fs = require('fs');

const OUTPUT_PATH = './output/pokedex.json';

// Ein Cache, um zu vermeiden, dieselbe Evolutionskette mehrfach abzufragen
const evolutionChainCache = new Map();

async function getEvolutionChainId(speciesUrl) {
  try {
    const speciesResponse = await axios.get(speciesUrl);
    const evolutionChainUrl = speciesResponse.data.evolution_chain.url;

    if (evolutionChainCache.has(evolutionChainUrl)) {
      return evolutionChainCache.get(evolutionChainUrl);
    }

    const evolutionResponse = await axios.get(evolutionChainUrl);
    const chainId = evolutionResponse.data.id;
    evolutionChainCache.set(evolutionChainUrl, chainId);
    return chainId;

  } catch (error) {
    console.error(`Fehler bei der Evolution-Chain für ${speciesUrl}`);
    return null;
  }
}

async function getLocalizedNames(speciesUrl) {
  try {
    const response = await axios.get(speciesUrl);
    const names = response.data.names;
    const germanName = names.find(n => n.language.name === 'de')?.name || null;
    const englishName = names.find(n => n.language.name === 'en')?.name || null;
    return { de: germanName, en: englishName };
  } catch (error) {
    console.error(`Fehler bei den Spezies-Daten für ${speciesUrl}`);
    return { de: null, en: null };
  }
}

async function generatePokedexFile() {
  console.log('Starte das Abrufen der erweiterten Pokédex-Daten...');
  try {
    console.log('Schritt 1: Lade die Pokémon-Gesamtliste...');
    const allPokemonResponse = await axios.get('https://pokeapi.co/api/v2/pokemon?limit=1025');
    const pokemonList = allPokemonResponse.data.results;
    console.log(`... ${pokemonList.length} Pokémon gefunden.`);

    console.log('Schritt 2: Rufe Detail- & Evolutionsdaten ab... (Dies dauert einen Moment)');
    const pokedexPromises = pokemonList.map(async (p, index) => {
      const id = index + 1;
      const speciesUrl = `https://pokeapi.co/api/v2/pokemon-species/${id}/`;
      
      const [names, evolutionChainId] = await Promise.all([
          getLocalizedNames(speciesUrl),
          getEvolutionChainId(speciesUrl)
      ]);
      
      return {
        id: id,
        name_en: names.en || p.name,
        name_de: names.de,
        evolutionChainId: evolutionChainId,
      };
    });

    const fullPokedex = await Promise.all(pokedexPromises);
    console.log('... alle Daten erfolgreich erhalten.');

    console.log(`Schritt 3: Speichere die Datei unter ${OUTPUT_PATH}...`);
    if (!fs.existsSync('./output')) {
      fs.mkdirSync('./output');
    }
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(fullPokedex, null, 2));

    console.log('--- ERWEITERTER POKÉDEX ERSTELLT! ---');

  } catch (error) {
    console.error('Ein schwerwiegender Fehler ist aufgetreten:', error.message);
  }
}

generatePokedexFile();
