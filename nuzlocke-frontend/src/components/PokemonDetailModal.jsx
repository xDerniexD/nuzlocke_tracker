import React from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  Button, Spinner, Flex, Text, Tag, VStack, HStack, Progress, Grid, Box, Center, Image,
  Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import TypeIcons from './TypeIcons';

function PokemonDetailModal({ isOpen, onClose, pokemon, isLoading, game }) {
  const { i18n, t } = useTranslation();

  const formatStatName = (stat) => {
    // Versucht, den Stat-Namen zu übersetzen, fällt auf den Schlüssel zurück, falls nicht gefunden
    return t(`stats.${stat}`, { defaultValue: stat });
  };

  const groupedGameMoves = React.useMemo(() => {
    if (!pokemon || !pokemon.moves || !game || !pokemon.moves[game]) {
      return {};
    }
    const movesByGame = pokemon.moves[game];
    const grouped = {};
    for (const method in movesByGame) {
      if (Array.isArray(movesByGame[method]) && movesByGame[method].length > 0) {
        grouped[method] = [...movesByGame[method]].sort((a, b) => {
          if (method === 'level-up' && a.level !== b.level) {
            return a.level - b.level;
          }
          const nameA = (i18n.language === 'de' && a.name_de) ? a.name_de : (a.name_en || a.name || '');
          const nameB = (i18n.language === 'de' && b.name_de) ? b.name_de : (b.name_en || b.name || '');
          return nameA.localeCompare(nameB);
        });
      }
    }
    return grouped;
  }, [pokemon, game, i18n.language]);

  const moveMethods = Object.keys(groupedGameMoves);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered motionPreset="slideInBottom">
      <ModalOverlay />
      <ModalContent>
        {isLoading ? (
          <Flex justify="center" align="center" height="400px">
            <Spinner size="xl" />
          </Flex>
        ) : pokemon ? (
          <>
            <ModalHeader textTransform="capitalize" fontSize="2xl">
              {(i18n.language === 'de' && pokemon.name_de) ? pokemon.name_de : pokemon.name_en}
              <Text as="span" color="gray.500" ml={3}>#{String(pokemon.pokedexId).padStart(3, '0')}</Text>
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={5} align="stretch">
                <Center>
                  <Image 
                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`} 
                    boxSize="120px" 
                    imageRendering="pixelated"
                    crossOrigin="anonymous"
                  />
                </Center>
                <Center>
                  <TypeIcons types={pokemon.types} />
                </Center>
                
                <Box>
                  <Text fontWeight="bold" mb={2} fontSize="lg">{t('modal.base_stats')}</Text>
                  <VStack spacing={3} align="stretch">
                    {pokemon.baseStats && Object.entries(pokemon.baseStats).map(([stat, value]) => (
                      <Grid key={stat} templateColumns="110px 1fr 40px" gap={3} alignItems="center">
                        <Text fontSize="sm" textAlign="right" fontWeight="medium">{formatStatName(stat)}</Text>
                        <Progress value={value} max={255} colorScheme={value < 60 ? 'red' : value < 90 ? 'yellow' : 'green'} size="sm" borderRadius="md" />
                        <Text fontSize="sm" fontWeight="bold">{value}</Text>
                      </Grid>
                    ))}
                  </VStack>
                </Box>

                <Box>
                   <Text fontWeight="bold" mb={2} fontSize="lg">{t('modal.abilities')}</Text>
                   <HStack>
                      {pokemon.abilities && Array.isArray(pokemon.abilities) && pokemon.abilities.map((ability, index) => {
                        if (typeof ability === 'object' && ability !== null && (ability.name || ability.name_de)) {
                          return (
                            <Tag key={ability.name || index} size="md" variant="subtle" colorScheme="purple">
                                {ability.is_hidden && `${t('modal.hidden_ability_tag')} `}{(i18n.language === 'de' && ability.name_de) ? ability.name_de : ability.name_en || ability.name}
                            </Tag>
                          );
                        }
                        return null;
                      })}
                   </HStack>
                </Box>

                {moveMethods.length > 0 && (
                  <Box>
                    <Text fontWeight="bold" mb={2} fontSize="lg">{t('modal.learnable_moves')} ({game})</Text>
                    <Accordion allowMultiple defaultIndex={[0]}>
                      {moveMethods.map((method) => (
                        <AccordionItem key={method}>
                          <h2>
                            <AccordionButton>
                              <Box flex="1" textAlign="left" fontWeight="medium" textTransform="capitalize">
                                {t(`methods.${method}`, {defaultValue: method.replace('-', ' ')})} ({groupedGameMoves[method].length})
                              </Box>
                              <AccordionIcon />
                            </AccordionButton>
                          </h2>
                          <AccordionPanel pb={4}>
                            <Box maxH="250px" overflowY="auto" pr={2}>
                              <VStack spacing={0} align="stretch">
                                <Grid templateColumns="80px 1fr" gap={3} fontWeight="bold" fontSize="sm" color="gray.500" position="sticky" top={0} bg="white" _dark={{ bg: 'gray.800' }} py={2} zIndex={1}>
                                  <Text>{method.includes('level') ? t('modal.level') : t('modal.tm_hm')}</Text>
                                  <Text>{t('modal.move')}</Text>
                                </Grid>
                                {groupedGameMoves[method].map((move, index) => {
                                  let displayName = t('modal.unknown_move');
                                  if (i18n.language === 'de' && move.name_de) {
                                    displayName = move.name_de;
                                  } else if (move.name_en) {
                                    displayName = move.name_en;
                                  } else if (move.name) {
                                    displayName = move.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                  }

                                  return (
                                    <Grid key={`${(move.name || index)}-${index}`} templateColumns="80px 1fr" gap={3} fontSize="sm" py={1.5} borderTopWidth={1} borderColor="gray.100" _dark={{ borderColor: "gray.600" }}>
                                      <Text fontWeight="bold">
                                        {method.includes('level') ? (move.level > 0 ? move.level : '—') : (move.name ? move.name.split('-')[0].toUpperCase() : '—')}
                                      </Text>
                                      <Text>{displayName}</Text>
                                    </Grid>
                                  );
                                })}
                              </VStack>
                            </Box>
                          </AccordionPanel>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </Box>
                )}
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button colorScheme="blue" onClick={onClose}>
                {t('modal.close_button')}
              </Button>
            </ModalFooter>
          </>
        ) : (
          <Flex justify="center" align="center" height="400px">
             <Text p={6}>{t('modal.loading_error')}</Text>
          </Flex>
        )}
      </ModalContent>
    </Modal>
  );
}

export default PokemonDetailModal;