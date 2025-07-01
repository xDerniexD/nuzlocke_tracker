import React from 'react';
import { Image, Skeleton } from '@chakra-ui/react';

function PokemonSprite({ pokemonId, onClick = () => {} }) {
  if (!pokemonId) {
    return <Skeleton boxSize="48px" borderRadius="full" />;
  }
  
  // KORREKTUR: Die von Ihnen genannte URL wird wieder verwendet
  const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;

  return (
    <Image
      src={spriteUrl}
      alt={`Sprite for Pokémon #${pokemonId}`}
      boxSize="48px"
      objectFit="contain"
      fallback={<Skeleton boxSize="48px" borderRadius="full" />}
      onClick={onClick}
      cursor={onClick && pokemonId ? 'pointer' : 'default'}
      _hover={{
        transform: onClick && pokemonId ? 'scale(1.15)' : 'none',
        transition: 'transform 0.1s ease-in-out'
      }}
      // Wichtig: Cross-Origin-Policy für externe Bilder
      crossOrigin="anonymous" 
    />
  );
}

export default PokemonSprite;