import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/api';
import PokemonSprite from '../components/PokemonSprite';
import TypeIcons from '../components/TypeIcons';
import StatusButtonGroup from '../components/StatusButtonGroup';
import PokemonPairCard from '../components/PokemonPairCard';
import {
  Box, Container, Flex, Heading, Spinner, Alert,
  AlertIcon, Grid, Text, VStack, StackDivider, Icon, Tooltip,
  ButtonGroup, Button, Divider
} from '@chakra-ui/react';
import { FaShieldAlt } from 'react-icons/fa';
import io from 'socket.io-client';


function SpectatorPage() {
  const { spectatorId } = useParams();
  const { i18n, t } = useTranslation();

  const [run, setRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('encounters'); 

  const [team, setTeam] = useState([]);
  const [box, setBox] = useState([]);
  const [fainted, setFainted] = useState([]);
  const [missed, setMissed] = useState([]); // State für verpasste Pokémon hinzugefügt

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_BASE_URL);
    
    const fetchSpectatorRun = async () => {
      try {
        const response = await api.get(`/nuzlockes/spectate/${spectatorId}`);
        setRun(response.data);
        socket.emit('joinRoom', response.data._id.toString());
      } catch (err) {
        setError(err.response?.data?.message || 'Fehler beim Laden des Runs.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSpectatorRun();

    socket.on('nuzlocke:updated', ({ updatedEncounter }) => {
        if (!updatedEncounter) return;
        setRun(prevRun => {
            if (!prevRun) return null;
            const newEncounters = prevRun.encounters.map(enc => 
            enc._id === updatedEncounter._id ? { ...enc, ...updatedEncounter } : enc
            );
            return { ...prevRun, encounters: newEncounters };
        });
    });

    return () => {
      socket.disconnect();
    };
  }, [spectatorId]);

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
                // KORREKTUR: Logik für verpasste Pokémon hinzugefügt
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
            setBox(categorizedEncounters.available.filter(p => !teamIds.has(p.pairId)));
            setFainted(categorizedEncounters.fainted);
            setMissed(categorizedEncounters.missed); // Verpasste Pokémon in den State setzen
        }
    }, [run, categorizedEncounters]);


  const gridTemplateColumns = useMemo(() => {
    if (!run) return '';
    const columns = ['2fr', '80px', '1.5fr', '1.5fr', '1.5fr']; 
    if (run.type === 'soullink') {
      columns.push('80px', '1.5fr', '1.5fr', '1.5fr');
    }
    return columns.join(' ');
  }, [run]);
  
  const sortedEncounters = useMemo(() => {
      if(!run) return [];
      return [...run.encounters].sort((a,b) => (a.sequence || 999) - (b.sequence || 999));
  }, [run]);


  if (loading) return <Flex justify="center" align="center" height="100vh"><Spinner size="xl" /></Flex>;
  if (error) return <Container mt={10}><Alert status="error"><AlertIcon />{error}</Alert></Container>;
  if (!run) return <Container mt={10}><Text>Run nicht gefunden.</Text></Container>;

  const isSoullink = run.type === 'soullink';
  const player1Name = run.participants[0]?.username || 'Spieler 1';
  const player2Name = isSoullink ? (run.participants[1]?.username || 'Spieler 2') : '';

  return (
    <Container maxW="container.2xl" py={8}>
      <VStack mb={6}>
        <Heading as="h1" size="xl">{run.runName}</Heading>
        <Text fontSize="lg" color="gray.500">Zuschauer-Modus</Text>
      </VStack>

      <Flex justifyContent="center" my={6}>
        <ButtonGroup isAttached variant="outline">
          <Button onClick={() => setView('encounters')} isActive={view === 'encounters'}>{t('subnav.encounters')}</Button>
          <Button onClick={() => setView('teambuilder')} isActive={view === 'teambuilder'}>{t('subnav.teambuilder')}</Button>
        </ButtonGroup>
      </Flex>

      {view === 'encounters' && (
        <VStack spacing={0} align="stretch" borderWidth={1} borderRadius="lg" divider={<StackDivider />}>
            <Grid templateColumns={gridTemplateColumns} gap={4} alignItems="center" p={4} borderBottomWidth={2} borderColor="gray.300" _dark={{ borderColor: 'gray.600' }}>
                <Text fontWeight="bold">{t('tracker.location_header')}</Text>
                <Text fontWeight="bold" textAlign="center" whiteSpace="nowrap">{t('tracker.pokemon_header')}</Text>
                <Text fontWeight="bold">{player1Name}</Text>
                <Text fontWeight="bold">{t('tracker.nickname_header')}</Text>
                <Text fontWeight="bold">{t('tracker.status_header')}</Text>
                {isSoullink && (
                <>
                    <Text fontWeight="bold" textAlign="center" whiteSpace="nowrap">{t('tracker.pokemon_header')}</Text>
                    <Text fontWeight="bold">{player2Name}</Text>
                    <Text fontWeight="bold">{t('tracker.nickname_header')}</Text>
                    <Text fontWeight="bold">{t('tracker.status_header')}</Text>
                </>
                )}
            </Grid>
            
            {sortedEncounters.map((encounter) => {
                if (encounter.encounterType === 'event') {
                return (
                    <Flex key={encounter._id.toString()} align="center" justify="center" py={3} bg="gray.100" _dark={{ bg: 'gray.700' }}>
                    <Icon as={FaShieldAlt} mr={3} color="blue.500" />
                    <Text fontWeight="bold">{(i18n.language === 'de' && encounter.locationName_de) ? encounter.locationName_de : encounter.locationName_en}</Text>
                    <Text ml={2} color="gray.500" _dark={{color: "gray.400"}}> - {t('tracker.level_cap')}: {encounter.levelCap}</Text>
                    </Flex>
                );
                }
                
                const isFailed = encounter.status1 === 'fainted' || encounter.status1 === 'missed' || (isSoullink && (encounter.status2 === 'fainted' || encounter.status2 === 'missed'));

                return (
                <Grid key={encounter._id.toString()} templateColumns={gridTemplateColumns} gap={4} alignItems="center" p={2}
                    bg={isFailed ? 'red.900' : 'transparent'}
                    sx={{ textDecoration: isFailed ? 'line-through' : 'none', color: isFailed ? 'whiteAlpha.800' : 'inherit', transition: 'background-color 0.2s', borderRadius: "md" }}
                >
                    <Text>{i18n.language === 'de' && encounter.locationName_de ? encounter.locationName_de : encounter.locationName_en}</Text>
                    <VStack spacing={1}><PokemonSprite pokemonId={encounter.pokemonId1} /><TypeIcons types={encounter.types1} /></VStack>
                    <Text>{encounter.pokemon1 || '-'}</Text>
                    <Text>{encounter.nickname1 || '-'}</Text>
                    <Box pointerEvents="none"><StatusButtonGroup currentStatus={encounter.status1} faintReason={encounter.faintReason1} onStatusChange={() => {}} /></Box>
                    
                    {isSoullink && (
                    <>
                        <VStack spacing={1}><PokemonSprite pokemonId={encounter.pokemonId2} /><TypeIcons types={encounter.types2} /></VStack>
                        <Text>{encounter.pokemon2 || '-'}</Text>
                        <Text>{encounter.nickname2 || '-'}</Text>
                        <Box pointerEvents="none"><StatusButtonGroup currentStatus={encounter.status2} faintReason={encounter.faintReason2} onStatusChange={() => {}} /></Box>
                    </>
                    )}
                </Grid>
                );
            })}
        </VStack>
      )}

      {view === 'teambuilder' && (
        <VStack spacing={8} align="stretch">
            <Box>
                <Heading as="h2" size="lg" mb={4}>{t('teambuilder.your_team')} ({team.length} / 6)</Heading>
                <Flex wrap="wrap" gap={4} minH="160px" p={4} borderWidth={1} borderRadius="lg" bg="gray.50" _dark={{bg: 'gray.800'}}>
                    {team.length > 0 ? team.map(pair => (
                        <PokemonPairCard key={pair.pairId} pair={pair} isTeamMember />
                    )) : <Text color="gray.500">Das Team ist leer.</Text>}
                </Flex>
            </Box>

            <Divider />

            <Box>
                <Heading as="h2" size="lg" mb={4}>{t('teambuilder.your_box')}</Heading>
                {box.length === 0 ? (
                    <Text color="gray.500">Die Box ist leer.</Text>
                ) : (
                    <Flex wrap="wrap" gap={4}>
                        {box.map(pair => (<PokemonPairCard key={pair.pairId} pair={pair} />))}
                    </Flex>
                )}
            </Box>
            
            <Divider />

            <Box>
                <Heading as="h2" size="lg" mb={4}>Besiegte Pokémon</Heading>
                {fainted.length === 0 ? (
                <Text color="gray.500">Keine besiegten Pokémon.</Text>
                ) : (
                <Flex wrap="wrap" gap={4}>
                    {fainted.map(pair => (<Box key={pair.pairId} opacity={0.6}><PokemonPairCard pair={pair} /></Box>))}
                </Flex>
                )}
            </Box>

            <Divider />
            
            {/* KORREKTUR: Fehlender Abschnitt für verpasste Pokémon */}
            <Box>
                <Heading as="h2" size="lg" mb={4}>Verpasste Begegnungen</Heading>
                {missed.length === 0 ? (
                <Text color="gray.500">Keine verpassten Begegnungen.</Text>
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
      )}

    </Container>
  );
}

export default SpectatorPage;