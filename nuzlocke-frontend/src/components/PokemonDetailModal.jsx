import React from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  Button, Spinner, Flex, Text, Tag, VStack, HStack, Progress, Grid, Box, Center, Image,
  Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon,
  Tooltip, Icon
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import TypeIcons from './TypeIcons';
// KORREKTUR: FaShieldAlt durch FaSyncAlt ersetzt
import { FaBolt, FaStar, FaSyncAlt } from 'react-icons/fa'; 

function PokemonDetailModal({ isOpen, onClose, pokemon, isLoading, game }) {
  const { i18n, t } = useTranslation();

  const formatStatName = (stat) => {
    return t(`stats.${stat}`, { defaultValue: stat });
  };
  
  const getDamageClassIcon = (damageClass) => {
      switch(damageClass) {
          case 'physical': return { icon: FaBolt, color: 'orange.400', label: 'Physisch' };
          case 'special': return { icon: FaStar, color: 'purple.400', label: 'Speziell' };
          // KORREKTUR: Neues Icon für Status-Attacken
          case 'status': return { icon: FaSyncAlt, color: 'blue.400', label: 'Status' };
          default: return null;
      }
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

  const moveGridColumns = "0.7fr 2fr 1fr 0.6fr 0.8fr 0.7fr 0.6fr";

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" isCentered motionPreset="slideInBottom">
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
              <Grid templateColumns={{ base: "1fr", md: "1fr 2fr" }} gap={8}>
                <VStack spacing={5} align="stretch">
                    <Center>
                    <Image 
                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`} 
                        boxSize="150px" 
                        imageRendering="pixelated"
                        crossOrigin="anonymous"
                    />
                    </Center>
                    <Center><TypeIcons types={pokemon.types} /></Center>
                    
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
                </VStack>

                <VStack spacing={5} align="stretch">
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
                            <Box maxH="450px" overflowY="auto" pr={2}>
                              <VStack spacing={0} align="stretch">
                                <Grid templateColumns={moveGridColumns} gap={3} fontWeight="bold" fontSize="xs" color="gray.500" position="sticky" top={0} bg="white" _dark={{ bg: 'gray.800' }} py={2} zIndex={1} textAlign="center">
                                  <Text textAlign="left">{method.includes('level') ? t('modal.level') : t('modal.tm_hm')}</Text>
                                  <Text textAlign="left">{t('modal.move')}</Text>
                                  <Text>Typ</Text>
                                  <Text>Art</Text>
                                  <Text>Stärke</Text>
                                  <Text>Gen.</Text>
                                  <Text>AP</Text>
                                </Grid>
                                {groupedGameMoves[method].map((move, index) => {
                                  const displayName = (i18n.language === 'de' && move.name_de) ? move.name_de : (move.name_en || t('modal.unknown_move'));
                                  const damageClassInfo = getDamageClassIcon(move.damage_class);

                                  return (
                                    <Grid key={`${(move.name || index)}-${index}`} templateColumns={moveGridColumns} gap={3} fontSize="sm" py={2} borderTopWidth={1} borderColor="gray.100" _dark={{ borderColor: "gray.600" }} alignItems="center" textAlign="center">
                                      <Text fontWeight="bold" textAlign="left">
                                        {method.includes('level') ? (move.level > 0 ? move.level : '—') : (move.tm || '—')}
                                      </Text>
                                      <Text textAlign="left">{displayName}</Text>
                                      <Box><TypeIcons types={[move.type]} /></Box>
                                      {damageClassInfo ? (
                                        <Tooltip label={damageClassInfo.label}><Center><Icon as={damageClassInfo.icon} color={damageClassInfo.color} /></Center></Tooltip>
                                      ) : (
                                        <Text>—</Text>
                                      )}
                                      <Text>{move.power || '—'}</Text>
                                      <Text>{move.accuracy || '—'}</Text>
                                      <Text>{move.pp || '—'}</Text>
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
              </Grid>
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