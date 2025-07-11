// nuzlocke-frontend/src/utils/typeUtils.js

const typeChart = {
    normal: { bug: 0.5, rock: 0.5, ghost: 0 },
    fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
    water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
    electric: { water: 2, grass: 0.5, electric: 0.5, ground: 0, flying: 2, dragon: 0.5 },
    grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
    ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
    fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
    poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
    ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
    flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
    psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
    bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
    rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
    ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
    dragon: { dragon: 2, steel: 0.5, fairy: 0 },
    dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
    steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
    fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
};

export const allTypes = Object.keys(typeChart);

export function calculatePokemonDefenses(types) {
    const weaknesses = {};
    allTypes.forEach(attackingType => {
        let multiplier = 1;
        types.forEach(defendingType => {
            const effectiveness = typeChart[attackingType]?.[defendingType];
            if (effectiveness !== undefined) {
                multiplier *= effectiveness;
            }
        });
        weaknesses[attackingType] = multiplier;
    });
    return weaknesses;
}

export function groupWeaknesses(weaknesses) {
    const grouped = {};
    for (const type in weaknesses) {
        const multiplier = weaknesses[type];
        if (multiplier !== 1) {
            if (!grouped[multiplier]) {
                grouped[multiplier] = [];
            }
            grouped[multiplier].push(type);
        }
    }
    return grouped;
}

/**
 * NEU & KORRIGIERT: Zählt für jeden Angriffstyp, wie viele Teammitglieder wie stark betroffen sind.
 * @param {Array<Object>} pokemonList - Eine Liste von Pokémon-Objekten.
 * @returns {Object} Ein Objekt, das die Zählungen für jeden Typ nach Multiplikator gruppiert.
 */
export function calculateTeamWeaknessCounts(pokemonList) {
    const results = {
        '4': {}, '2': {}, '0.5': {}, '0.25': {}, '0': {}
    };

    allTypes.forEach(attackingType => {
        results['4'][attackingType] = 0;
        results['2'][attackingType] = 0;
        results['0.5'][attackingType] = 0;
        results['0.25'][attackingType] = 0;
        results['0'][attackingType] = 0;
    });

    pokemonList.forEach(pokemon => {
        if (!pokemon || !pokemon.types || pokemon.types.length === 0) return;
        const defenses = calculatePokemonDefenses(pokemon.types);
        allTypes.forEach(attackingType => {
            const multiplier = defenses[attackingType];
            if (multiplier === 4) results['4'][attackingType]++;
            else if (multiplier === 2) results['2'][attackingType]++;
            else if (multiplier === 0.5) results['0.5'][attackingType]++;
            else if (multiplier === 0.25) results['0.25'][attackingType]++;
            else if (multiplier === 0) results['0'][attackingType]++;
        });
    });

    for (const multiplier in results) {
        for (const type in results[multiplier]) {
            if (results[multiplier][type] === 0) {
                delete results[multiplier][type];
            }
        }
    }
    return results;
}