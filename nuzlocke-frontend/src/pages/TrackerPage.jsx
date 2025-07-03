import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/api';
import PokemonSprite from '../components/PokemonSprite';
import AutocompleteInput from '../components/AutocompleteInput';
import StatusButtonGroup from '../components/StatusButtonGroup';
import TypeIcons from '../components/TypeIcons';
import PokemonDetailModal from '../components/PokemonDetailModal';
import {
  Box, Button, Container, Flex, Heading, Spinner, Alert,
  AlertIcon, Grid, Text, Input, Select, useToast, Tag, HStack,
  CheckboxGroup, Checkbox, Stack, Divider, Icon, Image,
  VStack, StackDivider, useDisclosure,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter,
  ModalBody, ModalCloseButton, FormControl, FormLabel, Textarea,
  Menu, MenuButton, MenuList, MenuItemOption, MenuOptionGroup,
  useClipboard, Tooltip, IconButton
} from '@chakra-ui/react';
import { ArrowBackIcon, CheckCircleIcon, TimeIcon } from '@chakra-ui/icons';
import { FaShieldAlt, FaBook, FaCog, FaCopy } from 'react-icons/fa';
import io from 'socket.io-client';

function TrackerPage() {
  const { id } = useParams();
  const { i18n, t } = useTranslation();

  const [run, setRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState('saved');
  const [currentUser, setCurrentUser] = useState(null);
  const toast = useToast();

  const [player1Name, setPlayer1Name] = useState('Spieler 1');
  const [player2Name, setPlayer2Name] = useState('Spieler 2');

  const { isOpen: isRulesOpen, onOpen: onRulesOpen, onClose: onRulesClose } = useDisclosure();
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure();

  const [rules, setRules] = useState({ dupesClause: true, shinyClause: true, customRules: '' });
  
  const [viewSettings, setViewSettings] = useState({
    showNicknames: true,
    showStatic: true,
    showGift: true,
  });
  
  const [selectedPokemonDetails, setSelectedPokemonDetails] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const { onCopy, hasCopied } = useClipboard(run?.inviteCode || '');
  const [sortBy, setSortBy] = useState('default');
  
  const filterOptions = useMemo(() => [
    { value: 'pending', label: t('tracker.filter_pending') },
    { value: 'caught', label: t('tracker.filter_caught') },
    { value: 'gift', label: t('tracker.filter_gift') },
    { value: 'fainted', label: t('tracker.filter_fainted') },
    { value: 'missed', label: t('tracker.filter_missed') },
  ], [t]);

  const [filterBy, setFilterBy] = useState(filterOptions.map(f => f.value));
  const [displayedEncounters, setDisplayedEncounters] = useState([]);

  useEffect(() => {
    const userFromStorage = JSON.parse(localStorage.getItem('user'));
    if (userFromStorage) {
      setCurrentUser(userFromStorage);
    }

    const socket = io(import.meta.env.VITE_API_BASE_URL);
    socket.on('connect', () => {
      socket.emit('joinRoom', id);
    });

    socket.on('nuzlocke:updated', ({ updatedEncounter, senderId }) => {
      if (!updatedEncounter) return;
      if (userFromStorage && userFromStorage._id === senderId) {
        setSaveStatus('saved');
        return;
      }
      
      setRun(prevRun => {
        if (!prevRun) return null;
        const newEncounters = prevRun.encounters.map(enc => 
          enc._id === updatedEncounter._id ? { ...enc, ...updatedEncounter } : enc
        );
        return { ...prevRun, encounters: newEncounters };
      });
      setSaveStatus('saved');
      toast({
        title: "Run wurde von einem Partner aktualisiert.", status: "info",
        duration: 3000, isClosable: true, position: "top-right"
      });
    });

    socket.on('nuzlocke:rules_updated', ({ rules: updatedRules, senderId }) => {
        if (!updatedRules) return;
        if (userFromStorage && userFromStorage._id === senderId) {
            setSaveStatus('saved');
            return;
        }
        setRun(prevRun => ({ ...prevRun, rules: updatedRules }));
        setRules(updatedRules);
        toast({ title: "Regeln wurden von einem Partner aktualisiert.", status: "info", duration: 3000, isClosable: true, position: "top-right" });
    });

    return () => {
      socket.disconnect();
    };
  }, [id, toast]);

  useEffect(() => {
    if (run?.participants) {
      setPlayer1Name(run.participants[0]?.username || 'Spieler 1');
      if (run.type === 'soullink') {
        setPlayer2Name(run.participants[1]?.username || 'Spieler 2');
      }
    }
  }, [run?.participants, run?.type]);

  const player1CaughtChains = useMemo(() => {
    if (!run) return [];
    const chains = new Set();
    run.encounters.forEach(enc => {
      if (enc && (enc.status1 === 'caught' || enc.status1 === 'gift') && enc.evolutionChainId1) {
        chains.add(enc.evolutionChainId1);
      }
    });
    return Array.from(chains);
  }, [run]);

  const player2CaughtChains = useMemo(() => {
    if (!run || run.type !== 'soullink') return [];
    const chains = new Set();
    run.encounters.forEach(enc => {
      if (enc && (enc.status2 === 'caught' || enc.status2 === 'gift') && enc.evolutionChainId2) {
        chains.add(enc.evolutionChainId2);
      }
    });
    return Array.from(chains);
  }, [run]);
  
  const gridTemplateColumns = useMemo(() => {
    if (!run) return '';
    const columns = ['2fr', '80px', '1.5fr'];
    if (viewSettings.showNicknames) { columns.push('1.5fr'); }
    columns.push('1.5fr');

    if (run.type === 'soullink') {
      columns.push('80px', '1.5fr');
      if (viewSettings.showNicknames) { columns.push('1.5fr'); }
      columns.push('1.5fr');
    }
    return columns.join(' ');
  }, [run?.type, viewSettings.showNicknames]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const response = await api.get(`/nuzlockes/${id}`);
        setRun(response.data);
        if (response.data.rules) {
          setRules(response.data.rules);
        }
      } catch (err) {
        setError('Fehler beim Laden der Daten.');
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, [id]);

  useEffect(() => {
    if (!run) return;
    let processedEncounters = run.encounters.filter(Boolean);

    processedEncounters = processedEncounters.filter(encounter => {
      if (encounter.encounterType === 'static' && !viewSettings.showStatic) return false;
      if (encounter.encounterType === 'gift' && !viewSettings.showGift) return false;
      return true;
    });

    if (filterBy.length > 0 && filterBy.length < filterOptions.length) {
      processedEncounters = processedEncounters.filter(encounter => {
        if (encounter.encounterType === 'event') { return true; }
        const p1Match = filterBy.includes(encounter.status1);
        if (run.type === 'soullink') {
          const p2Match = filterBy.includes(encounter.status2);
          return p1Match && p2Match;
        }
        return p1Match;
      });
    }

    if (sortBy === 'alpha') {
      processedEncounters.sort((a, b) => {
        const nameA = i18n.language === 'de' ? a.locationName_de : a.locationName_en;
        const nameB = i18n.language === 'de' ? b.locationName_de : b.locationName_en;
        return nameA.localeCompare(nameB);
      });
    } else if (sortBy === 'default') {
      processedEncounters.sort((a, b) => (a.sequence || 999) - (b.sequence || 999));
    }
    setDisplayedEncounters(processedEncounters);
  }, [run, sortBy, filterBy, i18n.language, viewSettings, filterOptions.length]);

  const saveEncounterChange = useCallback(async (updatedEncounter) => {
    setSaveStatus('saving');
    try {
      await api.put(`/nuzlockes/${id}`, { updatedEncounter });
    } catch (error) {
      toast({ title: "Fehler beim Speichern.", status: "error", duration: 3000, isClosable: true });
      setSaveStatus('saved');
    }
  }, [id, toast]);

  const handleFieldChange = (index, field, value) => {
    const encounter = displayedEncounters[index];
    if (!encounter) return;
    const updatedEncounter = { ...encounter, [field]: value };
    
    setRun(prevRun => ({
      ...prevRun,
      encounters: prevRun.encounters.map(e => e._id === encounter._id ? updatedEncounter : e)
    }));
    
    saveEncounterChange(updatedEncounter);
  };

  const handlePokemonSelect = (index, player, selectedPokemon) => {
    const encounter = displayedEncounters[index];
    if (!encounter) return;
    
    const displayName = (i18n.language === 'de' && selectedPokemon.name_de) ? selectedPokemon.name_de : selectedPokemon.name_en;
    let changes = {};

    if (player === 1) {
      changes = { pokemon1: displayName, pokemonId1: selectedPokemon.id, types1: selectedPokemon.types, evolutionChainId1: selectedPokemon.evolutionChainId };
      if (encounter.status1 === 'pending' || encounter.status1 === 'gift') {
        changes.status1 = 'caught';
      }
    } else {
      changes = { pokemon2: displayName, pokemonId2: selectedPokemon.id, types2: selectedPokemon.types, evolutionChainId2: selectedPokemon.evolutionChainId };
      if (encounter.status2 === 'pending' || encounter.status2 === 'gift') {
        changes.status2 = 'caught';
      }
    }
    
    const updatedEncounter = { ...encounter, ...changes };

    setRun(prevRun => ({
      ...prevRun,
      encounters: prevRun.encounters.map(e => e._id === encounter._id ? updatedEncounter : e)
    }));

    saveEncounterChange(updatedEncounter);
  };
  
  const handleSpriteClick = async (pokemonId) => {
    if (!pokemonId) return;
    onDetailOpen();
    setIsDetailLoading(true);
    try {
      const response = await api.get(`/pokemon/${pokemonId}`);
      setSelectedPokemonDetails(response.data);
    } catch (error) {
      console.error("Fehler beim Abrufen der Pokémon-Details:", error);
      setSelectedPokemonDetails(null);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleSaveRules = async () => {
    try {
      setSaveStatus('saving');
      await api.put(`/nuzlockes/${id}/rules`, { rules });
    } catch (err) {
      toast({ title: "Fehler beim Speichern der Regeln.", status: "error", duration: 3000, isClosable: true });
    }
  };

  const getSaveStatusIndicator = () => {
    switch (saveStatus) {
      case 'saving': return <Tag colorScheme="blue"><Spinner size="xs" mr={2} />Speichern...</Tag>;
      default: return <Tag colorScheme="green"><CheckCircleIcon mr={2} />Gespeichert</Tag>;
    }
  };
  
  if (loading) return <Flex justify="center" align="center" height="100vh"><Spinner size="xl" /></Flex>;
  if (error) return <Container mt={10}><Alert status="error"><AlertIcon />{error}</Alert></Container>;
  if (!run) return <Container mt={10}><Text>Run nicht gefunden.</Text></Container>;

  const isSoullink = run.type === 'soullink';
  
  return (
    <>
      <Container maxW="container.2xl" py={8}>
        <Flex justifyContent="space-between" alignItems="center" mb={4}>
          <HStack>
            <Link to="/"><Button leftIcon={<ArrowBackIcon />}>{t('tracker.dashboard_button')}</Button></Link>
            <Button leftIcon={<FaBook />} onClick={onRulesOpen}>{t('tracker.rules_button')}</Button>
            <Menu closeOnSelect={false}>
              <MenuButton as={Button} leftIcon={<Icon as={FaCog} />}>
                {t('tracker.view_button')}
              </MenuButton>
              <MenuList minWidth="240px">
                <MenuOptionGroup
                  title={t('settings.show_columns_title')}
                  type="checkbox"
                  value={Object.keys(viewSettings).filter(key => viewSettings[key])}
                  onChange={(values) =>
                    setViewSettings({
                      showNicknames: values.includes('showNicknames'),
                      showStatic: values.includes('showStatic'),
                      showGift: values.includes('showGift'),
                    })
                  }
                >
                  <MenuItemOption value="showNicknames">{t('settings.nickname_column')}</MenuItemOption>
                  <MenuItemOption value="showStatic">{t('settings.static_encounters')}</MenuItemOption>
                  <MenuItemOption value="showGift">{t('settings.gift_pokemon')}</MenuItemOption>
                </MenuOptionGroup>
              </MenuList>
            </Menu>
          </HStack>
          
          <VStack spacing={0}>
            <Heading as="h1" size="lg" textAlign="center">{run.runName}</Heading>
            {run?.type === 'soullink' && run.inviteCode && (
              <HStack mt={2} p={1.5} pl={3} borderRadius="md" bg="gray.100" _dark={{ bg: 'gray.700' }}>
                <Text fontSize="sm" fontWeight="medium" color="gray.600" _dark={{ color: 'gray.300' }}>
                  Invite Code:
                </Text>
                <Tag size="lg" colorScheme="purple" fontWeight="bold">
                  {run.inviteCode}
                </Tag>
                <Tooltip label={hasCopied ? "Kopiert!" : "Kopieren"} closeOnClick={false}>
                  <IconButton aria-label="Invite Code kopieren" icon={<FaCopy />} size="sm" onClick={onCopy} variant="ghost" />
                </Tooltip>
              </HStack>
            )}
          </VStack>

          <Box minW="220px" textAlign="right">{getSaveStatusIndicator()}</Box>
        </Flex>

        <HStack spacing={8} mb={4} p={4} borderWidth={1} borderRadius="lg" align="center">
          <HStack>
            <Text fontWeight="bold">{t('tracker.sort_by')}</Text>
            <Select w="200px" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="default">{t('tracker.sort_default')}</option>
              <option value="alpha">{t('tracker.sort_alpha')}</option>
            </Select>
          </HStack>
          <HStack>
            <Text fontWeight="bold">{t('tracker.filter_by')}</Text>
            <CheckboxGroup colorScheme="green" value={filterBy} onChange={setFilterBy}>
              <Stack spacing={5} direction="row">
                {filterOptions.map(option => (
                  <Checkbox key={option.value} value={option.value}>
                    {option.label}
                  </Checkbox>
                ))}
              </Stack>
            </CheckboxGroup>
          </HStack>
        </HStack>

        <VStack spacing={0} align="stretch" borderWidth={1} borderRadius="lg" divider={<StackDivider />}>
          <Grid
              templateColumns={gridTemplateColumns}
              gap={4} alignItems="center" p={4} borderBottomWidth={2} borderColor="gray.300" _dark={{ borderColor: 'gray.600' }}
          >
              <Text fontWeight="bold">{t('tracker.location_header')}</Text>
              <Text fontWeight="bold" textAlign="center" whiteSpace="nowrap">{t('tracker.pokemon_header')}</Text>
              <Text fontWeight="bold">{player1Name}</Text>
              {viewSettings.showNicknames && <Text fontWeight="bold">{t('tracker.nickname_header')}</Text>}
              <Text fontWeight="bold">{t('tracker.status_header')}</Text>
              {isSoullink && (
              <>
                  <Text fontWeight="bold" textAlign="center" whiteSpace="nowrap">{t('tracker.pokemon_header')}</Text>
                  <Text fontWeight="bold">{player2Name}</Text>
                  {viewSettings.showNicknames && <Text fontWeight="bold">{t('tracker.nickname_header')}</Text>}
                  <Text fontWeight="bold">{t('tracker.status_header')}</Text>
              </>
              )}
          </Grid>
          
          {displayedEncounters.map((encounter, index) => {
            if (!encounter) return null;
            if (encounter.encounterType === 'event') {
              return (
                <Flex key={encounter._id || index} align="center" justify="center" py={3} bg="gray.100" _dark={{ bg: 'gray.700' }}>
                  <Icon as={FaShieldAlt} mr={3} color="blue.500" />
                  <Text fontWeight="bold">{(i18n.language === 'de' && encounter.locationName_de) ? encounter.locationName_de : encounter.locationName_en}</Text>
                  <Text ml={2} color="gray.500" _dark={{color: "gray.400"}}> - {t('tracker.level_cap')}: {encounter.levelCap}</Text>
                </Flex>
              );
            }
            
            const isFailed = encounter.status1 === 'fainted' || encounter.status1 === 'missed' || (isSoullink && (encounter.status2 === 'fainted' || encounter.status2 === 'missed'));
            
            return (
              <Grid
                key={encounter._id || index}
                templateColumns={gridTemplateColumns}
                gap={4}
                alignItems="center"
                p={2}
                sx={{ textDecoration: isFailed ? 'line-through' : 'none', opacity: isFailed ? 0.6 : 1, transition: 'all 0.2s' }}
              >
                <Text>{(i18n.language === 'de' && encounter.locationName_de) ? encounter.locationName_de : encounter.locationName_en}</Text>
                <VStack spacing={1}>
                  <PokemonSprite pokemonId={encounter.pokemonId1} onClick={() => handleSpriteClick(encounter.pokemonId1)} />
                  <TypeIcons types={encounter.types1} />
                </VStack>
                <AutocompleteInput
                  initialValue={encounter.pokemon1 || ''}
                  onPokemonSelect={(p) => handlePokemonSelect(index, 1, p)}
                  isDupesClauseActive={run.rules?.dupesClause}
                  playerContext={1}
                  player1CaughtChains={player1CaughtChains}
                  player2CaughtChains={player2CaughtChains}
                  isDisabled={false}
                />
                {viewSettings.showNicknames && (
                  <Input placeholder="Nickname" value={encounter.nickname1 || ''} onChange={(e) => handleFieldChange(index, 'nickname1', e.target.value)} />
                )}
                {/* KORREKTUR HIER */}
                {encounter.status1 === 'pending' ? <Box /> : <StatusButtonGroup currentStatus={encounter.status1} onChange={(newStatus) => handleFieldChange(index, 'status1', newStatus)} />}
                
                {isSoullink && (
                  <>
                    <VStack spacing={1}>
                      <PokemonSprite pokemonId={encounter.pokemonId2} onClick={() => handleSpriteClick(encounter.pokemonId2)} />
                      <TypeIcons types={encounter.types2} />
                    </VStack>
                    <AutocompleteInput
                      initialValue={encounter.pokemon2 || ''}
                      onPokemonSelect={(p) => handlePokemonSelect(index, 2, p)}
                      isDupesClauseActive={run.rules?.dupesClause}
                      playerContext={2}
                      player1CaughtChains={player1CaughtChains}
                      player2CaughtChains={player2CaughtChains}
                      isDisabled={false}
                    />
                    {viewSettings.showNicknames && (
                      <Input placeholder="Nickname" value={encounter.nickname2 || ''} onChange={(e) => handleFieldChange(index, 'nickname2', e.target.value)} />
                    )}
                    {/* KORREKTUR HIER */}
                    {encounter.status2 === 'pending' ? <Box /> : <StatusButtonGroup currentStatus={encounter.status2} onChange={(newStatus) => handleFieldChange(index, 'status2', newStatus)} />}
                  </>
                )}
              </Grid>
            );
          })}
        </VStack>
      </Container>

      <Modal isOpen={isRulesOpen} onClose={onRulesClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{t('rules.modal_title')}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <Checkbox isChecked={rules?.dupesClause} onChange={(e) => setRules({...rules, dupesClause: e.target.checked})}>
                  {t('rules.dupes_clause')}
                </Checkbox>
              </FormControl>
              <FormControl>
                <Checkbox isChecked={rules?.shinyClause} onChange={(e) => setRules({...rules, shinyClause: e.target.checked})}>
                  {t('rules.shiny_clause')}
                </Checkbox>
              </FormControl>
              <FormControl>
                <FormLabel>{t('rules.custom_rules_label')}</FormLabel>
                <Textarea value={rules?.customRules} onChange={(e) => setRules({...rules, customRules: e.target.value})} placeholder={t('rules.custom_rules_placeholder')} />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onRulesClose}>
              {t('rules.close_button')}
            </Button>
            <Button colorScheme="blue" onClick={handleSaveRules}>
              {t('rules.save_button')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <PokemonDetailModal
        isOpen={isDetailOpen}
        onClose={onDetailClose}
        pokemon={selectedPokemonDetails}
        isLoading={isDetailLoading}
        game={run?.game}
      />
    </>
  );
}

export default TrackerPage;