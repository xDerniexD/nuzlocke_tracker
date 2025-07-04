import React from 'react';
import { useTranslation } from 'react-i18next';
import { VStack, HStack, Text, Tooltip, Divider, Box } from '@chakra-ui/react';
import PokemonSprite from './PokemonSprite';
import TypeIcons from './TypeIcons';

// Eine kleine interne Komponente, um Code-Wiederholung zu vermeiden
const PokemonDisplay = ({ pokemon }) => {
  const { i18n } = useTranslation();
  if (!pokemon) return null;

  return (
    <VStack spacing={2} flex="1">
      <PokemonSprite pokemonId={pokemon.pokemonId} boxSize="60px" />
      <Tooltip label={pokemon.nickname || (i18n.language === 'de' ? pokemon.name_de : pokemon.name_en)}>
        <Text fontWeight="bold" noOfLines={1} fontSize="sm">
          {pokemon.nickname || (i18n.language === 'de' ? pokemon.name_de : pokemon.name_en)}
        </Text>
      </Tooltip>
      <TypeIcons types={pokemon.types} />
    </VStack>
  );
};

function PokemonPairCard({ pair, onClick, isTeamMember }) {
  const isSoullinkPair = pair.p1 && pair.p2;

  return (
    <Box
      p={3}
      borderWidth={1}
      borderRadius="lg"
      cursor="pointer"
      onClick={onClick}
      bg={isTeamMember ? 'teal.50' : 'transparent'}
      _dark={{ bg: isTeamMember ? 'teal.800' : 'transparent' }}
      _hover={{ bg: 'gray.100', _dark: { bg: 'gray.700' } }}
      transition="background-color 0.2s"
      minW={isSoullinkPair ? "220px" : "120px"} // Breiter für Paare
    >
      <HStack spacing={2} align="center" justify="center">
        <PokemonDisplay pokemon={pair.p1} />
        {isSoullinkPair && (
          <>
            <Divider orientation="vertical" height="80px" />
            <PokemonDisplay pokemon={pair.p2} />
          </>
        )}
      </HStack>
    </Box>
  );
}

export default PokemonPairCard;