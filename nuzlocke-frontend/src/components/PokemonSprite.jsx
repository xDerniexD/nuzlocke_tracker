import React from 'react';
import { Image, Center, Icon } from '@chakra-ui/react';
import { QuestionOutlineIcon } from '@chakra-ui/icons';

// Die Komponente erhält jetzt die ID des Pokémon als "prop"
function PokemonSprite({ pokemonId, pokemonName }) {
  // Wenn keine ID vorhanden ist, zeige einen leeren Platzhalter an
  if (!pokemonId || isNaN(parseInt(pokemonId))) {
    return (
      <Center boxSize="48px" bg="gray.100" borderRadius="md" _dark={{ bg: 'gray.700' }}>
        <Icon as={QuestionOutlineIcon} color="gray.400" />
      </Center>
    );
  }

  // Die URL zum offiziellen Sprite-Repository wird mit der ID gebildet
  const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;

  return (
    <Image
      src={spriteUrl}
      alt={`Sprite von ${pokemonName || 'Pokémon'}`}
      boxSize="48px"
      objectFit="contain"
      // Falls das Bild nicht geladen werden kann (z.B. ungültige ID),
      // wird dieser Fehler-Platzhalter angezeigt.
      fallback={
        <Center boxSize="48px" bg="red.100" borderRadius="md" _dark={{ bg: 'red.900' }} title={`Sprite für ID ${pokemonId} nicht gefunden`}>
          <Icon as={QuestionOutlineIcon} color="red.500" />
        </Center>
      }
    />
  );
}

export default PokemonSprite;
