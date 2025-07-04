import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/api';
import PokemonSprite from '../components/PokemonSprite';
import TypeIcons from '../components/TypeIcons';
// NEU: StatusButtonGroup importieren
import StatusButtonGroup from '../components/StatusButtonGroup';
import {
  Box, Container, Flex, Heading, Spinner, Alert,
  AlertIcon, Grid, Text, VStack, StackDivider, Icon
} from '@chakra-ui/react';
import { FaShieldAlt } from 'react-icons/fa';
import io from 'socket.io-client';


function SpectatorPage() {
  const { spectatorId } = useParams();
  const { i18n, t } = useTranslation();

  const [run, setRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const gridTemplateColumns = useMemo(() => {
    if (!run) return '';
    // Spalten angepasst für die neuen Buttons
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
                  {/* KORREKTUR: Status-Text durch Button-Gruppe ersetzt */}
                  <Box pointerEvents="none">
                    <StatusButtonGroup 
                        currentStatus={encounter.status1} 
                        faintReason={encounter.faintReason1}
                        onStatusChange={() => {}} // Leere Funktion, da nicht klickbar
                    />
                  </Box>
                  
                  {isSoullink && (
                  <>
                      <VStack spacing={1}><PokemonSprite pokemonId={encounter.pokemonId2} /><TypeIcons types={encounter.types2} /></VStack>
                      <Text>{encounter.pokemon2 || '-'}</Text>
                      <Text>{encounter.nickname2 || '-'}</Text>
                      {/* KORREKTUR: Status-Text durch Button-Gruppe ersetzt */}
                      <Box pointerEvents="none">
                        <StatusButtonGroup 
                            currentStatus={encounter.status2} 
                            faintReason={encounter.faintReason2}
                            onStatusChange={() => {}} // Leere Funktion, da nicht klickbar
                        />
                      </Box>
                  </>
                  )}
              </Grid>
            );
        })}
      </VStack>
    </Container>
  );
}

export default SpectatorPage;