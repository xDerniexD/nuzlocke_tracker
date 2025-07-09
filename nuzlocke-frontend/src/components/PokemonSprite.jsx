import React from 'react';
import { Image, Skeleton, Center, Icon } from '@chakra-ui/react';
// NEU: Importiere das Fragezeichen-Icon
import { FaQuestion } from 'react-icons/fa';

function PokemonSprite({ pokemonId, onClick = () => { }, boxSize = "48px" }) {
  // Wenn keine pokemonId übergeben wird...
  if (!pokemonId) {
    // KORREKTUR: Zeige ein statisches Fragezeichen-Icon an
    return (
      <Center
        boxSize={boxSize}
        bg="gray.200"
        _dark={{ bg: 'gray.600' }}
        borderRadius="full"
        onClick={onClick}
        cursor={onClick ? 'pointer' : 'default'}
      >
        <Icon as={FaQuestion} color="gray.500" _dark={{ color: 'gray.400' }} />
      </Center>
    );
  }

  const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;

  return (
    <Image
      src={spriteUrl}
      alt={`Sprite for Pokémon #${pokemonId}`}
      boxSize={boxSize}
      objectFit="contain"
      fallback={<Skeleton boxSize={boxSize} borderRadius="full" />}
      onClick={onClick}
      cursor={onClick && pokemonId ? 'pointer' : 'default'}
      _hover={{
        transform: onClick && pokemonId ? 'scale(1.15)' : 'none',
        transition: 'transform 0.1s ease-in-out'
      }}
      crossOrigin="anonymous"
    />
  );
}

export default PokemonSprite;