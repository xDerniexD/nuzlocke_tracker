import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box, Button, Container, Flex, Heading, Spinner, Alert, AlertIcon, Text,
  VStack, Tooltip, Divider, HStack, Icon, useDisclosure,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter,
  ModalBody, ModalCloseButton, FormControl, FormLabel, Textarea, Checkbox,
  Menu, MenuButton, MenuList, MenuOptionGroup, MenuItemOption, useToast, Tag, IconButton,
  useClipboard, Input, SimpleGrid, Badge
} from '@chakra-ui/react';
import { ArrowBackIcon, CheckCircleIcon } from '@chakra-ui/icons';
import { FaBook, FaCog, FaCopy, FaShareAlt } from 'react-icons/fa';
import api from '../api/api';
import SubNav from '../components/SubNav';
import PokemonPairCard from '../components/PokemonPairCard';
import { calculateTeamWeaknessCounts } from '../utils/typeUtils';
import TypeIcons from '../components/TypeIcons';

function TeambuilderPage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const [run, setRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const toast = useToast();

  const [team, setTeam] = useState([]);
  const [box, setBox] = useState([]);
  const [fainted, setFainted] = useState([]);
  const [missed, setMissed] = useState([]);

  const [saveStatus, setSaveStatus] = useState('saved');

  const { isOpen: isRulesOpen, onOpen: onRulesOpen, onClose: onRulesClose } = useDisclosure();
  const { isOpen: isShareOpen, onOpen: onShareOpen, onClose: onShareClose } = useDisclosure();

  const [rules, setRules] = useState({ dupesClause: true, shinyClause: true, customRules: '' });

  const [viewSettings, setViewSettings] = useState(() => {
    const savedSettings = localStorage.getItem(`viewSettings-${id}`);
    return savedSettings ? JSON.parse(savedSettings) : {
      showNicknames: true,
      showStatic: true,
      showGift: true,
    };
  });

  const spectatorLink = `${window.location.origin}/spectate/${run?.spectatorId}`;
  const { onCopy: onCopyLink, hasCopied: hasCopiedLink } = useClipboard(spectatorLink);
  const { onCopy: onCopyInvite, hasCopied: hasCopiedInvite } = useClipboard(run?.inviteCode || '');

  useEffect(() => {
    localStorage.setItem(`viewSettings-${id}`, JSON.stringify(viewSettings));
  }, [viewSettings, id]);

  const teamWeaknessProfiles = useMemo(() => {
    if (!team || team.length === 0 || !run) return {};
    const profiles = {};
    const p1Team = team.map(pair => pair.p1).filter(Boolean);
    profiles[run.participants[0]._id] = calculateTeamWeaknessCounts(p1Team);

    if (run.type === 'soullink' && run.participants[1]) {
      const p2Team = team.map(pair => pair.p2).filter(Boolean);
      profiles[run.participants[1]._id] = calculateTeamWeaknessCounts(p2Team);
    }
    return profiles;
  }, [team, run]);

  const saveTeam = useCallback(async (newTeam) => {
    setSaveStatus('saving');
    try {
      const teamEncounterIds = newTeam.map(p => p.pairId);
      await api.put(`/nuzlockes/${id}/team`, { teamEncounterIds });
      setSaveStatus('saved');
    } catch (err) {
      toast({ title: "Fehler beim Speichern des Teams.", status: "error", duration: 3000, isClosable: true });
      setSaveStatus('error');
    }
  }, [id, toast]);

  const categorizedEncounters = useMemo(() => {
    if (!run) return { available: [], fainted: [], missed: [] };
    const available = [], fainted = [], missed = [];
    run.encounters.forEach(enc => {
      const p1 = enc.pokemonId1 ? { pokemonId: enc.pokemonId1, name_de: enc.pokemon1, name_en: enc.pokemon1, nickname: enc.nickname1, types: enc.types1 } : null;
      const p2 = run.type === 'soullink' && enc.pokemonId2 ? { pokemonId: enc.pokemonId2, name_de: enc.pokemon2, name_en: enc.pokemon2, nickname: enc.nickname2, types: enc.types2 } : null;
      const pair = { pairId: enc._id, p1, p2 };

      if (enc.status1 === 'fainted' || enc.status2 === 'fainted') {
        if (p1 || p2) fainted.push(pair);
      } else if (enc.status1 === 'missed' || enc.status2 === 'missed') {
        missed.push({ ...pair, location: i18n.language === 'de' ? enc.locationName_de : enc.locationName_en });
      } else if ((enc.status1 === 'caught' || enc.status1 === 'gift') && p1) {
        if (run.type === 'soullink') {
          if ((enc.status2 === 'caught' || enc.status2 === 'gift') && p2) available.push(pair);
        } else {
          available.push(pair);
        }
      }
    });
    return { available, fainted, missed };
  }, [run, i18n.language]);

  useEffect(() => {
    if (run) {
      const teamIds = new Set(run.team || []);
      const teamFromRun = categorizedEncounters.available.filter(p => teamIds.has(p.pairId));
      setTeam(teamFromRun);
      setFainted(categorizedEncounters.fainted);
      setMissed(categorizedEncounters.missed);
    }
  }, [run, categorizedEncounters]);

  useEffect(() => {
    if (run) {
      const teamIds = new Set(team.map(p => p.pairId));
      setBox(categorizedEncounters.available.filter(p => !teamIds.has(p.pairId)));
    }
  }, [team, categorizedEncounters, run]);


  useEffect(() => {
    const fetchRunData = async () => {
      try {
        const response = await api.get(`/nuzlockes/${id}`);
        setRun(response.data);
        if (response.data.rules) setRules(response.data.rules);
      } catch (err) {
        setError("Fehler beim Laden der Run-Daten.");
      } finally {
        setLoading(false);
      }
    };
    fetchRunData();
  }, [id]);

  const handlePairClick = (pair, sourceList) => {
    let newTeam;
    if (sourceList === 'box') {
      if (team.length < 6) {
        newTeam = [...team, pair];
      } else {
        toast({ title: "Dein Team ist voll!", status: "warning", duration: 2000, isClosable: true });
        return;
      }
    } else {
      newTeam = team.filter(p => p.pairId !== pair.pairId);
    }
    setTeam(newTeam);
    saveTeam(newTeam);
  };

  const handleSaveRules = async () => {
    try {
      await api.put(`/nuzlockes/${id}/rules`, { rules });
      toast({ title: "Regeln gespeichert.", status: "success", duration: 3000, isClosable: true });
      onRulesClose();
    } catch (err) {
      toast({ title: "Fehler beim Speichern der Regeln.", status: "error", duration: 3000, isClosable: true });
    }
  };

  const getSaveStatusIndicator = () => {
    switch (saveStatus) {
      case 'saving': return <Tag colorScheme="blue"><Spinner size="xs" mr={2} />{t('tracker.saving_status')}</Tag>;
      case 'error': return <Tag colorScheme="red">Fehler</Tag>;
      default: return <Tag colorScheme="green"><CheckCircleIcon mr={2} />{t('tracker.saved_status')}</Tag>;
    }
  };

  const teamSlotsUsed = team.length;

  if (loading) return <Flex justify="center" align="center" height="100vh"><Spinner size="xl" /></Flex>;
  if (error) return <Container mt={10}><Alert status="error"><AlertIcon />{error}</Alert></Container>;
  if (!run) return null;

  const multiplierToLabel = {
    '4': t('type_efficacy.x4_weak'),
    '2': t('type_efficacy.x2_weak'),
  };

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
                  onChange={(values) =>
                    setViewSettings({
                      showNicknames: values.includes('showNicknames'),
                      showStatic: values.includes('showStatic'),
                      showGift: values.includes('showGift'),
                    })}
                >
                  <MenuItemOption value="showNicknames">{t('settings.nickname_column')}</MenuItemOption>
                  <MenuItemOption value="showStatic">{t('settings.static_encounters')}</MenuItemOption>
                  <MenuItemOption value="showGift">{t('settings.gift_pokemon')}</MenuItemOption>
                </MenuOptionGroup>
              </MenuList>
            </Menu>
            <Tooltip label={t('share.share_button')}><Button onClick={onShareOpen} leftIcon={<Icon as={FaShareAlt} />}>{t('share.share_button')}</Button></Tooltip>
          </HStack>
          <VStack spacing={0}><Heading as="h1" size="lg" textAlign="center">{run?.runName}</Heading></VStack>
          <Box minW="220px" textAlign="right">{getSaveStatusIndicator()}</Box>
        </Flex>

        <SubNav />

        <VStack spacing={8} align="stretch">
          {team.length > 0 && (
            <Box>
              <Heading as="h2" size="lg" mb={4}>{t('teambuilder.team_analysis')}</Heading>
              <SimpleGrid columns={{ base: 1, md: run.type === 'soullink' ? 2 : 1 }} spacing={5}>
                {run.participants.map(player => (
                  <Box key={player._id} p={4} borderWidth={1} borderRadius="lg" bg="gray.50" _dark={{ bg: 'gray.800' }}>
                    <Heading size="md" mb={4}>{t('teambuilder.player_team_analysis', { player: player.username })}</Heading>
                    <VStack align="stretch" spacing={4}>
                      {['4', '2'].map(multiplier => {
                        const types = teamWeaknessProfiles[player._id]?.[multiplier];
                        if (!types || Object.keys(types).length === 0) return null;

                        return (
                          <Box key={multiplier}>
                            <Tag colorScheme={multiplier === '4' ? 'red' : 'orange'} mb={2}>{multiplierToLabel[multiplier]}</Tag>
                            <VStack align="stretch" spacing={2}>
                              {Object.entries(types).map(([type, count]) => (
                                <HStack key={type} justify="space-between">
                                  <TypeIcons types={[type]} />
                                  <Badge colorScheme="red" variant="solid" borderRadius="full" px="2">{count}x</Badge>
                                </HStack>
                              ))}
                            </VStack>
                          </Box>
                        );
                      })}
                    </VStack>
                  </Box>
                ))}
              </SimpleGrid>
            </Box>
          )}

          <Box>
            <Heading as="h2" size="lg" mb={4}>{t('teambuilder.your_team')} ({teamSlotsUsed} / 6)</Heading>
            <Flex wrap="wrap" gap={4} minH="160px" p={4} borderWidth={1} borderRadius="lg" bg="gray.50" _dark={{ bg: 'gray.800' }}>
              {team.length > 0 ? team.map(pair => (
                <PokemonPairCard key={pair.pairId} pair={pair} onClick={() => handlePairClick(pair, 'team')} isTeamMember />
              )) : <Text color="gray.500">{t('teambuilder.empty_team_prompt')}</Text>}
            </Flex>
          </Box>
          <Divider />
          <Box>
            <Heading as="h2" size="lg" mb={4}>{t('teambuilder.your_box')}</Heading>
            {box.length === 0 && team.length === 0 && fainted.length === 0 && missed.length === 0 ? (
              <Text color="gray.500">{t('teambuilder.no_pokemon_caught')}</Text>
            ) : box.length === 0 ? (
              <Text color="gray.500">{t('teambuilder.empty_box')}</Text>
            ) : (
              <Flex wrap="wrap" gap={4}>
                {box.map(pair => (
                  <PokemonPairCard key={pair.pairId} pair={pair} onClick={() => handlePairClick(pair, 'box')} />
                ))}
              </Flex>
            )}
          </Box>
          <Divider />
          <Box>
            <Heading as="h2" size="lg" mb={4}>{t('teambuilder.fainted_pokemon')}</Heading>
            {fainted.length === 0 ? (
              <Text color="gray.500">{t('teambuilder.no_fainted_pokemon')}</Text>
            ) : (
              <Flex wrap="wrap" gap={4}>
                {fainted.map(pair => (<Box key={pair.pairId} opacity={0.6}><PokemonPairCard pair={pair} /></Box>))}
              </Flex>
            )}
          </Box>
          <Divider />
          <Box>
            <Heading as="h2" size="lg" mb={4}>{t('teambuilder.missed_encounters')}</Heading>
            {missed.length === 0 ? (
              <Text color="gray.500">{t('teambuilder.no_missed_encounters')}</Text>
            ) : (
              <Flex wrap="wrap" gap={4}>
                {missed.map(pair => {
                  if (pair.p1 || pair.p2) {
                    return (<Box key={pair.pairId} opacity={0.6}><PokemonPairCard pair={pair} /></Box>);
                  }
                  return (
                    <Box key={pair.pairId} p={3} borderWidth={1} borderRadius="lg" bg="gray.100" _dark={{ bg: 'gray.700' }} minH="125px" minW="120px" display="flex" alignItems="center" justifyContent="center" opacity={0.6}>
                      <Tooltip label={pair.location}><Text fontSize="sm" color="gray.500" noOfLines={3} textAlign="center">{pair.location}</Text></Tooltip>
                    </Box>
                  );
                })}
              </Flex>
            )}
          </Box>
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
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{t('rules.modal_title')}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl><Checkbox isChecked={rules?.dupesClause} onChange={(e) => setRules({ ...rules, dupesClause: e.target.checked })}>{t('rules.dupes_clause')}</Checkbox></FormControl>
              <FormControl><Checkbox isChecked={rules?.shinyClause} onChange={(e) => setRules({ ...rules, shinyClause: e.target.checked })}>{t('rules.shiny_clause')}</Checkbox></FormControl>
              <FormControl><FormLabel>{t('rules.custom_rules_label')}</FormLabel><Textarea value={rules?.customRules} onChange={(e) => setRules({ ...rules, customRules: e.target.value })} placeholder={t('rules.custom_rules_placeholder')} /></FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter><Button variant="ghost" mr={3} onClick={onRulesClose}>{t('rules.close_button')}</Button><Button colorScheme="blue" onClick={handleSaveRules}>{t('rules.save_button')}</Button></ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

export default TeambuilderPage;