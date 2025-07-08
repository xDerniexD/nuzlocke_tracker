import React from 'react';
import { HStack, Image, Tooltip, Center } from '@chakra-ui/react';

const typeColorMap = {
  normal: '#A8A878',
  fire: '#F08030',
  water: '#6890F0',
  grass: '#78C850',
  electric: '#F8D030',
  ice: '#98D8D8',
  fighting: '#C03028',
  poison: '#A040A0',
  ground: '#E0C068',
  flying: '#A890F0',
  psychic: '#F85888',
  bug: '#A8B820',
  rock: '#B8A038',
  ghost: '#705898',
  dragon: '#7038F8',
  dark: '#705848',
  steel: '#B8B8D0',
  fairy: '#EE99AC',
};


function TypeIcons({ types = [] }) {
  if (!types || types.length === 0) {
    return null;
  }

  return (
    <HStack spacing={1.5} justifyContent="center">
      {/* KORREKTUR: Filtert alle ungültigen/leeren Typen-Einträge heraus, bevor gemappt wird */}
      {types.filter(type => type && typeof type === 'string').map((type) => (
        <Tooltip key={type} label={type.charAt(0).toUpperCase() + type.slice(1)} placement="bottom" hasArrow>
          <Center
            boxSize="24px"
            bg={typeColorMap[type] || 'gray.500'}
            borderRadius="full"
          >
            <Image
              src={`/assets/images/types/${type}.svg`}
              alt={`${type} type icon`}
              boxSize="14px"
              htmlHeight="14px"
              htmlWidth="14px"
            />
          </Center>
        </Tooltip>
      ))}
    </HStack>
  );
}

export default TypeIcons;