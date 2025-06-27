import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Input, List, ListItem, Text, useOutsideClick, Flex, Tag
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import api from '../api/api';

function AutocompleteInput({
  initialValue = '',
  onPokemonSelect,
  isDupesClauseActive = true,
  // NEU: Getrennte Listen und Spieler-Kontext
  playerContext, // Entweder 1 oder 2
  player1CaughtChains = [],
  player2CaughtChains = [],
}) {
  const { i18n } = useTranslation();
  const [inputValue, setInputValue] = useState(initialValue);
  const [suggestions, setSuggestions] = useState([]);
  const [isListOpen, setIsListOpen] = useState(false);
  const ref = React.useRef();
  const debounceTimeout = useRef(null);

  useOutsideClick({
    ref: ref,
    handler: () => setIsListOpen(false),
  });

  useEffect(() => {
    if (inputValue.length < 2) {
      setSuggestions([]);
      setIsListOpen(false);
      return;
    }

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(async () => {
      try {
        const response = await api.get(`/pokemon/search?q=${inputValue}`);
        
        // NEU: Bestimme, welche Kette als "Dupe" gilt
        const dupeCheckChains = playerContext === 1 ? player2CaughtChains : player1CaughtChains;

        const results = response.data.map(p => ({
          ...p,
          isDupe: isDupesClauseActive && p.evolutionChainId && dupeCheckChains.includes(p.evolutionChainId)
        }));
        setSuggestions(results);
        setIsListOpen(true);
      } catch (error) {
        console.error("Fehler bei der Pokémon-Suche:", error);
      }
    }, 300);

    return () => clearTimeout(debounceTimeout.current);

  }, [inputValue, playerContext, player1CaughtChains, player2CaughtChains, isDupesClauseActive]);

  const handleSelect = (pokemon) => {
    if (pokemon.isDupe) return;
    const displayName = (i18n.language === 'de' && pokemon.name_de) ? pokemon.name_de : pokemon.name_en;
    setInputValue(displayName);
    setIsListOpen(false);
    onPokemonSelect(pokemon);
  };

  return (
    <Box position="relative" ref={ref}>
      <Input
        placeholder="Name..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onFocus={() => inputValue.length > 1 && setIsListOpen(true)}
      />
      {isListOpen && suggestions.length > 0 && (
        <List
          position="absolute"
          top="100%"
          left={0}
          right={0}
          bg="white"
          _dark={{ bg: 'gray.700' }}
          borderWidth={1}
          borderRadius="md"
          boxShadow="lg"
          zIndex={10}
          mt={1}
        >
          {suggestions.map((p) => (
            <ListItem
              key={p.id}
              p={2}
              cursor={p.isDupe ? 'not-allowed' : 'pointer'}
              _hover={p.isDupe ? {} : { bg: 'gray.100', _dark: { bg: 'gray.600' } }}
              onClick={() => handleSelect(p)}
              opacity={p.isDupe ? 0.5 : 1}
            >
              <Flex justifyContent="space-between" alignItems="center">
                <Text>
                  <Text as="span" fontWeight="bold">#{p.pokedexId}</Text>
                  {' - '}{(i18n.language === 'de' && p.name_de) ? p.name_de : p.name_en}
                </Text>
                {p.isDupe && <Tag size="sm" colorScheme="orange">Dupe (Partner)</Tag>}
              </Flex>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}

export default AutocompleteInput;
