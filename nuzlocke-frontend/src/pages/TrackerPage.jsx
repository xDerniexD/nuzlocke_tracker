import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/api';
import PokemonSprite from '../components/PokemonSprite';
import AutocompleteInput from '../components/AutocompleteInput';
import StatusButtonGroup from '../components/StatusButtonGroup';
import TypeIcons from '../components/TypeIcons';
import {
  Box, Button, Container, Flex, Heading, Spinner, Alert,
  AlertIcon, Grid, Text, Input, Select, useToast, Tag, HStack,
  CheckboxGroup, Checkbox, Stack, Divider, Icon, Image,
  VStack, StackDivider, useDisclosure,
  // Wieder hinzugefügte Komponenten für das Modal
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter,
  ModalBody, ModalCloseButton, FormControl, FormLabel, Textarea
} from '@chakra-ui/react';
import { ArrowBackIcon, CheckCircleIcon, TimeIcon } from '@chakra-ui/icons';
import { FaShieldAlt, FaBook } from 'react-icons/fa'; // Wieder hinzugefügtes Icon für Regeln

const filterOptions = [
  { value: 'pending', label: 'Unbesucht' },
  { value: 'caught', label: 'Gefangen' },
  { value: 'gift', label: 'Geschenk' },
  { value: 'fainted', label: 'Besiegt' },
  { value: 'missed', label: 'Verpasst' },
];

function TrackerPage() {
  const { id } = useParams();
  const [run, setRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState('saved');
  const toast = useToast();
  const debounceTimeout = useRef(null);

  // Wieder hinzugefügte Logik für das Regel-Modal
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [rules, setRules] = useState({ dupesClause: true, shinyClause: true, customRules: '' });

  const [sortBy, setSortBy] = useState('default');
  const [filterBy, setFilterBy] = useState(filterOptions.map(f => f.value)); 
  const [displayedEncounters, setDisplayedEncounters] = useState([]);

  const caughtPokemonIds = useMemo(() => {
    if (!run) return [];
    const ids = new Set();
    run.encounters.forEach(enc => {
      if ((enc.status1 === 'caught' || enc.status1 === 'gift') && enc.pokemonId1) {
        ids.add(enc.pokemonId1);
      }
      if ((enc.status2 === 'caught' || enc.status2 === 'gift') && enc.pokemonId2) {
        ids.add(enc.pokemonId2);
      }
    });
    return Array.from(ids);
  }, [run]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const response = await api.get(`/nuzlockes/${id}`);
        setRun(response.data);
        // Setze die initialen Regeln für das Modal
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
    let processedEncounters = [...run.encounters];
    if (filterBy.length > 0) {
      processedEncounters = processedEncounters.filter(encounter => {
        if (encounter.isEvent) return true;
        const p1Match = filterBy.includes(encounter.status1);
        const p2Match = run.type === 'soullink' ? filterBy.includes(encounter.status2) : false;
        return p1Match || p2Match;
      });
    } else {
      processedEncounters = processedEncounters.filter(encounter => encounter.isEvent);
    }
    if (sortBy === 'alpha') {
      processedEncounters.sort((a, b) => a.locationName.localeCompare(b.locationName));
    } else if (sortBy === 'default') {
      processedEncounters.sort((a, b) => (a.sequence || 999) - (b.sequence || 999));
    }
    setDisplayedEncounters(processedEncounters);
  }, [run, sortBy, filterBy]);

  const handleUpdateRun = useCallback(async () => {
    if (!run) return;
    setSaveStatus('saving');
    try {
      await api.put(`/nuzlockes/${id}`, { encounters: run.encounters });
      setSaveStatus('saved');
    } catch (err) {
      toast({ title: "Fehler beim Speichern.", status: "error", duration: 3000, isClosable: true });
      setSaveStatus('saved');
    }
  }, [run, id, toast]);

  useEffect(() => {
    if (loading || !run) return;
    setSaveStatus('typing');
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      handleUpdateRun();
    }, 1500);
    return () => clearTimeout(debounceTimeout.current);
  }, [run, loading, handleUpdateRun]);

  const handleFieldChange = (index, field, value) => {
    const originalIndex = run.encounters.findIndex(e => e._id === displayedEncounters[index]?._id);
    if (originalIndex === -1) return;
    const updatedEncounters = [...run.encounters];
    updatedEncounters[originalIndex][field] = value;
    setRun({ ...run, encounters: updatedEncounters });
  };

  const handlePokemonSelect = (index, player, selectedPokemon) => {
    const originalIndex = run.encounters.findIndex(e => e._id === displayedEncounters[index]?._id);
    if (originalIndex === -1) return;
    const updatedEncounters = [...run.encounters];
    const encounterToUpdate = updatedEncounters[originalIndex];
    
    const displayName = selectedPokemon.name_de || selectedPokemon.name_en;

    if (player === 1) {
      encounterToUpdate.pokemon1 = displayName;
      encounterToUpdate.pokemonId1 = selectedPokemon.id;
      encounterToUpdate.types1 = selectedPokemon.types;
      if (encounterToUpdate.status1 === 'pending') encounterToUpdate.status1 = 'caught';
    } else {
      encounterToUpdate.pokemon2 = displayName;
      encounterToUpdate.pokemonId2 = selectedPokemon.id;
      encounterToUpdate.types2 = selectedPokemon.types;
      if (encounterToUpdate.status2 === 'pending') encounterToUpdate.status2 = 'caught';
    }
    setRun({ ...run, encounters: updatedEncounters });
  };
  
  // Wieder hinzugefügte Funktion zum Speichern der Regeln
  const handleSaveRules = async () => {
    try {
      const response = await api.put(`/nuzlockes/${id}/rules`, { rules });
      setRun(response.data);
      toast({ title: "Regeln gespeichert!", status: "success", duration: 2000, isClosable: true });
      onClose();
    } catch (err) {
      toast({ title: "Fehler beim Speichern der Regeln.", status: "error", duration: 3000, isClosable: true });
    }
  };

  const getSaveStatusIndicator = () => {
    switch (saveStatus) {
      case 'saving': return <Tag colorScheme="blue"><Spinner size="xs" mr={2} /> Speichern...</Tag>;
      case 'typing': return <Tag colorScheme="orange"><TimeIcon mr={2} /> Ungespeicherte Änderungen</Tag>;
      default: return <Tag colorScheme="green"><CheckCircleIcon mr={2} /> Gespeichert</Tag>;
    }
  };

  if (loading) return <Flex justify="center" align="center" height="100vh"><Spinner size="xl" /></Flex>;
  if (error) return <Container mt={10}><Alert status="error"><AlertIcon />{error}</Alert></Container>;
  if (!run) return <Container mt={10}><Text>Run nicht gefunden.</Text></Container>;

  const isSoullink = run.type === 'soullink';
  const player1Name = run.participants[0]?.username || 'Spieler 1';
  const player2Name = run.participants[1]?.username || 'Spieler 2';

  return (
    <>
      <Container maxW="container.2xl" py={8}>
        <Flex justifyContent="space-between" alignItems="center" mb={4}>
          <HStack>
            <Link to="/"><Button leftIcon={<ArrowBackIcon />}>Dashboard</Button></Link>
            {/* Der wiederhergestellte Regel-Button */}
            <Button leftIcon={<FaBook />} onClick={onOpen}>Regeln</Button>
          </HStack>
          <Heading as="h1" size="lg" textAlign="center">{run.runName}</Heading>
          <Box minW="180px" textAlign="right">{getSaveStatusIndicator()}</Box>
        </Flex>
        
        {/* Der Rest der Seite bleibt unverändert */}
        <HStack spacing={8} mb={4} p={4} borderWidth={1} borderRadius="lg" align="center">
          <HStack>
            <Text fontWeight="bold">Sortieren:</Text>
            <Select w="200px" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="default">Standard</option>
              <option value="alpha">Alphabetisch (A-Z)</option>
            </Select>
          </HStack>
          <HStack>
            <Text fontWeight="bold">Filtern:</Text>
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
              templateColumns={isSoullink ? '2fr 70px 1.5fr 1.5fr 1.5fr 70px 1.5fr 1.5fr 1.5fr' : '2fr 70px 1.5fr 1.5fr 1.5fr'}
              gap={4} alignItems="center" p={4} borderBottomWidth={2} borderColor="gray.300" _dark={{ borderColor: 'gray.600' }}
          >
              <Text fontWeight="bold">Ort</Text>
              <Text fontWeight="bold" textAlign="center">Pokémon</Text>
              <Text fontWeight="bold">Name</Text>
              <Text fontWeight="bold">Nickname</Text>
              <Text fontWeight="bold">Status</Text>
              {isSoullink && (
              <>
                  <Text fontWeight="bold" textAlign="center">Pokémon</Text>
                  <Text fontWeight="bold">Name</Text>
                  <Text fontWeight="bold">Nickname</Text>
                  <Text fontWeight="bold">Status</Text>
              </>
              )}
          </Grid>
          
          {displayedEncounters.map((encounter, index) => {
            if (encounter.isEvent) {
              return (
                <Flex key={encounter._id || index} align="center" justify="center" py={3} bg="gray.100" _dark={{ bg: 'gray.700' }}>
                  {encounter.badgeImage && (
                    <Image src={`/assets/images/badges/${encounter.badgeImage}`} alt="Orden" boxSize="32px" mr={4} />
                  )}
                  <Icon as={FaShieldAlt} mr={3} color="blue.500" />
                  <Text fontWeight="bold">{encounter.locationName}</Text>
                  <Text ml={2} color="gray.500" _dark={{color: "gray.400"}}> - Level Cap: {encounter.levelCap}</Text>
                </Flex>
              );
            }
            
            const isFailed = encounter.status1 === 'fainted' || encounter.status1 === 'missed' || (isSoullink && (encounter.status2 === 'fainted' || encounter.status2 === 'missed'));
            return (
              <Grid
                key={encounter._id || index}
                templateColumns={isSoullink ? '2fr 70px 1.5fr 1.5fr 1.5fr 70px 1.5fr 1.5fr 1.5fr' : '2fr 70px 1.5fr 1.5fr 1.5fr'}
                gap={4} alignItems="center" p={2}
                sx={{ textDecoration: isFailed ? 'line-through' : 'none', opacity: isFailed ? 0.6 : 1, transition: 'all 0.2s' }}
              >
                <Text>{encounter.locationName}</Text>
                <VStack spacing={1}>
                  <PokemonSprite pokemonId={encounter.pokemonId1} />
                  <TypeIcons types={encounter.types1} />
                </VStack>
                <AutocompleteInput initialValue={encounter.pokemon1 || ''} onPokemonSelect={(p) => handlePokemonSelect(index, 1, p)} caughtPokemonIds={caughtPokemonIds} isDupesClauseActive={run.rules?.dupesClause} />
                <Input placeholder="Nickname" value={encounter.nickname1 || ''} onChange={(e) => handleFieldChange(index, 'nickname1', e.target.value)} />
                {encounter.status1 === 'pending' ? <Box /> : <StatusButtonGroup currentStatus={encounter.status1} onChange={(newStatus) => handleFieldChange(index, 'status1', newStatus)} />}
                
                {isSoullink && (
                  <>
                    <VStack spacing={1}>
                      <PokemonSprite pokemonId={encounter.pokemonId2} />
                      <TypeIcons types={encounter.types2} />
                    </VStack>
                    <AutocompleteInput initialValue={encounter.pokemon2 || ''} onPokemonSelect={(p) => handlePokemonSelect(index, 2, p)} caughtPokemonIds={caughtPokemonIds} isDupesClauseActive={run.rules?.dupesClause} />
                    <Input placeholder="Nickname" value={encounter.nickname2 || ''} onChange={(e) => handleFieldChange(index, 'nickname2', e.target.value)} />
                    {encounter.status2 === 'pending' ? <Box /> : <StatusButtonGroup currentStatus={encounter.status2} onChange={(newStatus) => handleFieldChange(index, 'status2', newStatus)} />}
                  </>
                )}
              </Grid>
            );
          })}
        </VStack>
      </Container>

      {/* Das wiederhergestellte Modal für die Regeln */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Regelwerk bearbeiten</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <Checkbox 
                  isChecked={rules.dupesClause} 
                  onChange={(e) => setRules({...rules, dupesClause: e.target.checked})}
                >
                  Dupes Clause
                </Checkbox>
              </FormControl>
              <FormControl>
                <Checkbox 
                  isChecked={rules.shinyClause} 
                  onChange={(e) => setRules({...rules, shinyClause: e.target.checked})}
                >
                  Shiny Clause
                </Checkbox>
              </FormControl>
              <FormControl>
                <FormLabel>Eigene Regeln:</FormLabel>
                <Textarea 
                  value={rules.customRules} 
                  onChange={(e) => setRules({...rules, customRules: e.target.value})}
                  placeholder="Trage hier deine eigenen Regeln ein..."
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Schließen
            </Button>
            <Button colorScheme="blue" onClick={handleSaveRules}>
              Speichern
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

export default TrackerPage;
