import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/api';
import io from 'socket.io-client';

import {
    Box, Container, Flex, Heading, Spinner, Alert, AlertIcon, Text,
    VStack, HStack, Icon, useDisclosure, ButtonGroup, Button,
    SimpleGrid, Card, CardHeader, CardBody, Stat, StatNumber, Center,
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter,
    ModalBody, ModalCloseButton, FormControl, FormLabel, Input, RadioGroup, Radio
} from '@chakra-ui/react';
import { FaCrown } from 'react-icons/fa';
import PokemonSprite from '../components/PokemonSprite';
import SubNav from '../components/SubNav';

// Liste der legendären und mysteriösen Pokémon bis Gen 4
const legendaryPokemonList = [
    { id: 144, name: 'Articuno' }, { id: 145, name: 'Zapdos' }, { id: 146, name: 'Moltres' },
    { id: 150, name: 'Mewtwo' }, { id: 151, name: 'Mew' }, { id: 243, name: 'Raikou' },
    { id: 244, name: 'Entei' }, { id: 245, name: 'Suicune' }, { id: 249, name: 'Lugia' },
    { id: 250, name: 'Ho-Oh' }, { id: 251, name: 'Celebi' }, { id: 377, name: 'Regirock' },
    { id: 378, name: 'Regice' }, { id: 379, name: 'Registeel' }, { id: 380, name: 'Latias' },
    { id: 381, name: 'Latios' }, { id: 382, name: 'Kyogre' }, { id: 383, name: 'Groudon' },
    { id: 384, name: 'Rayquaza' }, { id: 385, name: 'Jirachi' }, { id: 386, name: 'Deoxys' },
    { id: 480, name: 'Uxie' }, { id: 481, name: 'Mesprit' }, { id: 482, name: 'Azelf' },
    { id: 483, name: 'Dialga' }, { id: 484, name: 'Palkia' }, { id: 485, name: 'Heatran' },
    { id: 486, name: 'Regigigas' }, { id: 487, name: 'Giratina' }, { id: 488, name: 'Cresselia' },
    { id: 489, name: 'Phione' }, { id: 490, name: 'Manaphy' }, { id: 491, name: 'Darkrai' },
    { id: 492, name: 'Shaymin' }, { id: 493, name: 'Arceus' }
];


function LegendaryTrackerPage() {
    const { id: runId } = useParams();
    const { t } = useTranslation();
    const [run, setRun] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [viewMode, setViewMode] = useState('simple');
    const [legendaryEncounters, setLegendaryEncounters] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [selectedPokemon, setSelectedPokemon] = useState(null);
    const [encounterType, setEncounterType] = useState('');
    const [selectedPlayerId, setSelectedPlayerId] = useState('');

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        setCurrentUser(user);
        setSelectedPlayerId(user?._id || '');

        const socket = io(import.meta.env.VITE_API_BASE_URL);
        socket.on('connect', () => {
            socket.emit('joinRoom', runId);
        });

        socket.on('nuzlocke:legendary_updated', (updatedEncounters) => {
            setLegendaryEncounters(updatedEncounters);
        });

        const fetchRunData = async () => {
            try {
                const response = await api.get(`/nuzlockes/${runId}`);
                setRun(response.data);
                setLegendaryEncounters(response.data.legendaryEncounters || []);
            } catch (err) {
                setError("Fehler beim Laden der Run-Daten.");
            } finally {
                setLoading(false);
            }
        };
        fetchRunData();

        return () => {
            socket.disconnect();
        };
    }, [runId]);

    const playerCounts = useMemo(() => {
        const counts = {};
        if (run) {
            run.participants.forEach(p => {
                counts[p._id] = {
                    username: p.username,
                    total: 0,
                    byPokemon: {}
                };
            });
            legendaryEncounters.forEach(enc => {
                if (counts[enc.playerId]) {
                    counts[enc.playerId].total++;
                    counts[enc.playerId].byPokemon[enc.pokemonId] = (counts[enc.playerId].byPokemon[enc.pokemonId] || 0) + 1;
                }
            });
        }
        return counts;
    }, [run, legendaryEncounters]);

    const handleAddEncounter = async (pokemonId, playerId = currentUser._id, type) => {
        try {
            const response = await api.post(`/nuzlockes/${runId}/legendary`, { pokemonId, encounterType: type, playerId });
            setLegendaryEncounters(response.data);
        } catch (err) {
            console.error("Fehler beim Hinzufügen:", err);
        }
    };

    const handleRemoveEncounter = async (pokemonId, playerId = currentUser._id) => {
        const encounterToRemove = legendaryEncounters.find(enc => enc.pokemonId === pokemonId && enc.pokemonId !== 0 && enc.playerId === playerId);
        if (!encounterToRemove) return;
        try {
            const response = await api.delete(`/nuzlockes/${runId}/legendary/${encounterToRemove._id}`);
            setLegendaryEncounters(response.data);
        } catch (err) {
            console.error("Fehler beim Entfernen:", err);
        }
    };

    const handleAddGeneric = (playerId) => {
        handleAddEncounter(0, playerId, null);
    };

    const handleRemoveGeneric = async (playerId) => {
        try {
            const response = await api.delete(`/nuzlockes/${runId}/legendary/generic/${playerId}`);
            setLegendaryEncounters(response.data);
        } catch (err) {
            if (err.response?.status !== 404) {
                console.error("Fehler beim Entfernen des generischen Counters:", err);
            }
        }
    };

    const openDetailedModal = (pokemon) => {
        setSelectedPokemon(pokemon);
        setEncounterType('');
        setSelectedPlayerId(currentUser._id);
        onOpen();
    };

    const confirmDetailedEncounter = () => {
        handleAddEncounter(selectedPokemon.id, selectedPlayerId, encounterType);
        onClose();
    };


    if (loading) return <Center h="50vh"><Spinner size="xl" /></Center>;
    if (error) return <Container mt={10}><Alert status="error"><AlertIcon />{error}</Alert></Container>;
    if (!run) return null;

    return (
        <Container maxW="container.2xl" py={8}>
            <Heading as="h1" size="lg" mb={2}>{run.runName}</Heading>
            <Text fontSize="xl" color="gray.500" mb={4}>Legendary Tracker</Text>

            <SubNav />

            <Center mb={8}>
                <ButtonGroup isAttached>
                    <Button onClick={() => setViewMode('simple')} isActive={viewMode === 'simple'}>Einfach</Button>
                    <Button onClick={() => setViewMode('expanded')} isActive={viewMode === 'expanded'}>Erweitert</Button>
                    <Button onClick={() => setViewMode('detailed')} isActive={viewMode === 'detailed'}>Detailliert</Button>
                </ButtonGroup>
            </Center>

            {viewMode === 'simple' && (
                <SimpleGrid columns={{ base: 1, md: run.type === 'soullink' ? 2 : 1 }} spacing={10}>
                    {Object.values(playerCounts).map(playerData => {
                        const player = run.participants.find(p => p.username === playerData.username);
                        return (
                            <Card key={playerData.username}>
                                <CardHeader>
                                    <Heading size='md'>{playerData.username}</Heading>
                                </CardHeader>
                                <CardBody>
                                    <Flex align="center" justify="space-between">
                                        <Stat>
                                            <StatNumber fontSize="6xl">{playerData.total}</StatNumber>
                                        </Stat>
                                        <VStack>
                                            <Button size="lg" fontSize="3xl" onClick={() => handleAddGeneric(player._id)}>+</Button>
                                            <Button size="lg" fontSize="3xl" onClick={() => handleRemoveGeneric(player._id)}>-</Button>
                                        </VStack>
                                    </Flex>
                                </CardBody>
                            </Card>
                        )
                    })}
                </SimpleGrid>
            )}

            {viewMode === 'expanded' && (
                <SimpleGrid columns={{ base: 2, md: 4, lg: 6 }} spacing={4}>
                    {legendaryPokemonList.map(pokemon => (
                        <Card key={pokemon.id} p={2}>
                            <VStack>
                                <PokemonSprite pokemonId={pokemon.id} />
                                <Text fontWeight="bold">{pokemon.name}</Text>
                                <HStack>
                                    {run.participants.map(player => (
                                        <VStack key={player._id} spacing={1}>
                                            <Text fontSize="xs">{player.username}</Text>
                                            <ButtonGroup isAttached size="sm">
                                                <Button onClick={() => handleRemoveEncounter(pokemon.id, player._id)}>-</Button>
                                                <Button variant="outline" cursor="default">
                                                    {playerCounts[player._id]?.byPokemon[pokemon.id] || 0}
                                                </Button>
                                                <Button onClick={() => handleAddEncounter(pokemon.id, player._id)}>+</Button>
                                            </ButtonGroup>
                                        </VStack>
                                    ))}
                                </HStack>
                            </VStack>
                        </Card>
                    ))}
                </SimpleGrid>
            )}

            {viewMode === 'detailed' && (
                <SimpleGrid columns={{ base: 2, md: 4, lg: 6 }} spacing={4}>
                    {legendaryPokemonList.map(pokemon => (
                        <Card key={pokemon.id} p={2} cursor="pointer" onClick={() => openDetailedModal(pokemon)} _hover={{ bg: "gray.100", _dark: { bg: "gray.700" } }}>
                            <VStack>
                                <PokemonSprite pokemonId={pokemon.id} />
                                <Text fontWeight="bold">{pokemon.name}</Text>
                                <HStack>
                                    {Object.values(playerCounts).map(player => player.byPokemon[pokemon.id] > 0 && (
                                        <Flex key={player.username} align="center" bg="teal.500" color="white" px={2} py={1} borderRadius="md">
                                            <Text fontSize="xs" fontWeight="bold">{player.username.substring(0, 3)}</Text>
                                            <Icon as={FaCrown} ml={1} />
                                        </Flex>
                                    ))}
                                </HStack>
                            </VStack>
                        </Card>
                    ))}
                </SimpleGrid>
            )}

            <Modal isOpen={isOpen} onClose={onClose}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Begegnung für {selectedPokemon?.name} eintragen</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <VStack spacing={4}>
                            {run.type === 'soullink' && (
                                <FormControl as="fieldset">
                                    <FormLabel as="legend">Spieler:</FormLabel>
                                    <RadioGroup onChange={setSelectedPlayerId} value={selectedPlayerId}>
                                        <HStack spacing={4}>
                                            {run.participants.map(p => <Radio key={p._id} value={p._id}>{p.username}</Radio>)}
                                        </HStack>
                                    </RadioGroup>
                                </FormControl>
                            )}
                            <FormControl>
                                <FormLabel>Art der Begegnung (optional):</FormLabel>
                                <Input value={encounterType} onChange={(e) => setEncounterType(e.target.value)} placeholder="z.B. Static, Geschenk, Roaming" />
                            </FormControl>
                        </VStack>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="ghost" mr={3} onClick={onClose}>Abbrechen</Button>
                        <Button colorScheme="teal" onClick={confirmDetailedEncounter}>Speichern</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

        </Container>
    );
}

export default LegendaryTrackerPage;