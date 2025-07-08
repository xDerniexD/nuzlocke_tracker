import React, { useState, useMemo, useEffect } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  Button, Spinner, Flex, Text, Tag, VStack, HStack, Progress, Grid, Box, Center, Image,
  Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon,
  Tooltip, Icon, useDisclosure, Divider
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import TypeIcons from './TypeIcons';
import MoveDetailModal from './MoveDetailModal'; 
import AbilityDetailModal from './AbilityDetailModal';
import PokemonSprite from '../components/PokemonSprite';
import api from '../api/api';
import { FaBolt, FaStar, FaSyncAlt, FaArrowRight } from 'react-icons/fa'; 

function PokemonDetailModal({ isOpen, onClose, pokemon, isLoading, game }) {
  const { i18n, t } = useTranslation();
  const { isOpen: isMoveOpen, onOpen: onMoveOpen, onClose: onMoveClose } = useDisclosure();
  const [selectedMove, setSelectedMove] = useState(null);
  
  const { isOpen: isAbilityOpen, onOpen: onAbilityOpen, onClose: onAbilityClose } = useDisclosure();
  const [selectedAbility, setSelectedAbility] = useState(null);

  const [evolutionChain, setEvolutionChain] = useState(null);
  const [isEvoLoading, setIsEvoLoading] = useState(true);

  useEffect(() => {
    if (pokemon && pokemon.evolutionChainId) {
        const fetchEvolutionChain = async () => {
            setIsEvoLoading(true);
            try {
                const response = await api.get(`/pokemon/evolution-chain/${pokemon.evolutionChainId}`);
                setEvolutionChain(response.data);
            } catch (error) {
                console.error("Konnte Evolutionskette nicht laden", error);
                setEvolutionChain(null);
            } finally {
                setIsEvoLoading(false);
            }
        };
        fetchEvolutionChain();
    } else {
        setIsEvoLoading(false);
    }
  }, [pokemon]);


  const handleMoveClick = (move) => {
    setSelectedMove(move);
    onMoveOpen();
  };
  
  const handleAbilityClick = (ability) => {
    setSelectedAbility(ability);
    onAbilityOpen();
  };
  
  const getEvolutionTriggerText = (details) => {
    if (!details) return '';
    const trigger = details.trigger.name;
    
    switch(trigger) {
        case 'level-up':
            return t('evolution_triggers.level-up', { level: details.min_level });
        case 'trade':
            return t('evolution_triggers.trade');
        case 'use-item':
            const itemName = (i18n.language === 'de' && details.item.name_de)
                ? details.item.name_de
                : details.item.name.replace(/-/g, ' ');
            return t('evolution_triggers.use-item', { item: itemName });
        default:
            return t('evolution_triggers.other');
    }
  };

  const formatStatName = (stat) => t(`stats.${stat}`, { defaultValue: stat });
  
  // KORREKTUR: Diese Funktion wird jetzt direkt im MoveDetailModal verwendet
  // und kann hier entfernt werden, um Code-Duplizierung zu vermeiden.
  const getDamageClassIcon = (damageClass) => {
      const label = t(`damage_class.${damageClass}`, { defaultValue: damageClass });
      switch(damageClass) {
          case 'physical': return { icon: FaBolt, color: 'orange.400', label };
          case 'special': return { icon: FaStar, color: 'purple.400', label };
          case 'status': return { icon: FaSyncAlt, color: 'blue.400', label };
          default: return null;
      }
  };

  const groupedGameMoves = useMemo(() => {
    if (!pokemon?.moves?.[game]) return {};
    const movesByGame = pokemon.moves[game];
    const grouped = {};
    for (const method in movesByGame) {
      if (Array.isArray(movesByGame[method]) && movesByGame[method].length > 0) {
        grouped[method] = [...movesByGame[method]].sort((a, b) => {
          if (method === 'level-up' && a.level !== b.level) return a.level - b.level;
          const moveA = a.move || a;
          const moveB = b.move || b;
          const nameA = (i18n.language === 'de' && moveA.name_de) ? moveA.name_de : (moveA.name_en || '');
          const nameB = (i18n.language === 'de' && moveB.name_de) ? moveB.name_de : (moveB.name_en || '');
          return nameA.localeCompare(nameB);
        });
      }
    }
    return grouped;
  }, [pokemon, game, i18n.language]);

  const moveMethods = Object.keys(groupedGameMoves);
  const moveGridColumns = "0.7fr 2fr 1fr 0.6fr 0.8fr 0.7fr 0.6fr";

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="4xl" isCentered motionPreset="slideInBottom">
        <ModalOverlay />
        <ModalContent>
          {isLoading ? (
            <Flex justify="center" align="center" height="400px"><Spinner size="xl" /></Flex>
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
                      <Center><Image src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`} boxSize="150px" imageRendering="pixelated" crossOrigin="anonymous"/></Center>
                      <Center><TypeIcons types={pokemon.types} /></Center>
                      
                      <Box>
                          <Text fontWeight="bold" mb={2} fontSize="lg">{t('modal.evolutions')}</Text>
                          {isEvoLoading ? <Center><Spinner/></Center> : (
                              <HStack justify="center" align="center" spacing={1}>
                                  {evolutionChain && evolutionChain.length > 1 ? evolutionChain.map((evo, index) => (
                                      <React.Fragment key={evo.pokemonId}>
                                          {index > 0 && (
                                              <VStack px={2} minW="80px">
                                                  <Icon as={FaArrowRight} />
                                                  <Tag size="sm" mt={1} whiteSpace="nowrap" textTransform="capitalize">
                                                      {getEvolutionTriggerText(evo.evolution_details)}
                                                  </Tag>
                                              </VStack>
                                          )}
                                          <VStack>
                                            <PokemonSprite pokemonId={evo.pokemonId} />
                                            <Text fontSize="sm">{(i18n.language === 'de' && evo.name_de) ? evo.name_de : evo.name_en}</Text>
                                          </VStack>
                                      </React.Fragment>
                                  )) : <Text fontSize="sm" color="gray.500">Keine weiteren Entwicklungen.</Text>}
                              </HStack>
                          )}
                      </Box>
                      <Divider />

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
                            {pokemon.abilities && pokemon.abilities.map((abilitySlot, index) => {
                                const ability = abilitySlot.ability;
                                if (!ability) return null;
                                return (
                                    <Tag key={ability._id || index} size="md" variant="subtle" colorScheme="purple" onClick={() => handleAbilityClick(ability)} cursor="pointer" _hover={{ opacity: 0.8 }}>
                                        {abilitySlot.is_hidden && `${t('modal.hidden_ability_tag')} `}{(i18n.language === 'de' && ability.name_de) ? ability.name_de : ability.name_en}
                                    </Tag>
                                );
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
                              <h2><AccordionButton><Box flex="1" textAlign="left" fontWeight="medium" textTransform="capitalize">{t(`methods.${method}`, {defaultValue: method.replace('-', ' ')})} ({groupedGameMoves[method].length})</Box><AccordionIcon /></AccordionButton></h2>
                              <AccordionPanel pb={4}>
                                <Box maxH="450px" overflowY="auto" pr={2}>
                                  <VStack spacing={0} align="stretch">
                                    <Grid templateColumns={moveGridColumns} gap={3} fontWeight="bold" fontSize="xs" color="gray.500" position="sticky" top={0} bg="white" _dark={{ bg: 'gray.800' }} py={2} zIndex={1} textAlign="center">
                                      <Text textAlign="left">{method.includes('level') ? t('modal.level') : t('modal.tm_hm')}</Text>
                                      <Text textAlign="left">{t('modal.move')}</Text>
                                      <Text>{t('modal.type')}</Text>
                                      <Text>{t('modal.category')}</Text>
                                      <Text>{t('modal.power')}</Text>
                                      <Text>{t('modal.accuracy')}</Text>
                                      <Text>{t('modal.pp')}</Text>
                                    </Grid>
                                    {groupedGameMoves[method].map((moveSlot, index) => {
                                      const move = moveSlot.move || moveSlot;
                                      const displayName = (i18n.language === 'de' && move.name_de) ? move.name_de : (move.name_en || t('modal.unknown_move'));
                                      const damageClassInfo = getDamageClassIcon(move.damage_class);
                                      return (
                                        <Grid key={`${move._id}-${index}`} templateColumns={moveGridColumns} gap={3} fontSize="sm" py={2} borderTopWidth={1} borderColor="gray.100" _dark={{ borderColor: "gray.600" }} alignItems="center" textAlign="center" onClick={() => handleMoveClick(move)} cursor="pointer" _hover={{ bg: 'gray.100', _dark: { bg: 'gray.700' } }} borderRadius="md">
                                          <Text fontWeight="bold" textAlign="left">{method.includes('level') ? (moveSlot.level > 0 ? moveSlot.level : '—') : (move.tm || '—')}</Text>
                                          <Text textAlign="left">{displayName}</Text>
                                          <Box><TypeIcons types={[move.type]} /></Box>
                                          {damageClassInfo ? (<Tooltip label={damageClassInfo.label}><Center><Icon as={damageClassInfo.icon} color={damageClassInfo.color} /></Center></Tooltip>) : (<Text>—</Text>)}
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
              <ModalFooter><Button colorScheme="blue" onClick={onClose}>{t('modal.close_button')}</Button></ModalFooter>
            </>
          ) : (
            <Flex justify="center" align="center" height="400px"><Text p={6}>{t('modal.loading_error')}</Text></Flex>
          )}
        </ModalContent>
      </Modal>
      
      <MoveDetailModal isOpen={isMoveOpen} onClose={onMoveClose} move={selectedMove} />
      <AbilityDetailModal isOpen={isAbilityOpen} onClose={onAbilityClose} ability={selectedAbility} />
    </>
  );
}

export default PokemonDetailModal;