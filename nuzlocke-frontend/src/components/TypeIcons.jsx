import React from 'react';
import { HStack, Image, Tooltip, Center } from '@chakra-ui/react';

// Ein Mapping-Objekt, das jedem Typ eine Farbe zuweist
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
    return null; // Zeige nichts an, wenn keine Typen vorhanden sind
  }

  return (
    // Ordnet die Icons horizontal mit einem kleinen Abstand an
    <HStack spacing={1.5} justifyContent="center">
      {types.map((type) => (
        <Tooltip key={type} label={type.charAt(0).toUpperCase() + type.slice(1)} placement="bottom" hasArrow>
          {/* Center wird als runder, farbiger Hintergrund verwendet */}
          <Center
            boxSize="24px"
            bg={typeColorMap[type] || 'gray.500'} // Nutze die Farbe aus der Map oder ein Standard-Grau
            borderRadius="full" // Macht den Container perfekt rund
          >
            <Image
              src={`/assets/images/types/${type}.svg`}
              alt={`${type} type icon`}
              boxSize="14px" // Das Icon ist etwas kleiner als der Hintergrund
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
