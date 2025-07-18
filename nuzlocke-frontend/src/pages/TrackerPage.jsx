import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/api';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';


import PokemonSprite from '../components/PokemonSprite';
import AutocompleteInput from '../components/AutocompleteInput';
import StatusButtonGroup from '../components/StatusButtonGroup';
import TypeIcons from '../components/TypeIcons';
import PokemonDetailModal from '../components/PokemonDetailModal';
import SubNav from '../components/SubNav';
import {
  Box, Button, Container, Flex, Heading, Spinner, Alert,
  AlertIcon, Grid, Text, Input, Select, useToast, Tag, HStack,
  CheckboxGroup, Checkbox, Stack, Divider, Icon,
  VStack, StackDivider, useDisclosure,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter,
  ModalBody, ModalCloseButton, FormControl, FormLabel, Textarea,
  Menu, MenuButton, MenuList, MenuItemOption, MenuOptionGroup,
  useClipboard, Tooltip, IconButton, Center
} from '@chakra-ui/react';
import { ArrowBackIcon, CheckCircleIcon } from '@chakra-ui/icons';
import { FaShieldAlt, FaBook, FaCog, FaCopy, FaTrashRestore, FaArrowUp, FaBullseye, FaGripLines, FaShareAlt } from 'react-icons/fa';
import io from 'socket.io-client';

const DebouncedNicknameInput = ({ encounterId, player, initialValue, onNicknameCommit }) => {
  const [nickname, setNickname] = useState(initialValue || '');
  const debounceTimeout = useRef(null);

  useEffect(() => {
    setNickname(initialValue || '');
  }, [initialValue]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setNickname(newValue);

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      onNicknameCommit(encounterId, `nickname${player}`, newValue);
    }, 500);
  };

  return <Input placeholder="Nickname" value={nickname} onChange={handleChange} />;
};


function SortableEncounterRow({ encounter, ...props }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: encounter._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto',
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <Box ref={setNodeRef} style={style} w="full">
      <EncounterRow encounter={encounter} isDragging={isDragging} dragHandleProps={{ ...attributes, ...listeners }} {...props} />
    </Box>
  );
}

function EncounterRow({ encounter, isSoullink, gridTemplateColumns, viewSettings, t, i18n, player1Name, player2Name, dragHandleProps, ...handlers }) {
  if (encounter.encounterType === 'event') {
    return (
      <Flex key={encounter._id.toString()} align="center" justify="center" py={3} bg="gray.100" _dark={{ bg: 'gray.700' }}>
        <Icon as={FaShieldAlt} mr={3} color="blue.500" />
        <Text fontWeight="bold">{i18n.language === 'de' && encounter.locationName_de ? encounter.locationName_de : encounter.locationName_en}</Text>
        <Text ml={2} color="gray.500" _dark={{ color: "gray.400" }}> - {t('tracker.level_cap')}: {encounter.levelCap}</Text>
      </Flex>
    );
  }

  const isFailed = encounter.status1 === 'fainted' || encounter.status1 === 'missed' || (isSoullink && (encounter.status2 === 'fainted' || encounter.status2 === 'missed'));

  return (
    <Grid
      templateColumns={gridTemplateColumns}
      gap={4}
      alignItems="center"
      p={2}
      bg={isFailed ? 'red.800' : 'transparent'}
      _dark={{ bg: isFailed ? 'red.800' : 'transparent' }}
      sx={{ textDecoration: isFailed ? 'line-through' : 'none', color: isFailed ? 'whiteAlpha.900' : 'inherit', transition: 'background-color 0.2s', borderRadius: "md" }}
    >
      <Tooltip label={handlers.isSortable ? "Ziehen zum Verschieben" : "Sortierung ändern zum Verschieben"} isDisabled={handlers.isSortable}>
        <Center {...dragHandleProps} cursor={handlers.isSortable ? 'grab' : 'not-allowed'}>
          <Icon as={FaGripLines} color={handlers.isSortable ? 'gray.400' : 'gray.700'} />
        </Center>
      </Tooltip>
      <Tooltip label="Begegnung zurücksetzen" fontSize="md">
        <IconButton aria-label="Begegnung zurücksetzen" icon={<FaTrashRestore />} size="xs" variant="ghost" colorScheme="red" onClick={() => handlers.handleClearEncounter(encounter)} />
      </Tooltip>
      <Text>{i18n.language === 'de' && encounter.locationName_de ? encounter.locationName_de : encounter.locationName_en}</Text>
      <VStack spacing={1}><PokemonSprite pokemonId={encounter.pokemonId1} onClick={() => handlers.handleSpriteClick(encounter.pokemonId1)} /><TypeIcons types={encounter.types1} /></VStack>
      <AutocompleteInput initialValue={encounter.pokemon1 || ''} onPokemonSelect={(p) => handlers.handlePokemonSelect(encounter._id, 1, p)} isDupesClauseActive={handlers.rules?.dupesClause} playerContext={1} player1CaughtChains={handlers.player1CaughtChains} player2CaughtChains={handlers.player2CaughtChains} />
      <Box>{encounter.pokemonId1 && (<Tooltip label="Entwickeln" fontSize="md"><IconButton aria-label="Pokémon entwickeln" icon={<FaArrowUp />} size="xs" variant="outline" colorScheme="green" onClick={() => handlers.handleEvolve(encounter, 1)} /></Tooltip>)}</Box>
      {viewSettings.showNicknames && <DebouncedNicknameInput encounterId={encounter._id} player={1} initialValue={encounter.nickname1} onNicknameCommit={handlers.updateEncounter} />}
      <StatusButtonGroup currentStatus={encounter.status1} onStatusChange={(newStatus) => handlers.handleStatusChangeAttempt(encounter._id, 1, newStatus)} faintReason={encounter.faintReason1} />

      {isSoullink && (
        <>
          <VStack spacing={1}><PokemonSprite pokemonId={encounter.pokemonId2} onClick={() => handlers.handleSpriteClick(encounter.pokemonId2)} /><TypeIcons types={encounter.types2} /></VStack>
          <AutocompleteInput initialValue={encounter.pokemon2 || ''} onPokemonSelect={(p) => handlers.handlePokemonSelect(encounter._id, 2, p)} isDupesClauseActive={handlers.rules?.dupesClause} playerContext={2} player1CaughtChains={handlers.player1CaughtChains} player2CaughtChains={handlers.player2CaughtChains} />
          <Box>{encounter.pokemonId2 && (<Tooltip label="Entwickeln" fontSize="md"><IconButton aria-label="Pokémon entwickeln" icon={<FaArrowUp />} size="xs" variant="outline" colorScheme="green" onClick={() => handlers.handleEvolve(encounter, 2)} /></Tooltip>)}</Box>
          {viewSettings.showNicknames && <DebouncedNicknameInput encounterId={encounter._id} player={2} initialValue={encounter.nickname2} onNicknameCommit={handlers.updateEncounter} />}
          <StatusButtonGroup currentStatus={encounter.status2} onStatusChange={(newStatus) => handlers.handleStatusChangeAttempt(encounter._id, 2, newStatus)} faintReason={encounter.faintReason2} />
        </>
      )}
    </Grid>
  );
}


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
  const { isOpen: isFaintModalOpen, onOpen: onFaintModalOpen, onClose: onFaintModalClose } = useDisclosure();
  const { isOpen: isShareOpen, onOpen: onShareOpen, onClose: onShareClose } = useDisclosure();

  const [rules, setRules] = useState({ dupesClause: true, shinyClause: true, customRules: '' });

  const [viewSettings, setViewSettings] = useState(() => {
    const savedSettings = localStorage.getItem(`viewSettings-${id}`);
    return savedSettings ? JSON.parse(savedSettings) : { showNicknames: true, showStatic: true, showGift: true };
  });

  useEffect(() => {
    localStorage.setItem(`viewSettings-${id}`, JSON.stringify(viewSettings));
  }, [viewSettings, id]);

  const [selectedPokemonDetails, setSelectedPokemonDetails] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [faintContext, setFaintContext] = useState(null);
  const [selectedFaintReason, setSelectedFaintReason] = useState('');

  const spectatorLink = `${window.location.origin}/spectate/${run?.spectatorId}`;
  const { onCopy: onCopyLink, hasCopied: hasCopiedLink } = useClipboard(spectatorLink);
  const { onCopy: onCopyInvite, hasCopied: hasCopiedInvite } = useClipboard(run?.inviteCode || '');

  const [sortBy, setSortBy] = useState('default');

  const filterOptions = useMemo(() => [
    { value: 'pending', label: t('tracker.filter_pending') },
    { value: 'caught', label: t('tracker.filter_caught') },
    { value: 'gift', label: t('tracker.filter_gift') },
    { value: 'fainted', label: t('tracker.filter_fainted') },
    { value: 'missed', label: t('tracker.filter_missed') },
  ], [t]);

  const faintReasonOptions = useMemo(() => [
    { value: 'Wilder Kampf', label: 'Wilder Kampf' },
    { value: 'Trainer Kampf', label: 'Trainer Kampf' },
    { value: 'Arena Kampf', label: 'Arena Kampf' },
    { value: 'Dummheit', label: 'Dummheit' }
  ], []);

  const [filterBy, setFilterBy] = useState(filterOptions.map(f => f.value));
  const [displayedEncounters, setDisplayedEncounters] = useState([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setDisplayedEncounters((items) => {
      const oldIndex = items.findIndex(item => item._id === active.id);
      const newIndex = items.findIndex(item => item._id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
    const newOrderedList = arrayMove(displayedEncounters, displayedEncounters.findIndex(item => item._id === active.id), displayedEncounters.findIndex(item => item._id === over.id));
    const payload = newOrderedList.map((enc, index) => ({ _id: enc._id, sequence: index + 1 }));
    setSaveStatus('saving');
    try {
      await api.put(`/nuzlockes/${id}/reorder`, { reorderedEncounters: payload });
      setRun(prevRun => ({ ...prevRun, encounters: prevRun.encounters.map(enc => { const updated = payload.find(p => p._id === enc._id); return updated ? { ...enc, sequence: updated.sequence } : enc; }).sort((a, b) => (a.sequence || 999) - (b.sequence || 999)) }));
      setSaveStatus('saved');
      toast({ title: "Reihenfolge gespeichert!", status: "success", duration: 2000, isClosable: true });
    } catch (error) {
      toast({ title: "Fehler beim Speichern der Reihenfolge", status: "error", duration: 3000, isClosable: true });
      setSaveStatus('saved');
    }
  }, [displayedEncounters, id, toast]);

  useEffect(() => {
    const userFromStorage = JSON.parse(localStorage.getItem('user'));
    if (userFromStorage) setCurrentUser(userFromStorage);
    const socket = io(import.meta.env.VITE_API_BASE_URL);
    socket.on('connect', () => socket.emit('joinRoom', id));
    socket.on('nuzlocke:updated', ({ updatedEncounter, senderId }) => {
      if (!updatedEncounter) return;
      if (userFromStorage && userFromStorage._id === senderId) { setSaveStatus('saved'); return; }
      setRun(prevRun => { if (!prevRun) return null; const newEncounters = prevRun.encounters.map(enc => enc._id === updatedEncounter._id ? { ...enc, ...updatedEncounter } : enc); return { ...prevRun, encounters: newEncounters }; });
      setSaveStatus('saved');
      toast({ title: "Run wurde von einem Partner aktualisiert.", status: "info", duration: 3000, isClosable: true, position: "top-right" });
    });
    socket.on('nuzlocke:rules_updated', ({ rules: updatedRules, senderId }) => {
      if (!updatedRules) return;
      if (userFromStorage && userFromStorage._id === senderId) { setSaveStatus('saved'); return; }
      setRun(prevRun => ({ ...prevRun, rules: updatedRules }));
      setRules(updatedRules);
      toast({ title: "Regeln wurden von einem Partner aktualisiert.", status: "info", duration: 3000, isClosable: true, position: "top-right" });
    });
    socket.on('nuzlocke:reordered', ({ encounters: reorderedEncounters, senderId }) => {
      if (userFromStorage && userFromStorage._id === senderId) return;
      setRun(prevRun => ({ ...prevRun, encounters: reorderedEncounters }));
      toast({ title: "Die Reihenfolge wurde von einem Partner geändert.", status: "info", duration: 3000, isClosable: true, position: "top-right" });
    });
    return () => socket.disconnect();
  }, [id, toast]);

  useEffect(() => {
    if (run?.participants) {
      setPlayer1Name(run.participants[0]?.username || 'Spieler 1');
      if (run.type === 'soullink') setPlayer2Name(run.participants[1]?.username || 'Spieler 2');
    }
  }, [run?.participants, run?.type]);

  const player1CaughtChains = useMemo(() => {
    if (!run) return [];
    const chains = new Set();
    run.encounters.forEach(enc => { if (enc && (enc.status1 === 'caught' || enc.status1 === 'gift') && enc.evolutionChainId1) chains.add(enc.evolutionChainId1); });
    return Array.from(chains);
  }, [run]);

  const player2CaughtChains = useMemo(() => {
    if (!run || run.type !== 'soullink') return [];
    const chains = new Set();
    run.encounters.forEach(enc => { if (enc && (enc.status2 === 'caught' || enc.status2 === 'gift') && enc.evolutionChainId2) chains.add(enc.evolutionChainId2); });
    return Array.from(chains);
  }, [run]);

  const gridTemplateColumns = useMemo(() => {
    if (!run) return '';
    const columns = ['30px', '40px', '2fr', '80px', '1.5fr', '50px'];
    if (viewSettings.showNicknames) columns.push('1.5fr');
    columns.push('1.5fr');
    if (run.type === 'soullink') {
      columns.push('80px', '1.5fr', '50px');
      if (viewSettings.showNicknames) columns.push('1.5fr');
      columns.push('1.5fr');
    }
    return columns.join(' ');
  }, [run?.type, viewSettings.showNicknames]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const response = await api.get(`/nuzlockes/${id}`);
        setRun(response.data);
        if (response.data.rules) setRules(response.data.rules);
      } catch (err) { setError('Fehler beim Laden der Daten.'); }
      finally { setLoading(false); }
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
        if (encounter.encounterType === 'event') return true;
        const p1Match = filterBy.includes(encounter.status1);
        if (run.type === 'soullink') { const p2Match = filterBy.includes(encounter.status2); return p1Match && p2Match; }
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

  const updateEncounter = useCallback(async (encounterId, changes) => {
    const originalEncounter = run.encounters.find(e => e._id === encounterId);
    if (!originalEncounter) return;
    const updatedEncounter = { ...originalEncounter, ...changes };
    setRun(prevRun => ({ ...prevRun, encounters: prevRun.encounters.map(e => e._id === encounterId ? updatedEncounter : e) }));
    setSaveStatus('saving');
    try {
      await api.put(`/nuzlockes/${id}`, { updatedEncounter });
    } catch (error) {
      toast({ title: "Fehler beim Speichern.", status: "error", duration: 3000, isClosable: true });
      setSaveStatus('saved');
    }
  }, [id, run, toast]);

  const handlePokemonSelect = (encounterId, player, selectedPokemon) => {
    const encounter = run.encounters.find(e => e._id === encounterId);
    if (!encounter) return;
    const displayName = (i18n.language === 'de' && selectedPokemon.name_de) ? selectedPokemon.name_de : selectedPokemon.name_en;
    let changes = {};
    if (player === 1) {
      changes = { pokemon1: displayName, pokemonId1: selectedPokemon.id, types1: selectedPokemon.types, evolutionChainId1: selectedPokemon.evolutionChainId };
      if (encounter.status1 === 'pending' || encounter.status1 === 'gift') changes.status1 = 'caught';
    } else {
      changes = { pokemon2: displayName, pokemonId2: selectedPokemon.id, types2: selectedPokemon.types, evolutionChainId2: selectedPokemon.evolutionChainId };
      if (encounter.status2 === 'pending' || encounter.status2 === 'gift') changes.status2 = 'caught';
    }
    updateEncounter(encounterId, changes);
  };

  const handleStatusChangeAttempt = (encounterId, player, newStatus) => {
    if (newStatus === 'fainted') {
      setFaintContext({ encounterId, player });
      setSelectedFaintReason(faintReasonOptions[0].value);
      onFaintModalOpen();
    } else {
      updateEncounter(encounterId, { [`status${player}`]: newStatus, [`faintReason${player}`]: null });
    }
  };

  const handleConfirmFaint = () => {
    if (!faintContext) return;
    const { encounterId, player } = faintContext;
    updateEncounter(encounterId, { [`status${player}`]: 'fainted', [`faintReason${player}`]: selectedFaintReason });
    onFaintModalClose();
    setFaintContext(null);
  };

  const handleClearEncounter = (encounterToClear) => {
    if (!encounterToClear) return;
    const changes = {
      pokemon1: null, pokemonId1: null, types1: [], nickname1: '', status1: encounterToClear.encounterType === 'gift' ? 'gift' : 'pending', evolutionChainId1: null, faintReason1: null,
    };
    if (run.type === 'soullink') {
      changes.pokemon2 = null; changes.pokemonId2 = null; changes.types2 = []; changes.nickname2 = '';
      changes.status2 = encounterToClear.encounterType === 'gift' ? 'gift' : 'pending';
      changes.evolutionChainId2 = null; changes.faintReason2 = null;
    }
    updateEncounter(encounterToClear._id, changes);
  };

  const handleEvolve = async (encounterToEvolve, player) => {
    const currentPokemonId = player === 1 ? encounterToEvolve.pokemonId1 : encounterToEvolve.pokemonId2;
    const evolutionChainId = player === 1 ? encounterToEvolve.evolutionChainId1 : encounterToEvolve.evolutionChainId2;
    if (!currentPokemonId || !evolutionChainId) {
      toast({ title: "Keine Evolutionsdaten verfügbar.", status: "info", duration: 3000, isClosable: true }); return;
    }
    try {
      const response = await api.get(`/pokemon/evolution-chain/${evolutionChainId}`);
      const evolutionChain = response.data;
      const currentIndex = evolutionChain.findIndex(p => p.pokemonId === currentPokemonId);
      if (currentIndex === -1 || currentIndex >= evolutionChain.length - 1) {
        toast({ title: "Dies ist die letzte Entwicklungsstufe.", status: "info", duration: 3000, isClosable: true }); return;
      }
      const nextEvolution = evolutionChain[currentIndex + 1];
      const nextPokemonDataResponse = await api.get(`/pokemon/${nextEvolution.pokemonId}?game=${run.game}`);
      const nextPokemonData = nextPokemonDataResponse.data;
      const changes = {
        [`pokemon${player}`]: (i18n.language === 'de' && nextPokemonData.name_de) ? nextPokemonData.name_de : nextPokemonData.name_en,
        [`pokemonId${player}`]: nextPokemonData.id,
        [`types${player}`]: nextPokemonData.types,
        [`evolutionChainId${player}`]: nextPokemonData.evolutionChainId,
      };
      updateEncounter(encounterToEvolve._id, changes);
      toast({ title: `Erfolgreich entwickelt!`, status: "success", duration: 2000, isClosable: true });
    } catch (error) {
      toast({ title: "Fehler bei der Entwicklung.", status: "error", duration: 3000, isClosable: true });
    }
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
      setSaveStatus('saved');
    } catch (err) {
      toast({ title: "Fehler beim Speichern der Regeln.", status: "error", duration: 3000, isClosable: true });
    }
  };

  const getSaveStatusIndicator = () => {
    switch (saveStatus) {
      case 'saving': return <Tag colorScheme="blue"><Spinner size="xs" mr={2} />{t('tracker.saving_status')}</Tag>;
      default: return <Tag colorScheme="green"><CheckCircleIcon mr={2} />{t('tracker.saved_status')}</Tag>;
    }
  };

  if (loading) return <Flex justify="center" align="center" height="100vh"><Spinner size="xl" /></Flex>;
  if (error) return <Container mt={10}><Alert status="error"><AlertIcon />{error}</Alert></Container>;
  if (!run) return <Container mt={10}><Text>Run nicht gefunden.</Text></Container>;

  const isSoullink = run.type === 'soullink';
  const isSortable = sortBy === 'default';

  return (
    <>
      <Container maxW="container.2xl" py={8}>
        <Flex justifyContent="space-between" alignItems="center" mb={4}>
          <HStack>
            <Link to="/"><Button leftIcon={<ArrowBackIcon />}>{t('tracker.dashboard_button')}</Button></Link>
            <Button leftIcon={<FaBook />} onClick={onRulesOpen}>{t('tracker.rules_button')}</Button>
            <Menu closeOnSelect={false}>
              <MenuButton as={Button} leftIcon={<Icon as={FaCog} />}>{t('tracker.view_button')}</MenuButton>
              <MenuList minWidth="240px">
                <MenuOptionGroup title={t('settings.show_columns_title')} type="checkbox"
                  value={Object.keys(viewSettings).filter(key => viewSettings[key])}
                  onChange={(values) => setViewSettings({ showNicknames: values.includes('showNicknames'), showStatic: values.includes('showStatic'), showGift: values.includes('showGift'), })}
                >
                  <MenuItemOption value="showNicknames">{t('settings.nickname_column')}</MenuItemOption>
                  <MenuItemOption value="showStatic">{t('settings.static_encounters')}</MenuItemOption>
                  <MenuItemOption value="showGift">{t('settings.gift_pokemon')}</MenuItemOption>
                </MenuOptionGroup>
              </MenuList>
            </Menu>
            <Tooltip label={t('share.share_button')}><Button onClick={onShareOpen} leftIcon={<Icon as={FaShareAlt} />}>{t('share.share_button')}</Button></Tooltip>
          </HStack>
          <VStack spacing={0}><Heading as="h1" size="lg" textAlign="center">{run.runName}</Heading></VStack>
          <Box minW="220px" textAlign="right">{getSaveStatusIndicator()}</Box>
        </Flex>
        <SubNav />
        <VStack spacing={0} align="stretch" borderWidth={1} borderRadius="lg" divider={<StackDivider />}>
          <Grid templateColumns={gridTemplateColumns} gap={4} alignItems="center" p={4} borderBottomWidth={2} borderColor="gray.300" _dark={{ borderColor: 'gray.600' }}>
            <Box /><Box />
            <Text fontWeight="bold">{t('tracker.location_header')}</Text>
            <Text fontWeight="bold" textAlign="center" whiteSpace="nowrap">{t('tracker.pokemon_header')}</Text>
            <Text fontWeight="bold">{player1Name}</Text><Box />
            {viewSettings.showNicknames && <Text fontWeight="bold">{t('tracker.nickname_header')}</Text>}
            <Text fontWeight="bold">{t('tracker.status_header')}</Text>
            {isSoullink && (<><Text fontWeight="bold" textAlign="center" whiteSpace="nowrap">{t('tracker.pokemon_header')}</Text><Text fontWeight="bold">{player2Name}</Text><Box />
              {viewSettings.showNicknames && <Text fontWeight="bold">{t('tracker.nickname_header')}</Text>}<Text fontWeight="bold">{t('tracker.status_header')}</Text></>
            )}
          </Grid>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}>
            <SortableContext items={displayedEncounters.map(enc => enc._id)} strategy={verticalListSortingStrategy}>
              {displayedEncounters.map((encounter) => (
                <SortableEncounterRow
                  key={encounter._id} encounter={encounter} gridTemplateColumns={gridTemplateColumns}
                  isSoullink={isSoullink} viewSettings={viewSettings} t={t} i18n={i18n}
                  player1Name={player1Name} player2Name={player2Name} isSortable={isSortable}
                  rules={rules} player1CaughtChains={player1CaughtChains} player2CaughtChains={player2CaughtChains}
                  handleClearEncounter={handleClearEncounter} handleSpriteClick={handleSpriteClick}
                  handlePokemonSelect={handlePokemonSelect} handleEvolve={handleEvolve}
                  updateEncounter={updateEncounter} handleStatusChangeAttempt={handleStatusChangeAttempt}
                />
              ))}
            </SortableContext>
          </DndContext>
        </VStack>
      </Container>

      <Modal isOpen={isShareOpen} onClose={onShareClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{t('share.modal_title')}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={6}>
              <FormControl>
                <FormLabel>{t('share.spectator_link_title')}</FormLabel>
                <Text fontSize="sm" color="gray.500" mb={2}>{t('share.spectator_link_description')}</Text>
                <Flex>
                  <Input value={spectatorLink} isReadOnly />
                  <Button onClick={onCopyLink} ml={2}>{hasCopiedLink ? t('share.copied') : t('share.copy')}</Button>
                </Flex>
              </FormControl>
              {run?.type === 'soullink' && run.inviteCode && (
                <FormControl>
                  <FormLabel>{t('share.soullink_invite_title')}</FormLabel>
                  <Text fontSize="sm" color="gray.500" mb={2}>{t('share.soullink_invite_description')}</Text>
                  <Flex>
                    <Input value={run.inviteCode} isReadOnly />
                    <Button onClick={onCopyInvite} ml={2}>{hasCopiedInvite ? t('share.copied') : t('share.copy')}</Button>
                  </Flex>
                </FormControl>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter><Button colorScheme="blue" onClick={onShareClose}>{t('share.close_button')}</Button></ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isRulesOpen} onClose={onRulesClose}>
        <ModalOverlay /><ModalContent>
          <ModalHeader>{t('rules.modal_title')}</ModalHeader><ModalCloseButton />
          <ModalBody><VStack spacing={4}>
            <FormControl><Checkbox isChecked={rules?.dupesClause} onChange={(e) => setRules({ ...rules, dupesClause: e.target.checked })}>{t('rules.dupes_clause')}</Checkbox></FormControl>
            <FormControl><Checkbox isChecked={rules?.shinyClause} onChange={(e) => setRules({ ...rules, shinyClause: e.target.checked })}>{t('rules.shiny_clause')}</Checkbox></FormControl>
            <FormControl><FormLabel>{t('rules.custom_rules_label')}</FormLabel><Textarea value={rules?.customRules} onChange={(e) => setRules({ ...rules, customRules: e.target.value })} placeholder={t('rules.custom_rules_placeholder')} /></FormControl>
          </VStack></ModalBody>
          <ModalFooter><Button variant="ghost" mr={3} onClick={onRulesClose}>{t('rules.close_button')}</Button><Button colorScheme="blue" onClick={handleSaveRules}>{t('rules.save_button')}</Button></ModalFooter>
        </ModalContent>
      </Modal>
      <Modal isOpen={isFaintModalOpen} onClose={onFaintModalClose} isCentered>
        <ModalOverlay /><ModalContent>
          <ModalHeader>Grund für die Niederlage</ModalHeader><ModalCloseButton />
          <ModalBody><FormControl><FormLabel>Wähle einen Grund aus:</FormLabel>
            <Select value={selectedFaintReason} onChange={(e) => setSelectedFaintReason(e.target.value)}>
              {faintReasonOptions.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
            </Select>
          </FormControl></ModalBody>
          <ModalFooter><Button variant="ghost" mr={3} onClick={onFaintModalClose}>Abbrechen</Button><Button colorScheme="red" onClick={handleConfirmFaint}>Bestätigen</Button></ModalFooter>
        </ModalContent>
      </Modal>
      <PokemonDetailModal isOpen={isDetailOpen} onClose={onDetailClose} pokemon={selectedPokemonDetails} isLoading={isDetailLoading} game={run?.game} />
    </>
  );
}

export default TrackerPage;