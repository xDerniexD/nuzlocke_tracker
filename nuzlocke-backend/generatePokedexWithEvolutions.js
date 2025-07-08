const axios = require('axios');
const fs = require('fs');

const OUTPUT_PATH = './output/pokedex.json'; 

const evolutionChainCache = new Map();
const moveCache = new Map(); 
const abilityCache = new Map();

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Hilfsfunktion, um Form-Namen lesbar zu machen
function formatFormName(formName, speciesName) {
    if (formName === speciesName) {
        return ''; // Keine spezielle Form
    }
    // Ersetzt Bindestriche und macht den ersten Buchstaben groß
    return formName.replace(speciesName, '')
                   .replace(/-/g, ' ')
                   .replace(/\b\w/g, l => l.toUpperCase())
                   .trim();
}

// Funktion zum Abrufen der Fähigkeiten-Details inkl. deutscher Namen
async function getAbilityDetails(abilityUrl) {
    if (abilityCache.has(abilityUrl)) {
        return abilityCache.get(abilityUrl);
    }
    try {
        const response = await axios.get(abilityUrl);
        const abilityData = response.data;
        const internalName = abilityData.name;
        const germanNameObj = abilityData.names.find(n => n.language.name === 'de');
        
        const germanName = germanNameObj ? germanNameObj.name : internalName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

        const abilityDetails = {
            name_en: internalName,
            name_de: germanName,
        };
        abilityCache.set(abilityUrl, abilityDetails);
        return abilityDetails;
    } catch (error) {
        console.error(`Fehler beim Abrufen der Ability-Daten für ${abilityUrl}: ${error.message}`);
        const fallbackName = abilityUrl.split('/').slice(-2, -1)[0] || 'unknown';
        return { name_en: fallbackName, name_de: fallbackName };
    }
}

// Funktion zum Abrufen der Attacken-Details inkl. deutscher Namen
async function getMoveDetails(moveUrl) {
    if (moveCache.has(moveUrl)) {
        return moveCache.get(moveUrl);
    }
    try {
        const response = await axios.get(moveUrl);
        const moveData = response.data;
        const internalName = moveData.name;
        const germanNameObj = moveData.names.find(n => n.language.name === 'de');
        
        const germanName = germanNameObj ? germanNameObj.name : internalName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

        const moveDetails = {
            name_en: internalName,
            name_de: germanName,
        };
        moveCache.set(moveUrl, moveDetails);
        return moveDetails;
    } catch (error) {
        console.error(`Fehler beim Abrufen der Move-Daten für ${moveUrl}: ${error.message}`);
        const fallbackName = moveUrl.split('/').slice(-2, -1)[0] || 'unknown';
        return { name_en: fallbackName, name_de: fallbackName };
    }
}


async function getPokemonFormData(pokemonUrl) {
    try {
        const response = await axios.get(pokemonUrl);
        const { id, name: internalFormName, stats, types, species, moves: rawMoves, abilities: rawAbilities, held_items: rawHeldItems } = response.data;

        const speciesResponse = await axios.get(species.url);
        const { names, evolution_chain, id: pokedexId, capture_rate: catchRate, gender_rate: genderRatio } = speciesResponse.data;

        const germanSpeciesName = names.find(n => n.language.name === 'de')?.name || null;
        const englishSpeciesName = names.find(n => n.language.name === 'en')?.name || internalFormName;

        const formattedFormName = formatFormName(internalFormName, species.name);
        const finalEnglishName = formattedFormName ? `${englishSpeciesName} (${formattedFormName})` : englishSpeciesName;
        const finalGermanName = formattedFormName ? `${germanSpeciesName || englishSpeciesName} (${formattedFormName})` : (germanSpeciesName || englishSpeciesName);


        let evolutionChainId = null;
        let evolutions = [];

        if (evolution_chain?.url) {
            let chainData;
            if (evolutionChainCache.has(evolution_chain.url)) {
                chainData = evolutionChainCache.get(evolution_chain.url);
            } else {
                const evolutionResponse = await axios.get(evolution_chain.url);
                chainData = evolutionResponse.data;
                evolutionChainCache.set(evolution_chain.url, chainData);
            }
            evolutionChainId = chainData.id;

            function findAndListEvolutions(chainLink) {
                if (chainLink.species.name === species.name) {
                    chainLink.evolves_to.forEach(evo => {
                        // Extrahiere die ID aus der URL der Entwicklungs-Spezies
                        const toId = evo.species.url.split('/').slice(-2, -1)[0];
                        
                        evolutions.push({
                            to: evo.species.name,
                            to_id: parseInt(toId, 10), // Füge die ID hier hinzu
                            details: evo.evolution_details 
                        });
                    });
                } else {
                    chainLink.evolves_to.forEach(evo => findAndListEvolutions(evo));
                }
            }
            findAndListEvolutions(chainData.chain);
        }

        const baseStats = {};
        let total = 0;
        stats.forEach(s => {
            const statNameMapping = { 'hp': 'hp', 'attack': 'atk', 'defense': 'def', 'special-attack': 'spa', 'special-defense': 'spd', 'speed': 'spe' };
            const statName = statNameMapping[s.stat.name] || s.stat.name;
            baseStats[statName] = s.base_stat;
            total += s.base_stat;
        });
        baseStats.total = total;

        const typeNames = types.map(typeInfo => typeInfo.type.name);
        
        const abilityPromises = rawAbilities.map(async (abilityInfo) => {
            const abilityDetails = await getAbilityDetails(abilityInfo.ability.url);
            return {
                ...abilityDetails,
                is_hidden: abilityInfo.is_hidden,
            };
        });
        const abilities = await Promise.all(abilityPromises);

        const heldItems = rawHeldItems.map(itemInfo => ({
            item: itemInfo.item.name,
            chance: itemInfo.version_details.reduce((max, v) => Math.max(max, v.rarity), 0),
        }));

        const movesByVersion = {};
        for (const group of TARGET_VERSION_GROUPS) {
            movesByVersion[group] = await getMovesForVersionGroup(rawMoves, group);
        }

        return {
            id,
            pokedexId,
            name_en: finalEnglishName,
            name_de: finalGermanName,
            evolutionChainId: evolutionChainId || id,
            evolutions: evolutions,
            types: typeNames,
            baseStats: baseStats,
            moves: movesByVersion,
            abilities: abilities,
            catchRate: catchRate,
            genderRatio: genderRatio,
            heldItems: heldItems,
        };

    } catch (error) {
        console.error(`Fehler beim Abrufen der Form-Daten für ${pokemonUrl}: ${error.message}`);
        return null;
    }
}

const TARGET_VERSION_GROUPS = [
    'red-blue', 'gold-silver', 'ruby-sapphire', 'diamond-pearl', 'platinum',
    'heartgold-soulsilver', 'black-white', 'black-2-white-2', 'x-y',
    'omega-ruby-alpha-sapphire', 'sun-moon', 'ultra-sun-ultra-moon',
    'sword-shield', 'brilliant-diamond-and-shining-pearl', 'scarlet-violet'
];

async function getMovesForVersionGroup(pokemonMoves, versionGroup) {
    const moves = { 'level-up': [], 'machine': [], 'tutor': [] };

    const moveDetailPromises = pokemonMoves.map(moveData => {
        const versionDetails = moveData.version_group_details.find(
            detail => detail.version_group.name === versionGroup
        );
        if (versionDetails) {
            return getMoveDetails(moveData.move.url).then(moveNames => ({
                ...moveNames,
                learnMethod: versionDetails.move_learn_method.name,
                level: versionDetails.move_learn_method.name === 'level-up' ? versionDetails.level_learned_at : 0
            }));
        }
        return null;
    }).filter(p => p !== null);

    const resolvedMoves = await Promise.all(moveDetailPromises);

    for (const move of resolvedMoves) {
        if (move.learnMethod === 'level-up') {
            moves['level-up'].push({ name_en: move.name_en, name_de: move.name_de, level: move.level });
        } else if (move.learnMethod === 'machine') {
            moves['machine'].push({ name_en: move.name_en, name_de: move.name_de });
        } else if (move.learnMethod === 'tutor') {
            moves['tutor'].push({ name_en: move.name_en, name_de: move.name_de });
        }
    }

    moves['level-up'].sort((a, b) => a.level - b.level);
    moves['machine'].sort((a, b) => a.name_de.localeCompare(b.name_de));
    moves['tutor'].sort((a, b) => a.name_de.localeCompare(b.name_de));

    return moves;
}


async function generatePokedexFile() {
  console.log('Starte das Abrufen der finalen Pokédex-Daten...');
  try {
    console.log('Schritt 1: Lade die Liste aller Pokémon-Spezies...');
    const allSpeciesResponse = await axios.get('https://pokeapi.co/api/v2/pokemon-species?limit=1025');
    const speciesList = allSpeciesResponse.data.results;
    console.log(`... ${speciesList.length} Spezies gefunden.`);

    console.log('Schritt 2: Rufe für jede Spezies alle Varianten (Formen) ab...');
    
    let allPokemonForms = [];
    const BATCH_SIZE = 20; 

    for (let i = 0; i < speciesList.length; i += BATCH_SIZE) {
        const batch = speciesList.slice(i, i + BATCH_SIZE);
        console.log(`Verarbeite Spezies-Stapel ${Math.floor(i / BATCH_SIZE) + 1}...`);

        const varietyPromises = batch.map(async (species) => {
            try {
                const speciesDetails = await axios.get(species.url);
                return speciesDetails.data.varieties.map(variety => variety.pokemon.url);
            } catch (e) {
                console.error(`Fehler bei Spezies-Details für ${species.name}`);
                return [];
            }
        });

        const varietyUrlArrays = await Promise.all(varietyPromises);
        const flatVarietyUrls = varietyUrlArrays.flat();
        allPokemonForms.push(...flatVarietyUrls);
        
        await delay(500); 
    }

    console.log(`... insgesamt ${allPokemonForms.length} individuelle Pokémon-Formen gefunden.`);
    console.log('Schritt 3: Lade die Detaildaten für jede einzelne Form (dies kann jetzt länger dauern)...');

    const fullPokedex = [];
    for (let i = 0; i < allPokemonForms.length; i += BATCH_SIZE) {
        const batch = allPokemonForms.slice(i, i + BATCH_SIZE);
        console.log(`Verarbeite Form-Stapel ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allPokemonForms.length / BATCH_SIZE)}...`);

        const pokemonPromises = batch.map(url => getPokemonFormData(url));
        const batchResults = await Promise.all(pokemonPromises);
        fullPokedex.push(...batchResults.filter(p => p !== null));

        await delay(500);
    }


    fullPokedex.sort((a, b) => a.id - b.id);

    console.log('... alle Daten erfolgreich erhalten.');

    console.log(`Schritt 4: Speichere die Datei unter ${OUTPUT_PATH}...`);
    if (!fs.existsSync('./output')) {
      fs.mkdirSync('./output');
    }
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(fullPokedex, null, 2));

    console.log('--- FINALER POKÉDEX ERSTELLT! ---');

  } catch (error) {
    console.error('Ein schwerwiegender Fehler ist aufgetreten:', error.message);
  }
}

generatePokedexFile();