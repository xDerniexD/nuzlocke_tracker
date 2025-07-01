import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Input, List, ListItem, Text, useOutsideClick, Flex, Tag,
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Button,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import api from '../api/api';

function AutocompleteInput({
  initialValue = '',
  onPokemonSelect,
  isDupesClauseActive = true,
  playerContext,
  player1CaughtChains = [],
  player2CaughtChains = [],
  isDisabled = false, // Neue Prop
}) {
  const { i18n } = useTranslation();
  const [inputValue, setInputValue] = useState(initialValue || '');
  const [suggestions, setSuggestions] = useState([]);
  const [rawSuggestions, setRawSuggestions] = useState([]);
  const [isListOpen, setIsListOpen] = useState(false);
  const ref = React.useRef();
  const debounceTimeout = useRef(null);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [pokemonToConfirm, setPokemonToConfirm] = useState(null);
  const cancelRef = useRef();

  useEffect(() => {
    setInputValue(initialValue || '');
  }, [initialValue]);

  useOutsideClick({
    ref: ref,
    handler: () => setIsListOpen(false),
  });

  useEffect(() => {
    if (!inputValue || inputValue.length < 2) {
      setRawSuggestions([]);
      setIsListOpen(false);
      return;
    }

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(async () => {
      try {
        const response = await api.get(`/pokemon/search?q=${inputValue}`);
        setRawSuggestions(response.data);
        setIsListOpen(true);
      } catch (error) {
        console.error("Fehler bei der Pokémon-Suche:", error);
        setRawSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(debounceTimeout.current);
  }, [inputValue]);

  useEffect(() => {
    const results = rawSuggestions.map(p => {
      const isDupeForP1 = isDupesClauseActive && p.evolutionChainId && player1CaughtChains.includes(p.evolutionChainId);
      const isDupeForP2 = isDupesClauseActive && p.evolutionChainId && player2CaughtChains.includes(p.evolutionChainId);

      return {
        ...p,
        isDupeForP1,
        isDupeForP2,
      };
    });
    setSuggestions(results);
  }, [rawSuggestions, player1CaughtChains, player2CaughtChains, isDupesClauseActive]);

  const performSelection = (pokemon) => {
    const displayName = (i18n.language === 'de' && pokemon.name_de) ? pokemon.name_de : pokemon.name_en;
    setInputValue(displayName);
    setIsListOpen(false);
    onPokemonSelect(pokemon);
  };

  const handleConfirmSelection = () => {
    if (pokemonToConfirm) {
      performSelection(pokemonToConfirm);
    }
    onClose();
  };

  const handleSelect = (pokemon) => {
    const isDupeForCurrentUser = (playerContext === 1 && pokemon.isDupeForP1) || (playerContext === 2 && pokemon.isDupeForP2);

    if (isDupeForCurrentUser) {
      setPokemonToConfirm(pokemon);
      onOpen();
    } else {
      performSelection(pokemon);
    }
  };

  return (
    <>
      <Box position="relative" ref={ref} opacity={isDisabled ? 0.5 : 1}>
        <Input
          placeholder="Name..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => inputValue && inputValue.length > 1 && setIsListOpen(true)}
          isDisabled={isDisabled}
          pointerEvents={isDisabled ? 'none' : 'auto'}
          cursor={isDisabled ? 'not-allowed' : 'text'}
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
            {suggestions.map((p) => {
              const isDupeForCurrentUser = playerContext === 1 ? p.isDupeForP1 : p.isDupeForP2;
              return (
                <ListItem
                  key={p.id}
                  p={2}
                  cursor="pointer"
                  _hover={isDupeForCurrentUser ? { bg: 'orange.100', _dark: { bg: 'orange.700' } } : { bg: 'gray.100', _dark: { bg: 'gray.600' } }}
                  onClick={() => handleSelect(p)}
                  opacity={isDupeForCurrentUser ? 0.7 : 1}
                >
                  <Flex justifyContent="space-between" alignItems="center">
                    <Text>
                      <Text as="span" fontWeight="bold">#{p.pokedexId}</Text>
                      {' - '}{(i18n.language === 'de' && p.name_de) ? p.name_de : p.name_en}
                    </Text>
                    <Flex>
                      {p.isDupeForP1 && <Tag size="sm" colorScheme="red" ml={2}>Dupe P1</Tag>}
                      {p.isDupeForP2 && <Tag size="sm" colorScheme="blue" ml={2}>Dupe P2</Tag>}
                    </Flex>
                  </Flex>
                </ListItem>
              );
            })}
          </List>
        )}
      </Box>

      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Duplikat bestätigen
            </AlertDialogHeader>
            <AlertDialogBody>
              Dieses Pokémon ist laut Dupes Clause ein Duplikat für diesen Spieler.
              Bist du sicher, dass du es trotzdem auswählen möchtest?
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Abbrechen
              </Button>
              <Button colorScheme="red" onClick={handleConfirmSelection} ml={3}>
                Trotzdem auswählen
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}

export default AutocompleteInput;