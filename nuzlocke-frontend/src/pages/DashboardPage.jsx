import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api';
import {
  Box, Button, Divider, Flex, Heading, Input, Select, Text,
  VStack, Spinner, Alert, AlertIcon, List, ListItem, ListIcon,
  HStack, Radio, RadioGroup, useToast,
  IconButton,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  Switch,
  FormControl as ChakraFormControl,
  FormLabel
} from '@chakra-ui/react';
import { MdPlayArrow, MdPeople, MdDelete, MdArchive, MdUnarchive } from 'react-icons/md';

function DashboardPage({ user, onLogout }) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newRunName, setNewRunName] = useState('');
  const [selectedGame, setSelectedGame] = useState('platinum');
  const [runType, setRunType] = useState('solo');
  const [inviteCode, setInviteCode] = useState('');
  const toast = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // Logik für den Löschen-Dialog
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const cancelRef = useRef();
  const [runToDelete, setRunToDelete] = useState(null);
  
  // State, um den Filter für archivierte Runs zu steuern
  const [showArchived, setShowArchived] = useState(false);


  useEffect(() => {
    const fetchNuzlockes = async () => {
      try {
        const response = await api.get('/nuzlockes');
        setRuns(response.data);
      } catch (err) {
        console.error(err);
        setError('Fehler beim Laden der Spielstände.');
      } finally {
        setLoading(false);
      }
    };
    fetchNuzlockes();
  }, []);

  const handleCreateRun = async (event) => {
    event.preventDefault();
    if (!newRunName) {
      toast({ title: "Bitte gib einen Namen für den Run ein.", status: "warning", duration: 3000, isClosable: true });
      return;
    }
    setIsCreating(true);
    try {
      const response = await api.post('/nuzlockes', {
        runName: newRunName,
        game: selectedGame,
        type: runType
      });
      const newRun = response.data;
      setRuns([...runs, newRun]);
      setNewRunName('');
      if (newRun.type === 'soullink') {
        toast({
          title: "Soullink-Run erfolgreich erstellt!",
          description: `Dein Invite Code ist: ${newRun.inviteCode}`,
          status: "success",
          duration: 9000,
          isClosable: true,
        });
      } else {
        toast({ title: "Solo-Run erfolgreich erstellt!", status: "success", duration: 3000, isClosable: true });
      }
    } catch (err) {
      setError('Fehler beim Erstellen des Runs.');
    } finally {
      setIsCreating(false);
    }
  };
  
  const handleJoinRun = async (event) => {
    event.preventDefault();
    if (!inviteCode) {
        toast({ title: "Bitte gib einen Code ein.", status: "warning", duration: 3000, isClosable: true });
        return;
    }
    setIsJoining(true);
    try {
        const response = await api.post('/nuzlockes/join', {
            inviteCode: inviteCode.trim()
        });
        const joinedRun = response.data;
        setRuns([...runs, joinedRun]);
        setInviteCode('');
        toast({ title: "Erfolgreich beigetreten!", description: `Du bist jetzt Teil von "${joinedRun.runName}".`, status: "success", duration: 5000, isClosable: true });
    } catch (err) {
        toast({ title: "Beitritt fehlgeschlagen", description: err.response?.data?.message || "Ein unbekannter Fehler ist aufgetreten.", status: "error", duration: 5000, isClosable: true });
    } finally {
        setIsJoining(false);
    }
  };

  const handleDeleteClick = (runId) => {
    setRunToDelete(runId);
    onDeleteOpen();
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/nuzlockes/${runToDelete}`);
      setRuns(runs.filter(run => run._id !== runToDelete));
      toast({ title: "Run gelöscht.", status: "info", duration: 3000, isClosable: true });
    } catch (err) {
      toast({ title: "Fehler beim Löschen.", status: "error", duration: 3000, isClosable: true });
    } finally {
      onDeleteClose();
      setRunToDelete(null);
    }
  };

  const handleToggleArchive = async (runId) => {
    try {
      const response = await api.put(`/nuzlockes/${runId}/archive`);
      const updatedRun = response.data;
      setRuns(runs.map(r => r._id === runId ? updatedRun : r));
      toast({
        title: `Run wurde ${updatedRun.isArchived ? 'archiviert' : 'wiederhergestellt'}.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      toast({ title: "Fehler beim Archivieren.", status: "error", duration: 3000, isClosable: true });
    }
  };

  const activeRuns = runs.filter(run => !run.isArchived);
  const archivedRuns = runs.filter(run => run.isArchived);
  const runsToDisplay = showArchived ? archivedRuns : activeRuns;


  if (loading) {
    return (
      <Flex justify="center" align="center" height="200px">
        <Spinner size="xl" />
        <Text ml={4}>Lade Spielstände...</Text>
      </Flex>
    );
  }

  return (
    <Box maxW="container.lg" mx="auto" p={5}>
      <Flex justifyContent="space-between" alignItems="center" mb={6}>
        <Heading as="h1" size="lg">Willkommen, {user.username}!</Heading>
        <Button onClick={onLogout} colorScheme="gray">Ausloggen</Button>
      </Flex>
      
      <Flex direction={{ base: 'column', md: 'row' }} gap={10}>
        <Box flex={1} p={6} borderWidth={1} borderRadius="lg">
          <Heading as="h2" size="md" mb={4}>Neuen Run starten</Heading>
          <form onSubmit={handleCreateRun}>
            <VStack spacing={4}>
              <Input
                placeholder="Name des Runs"
                value={newRunName}
                onChange={(e) => setNewRunName(e.target.value)}
              />
              <Select value={selectedGame} onChange={(e) => setSelectedGame(e.target.value)}>
                <option value="platinum">Pokémon Platin</option>
              </Select>
              <RadioGroup onChange={setRunType} value={runType}>
                <HStack>
                  <Radio value="solo">Solo</Radio>
                  <Radio value="soullink">Soullink</Radio>
                </HStack>
              </RadioGroup>
              <Button type="submit" colorScheme="teal" width="full" isLoading={isCreating}>Run starten</Button>
            </VStack>
          </form>
        </Box>

        <Box flex={1} p={6} borderWidth={1} borderRadius="lg">
          <Heading as="h2" size="md" mb={4}>Soullink beitreten</Heading>
           <form onSubmit={handleJoinRun}>
             <VStack spacing={4}>
                <Input
                  placeholder="Invite Code eingeben"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                />
                <Button type="submit" colorScheme="purple" width="full" isLoading={isJoining}>Beitreten</Button>
             </VStack>
           </form>
        </Box>
      </Flex>
      
      <Divider my={8} />

      <Box as="section">
        <Flex justifyContent="space-between" alignItems="center" mb={4}>
          <Heading as="h2" size="md">
            {showArchived ? 'Archivierte Runs' : 'Deine Nuzlocke-Runs'}
          </Heading>
          <ChakraFormControl display="flex" alignItems="center">
            <FormLabel htmlFor="show-archive" mb="0">
              Archiv anzeigen
            </FormLabel>
            <Switch id="show-archive" isChecked={showArchived} onChange={() => setShowArchived(!showArchived)} />
          </ChakraFormControl>
        </Flex>

        {runsToDisplay.length === 0 && !error ? (
          <Text>Du hast keine {showArchived ? 'archivierten' : 'aktiven'} Runs.</Text>
        ) : (
          <List spacing={3}>
            {runsToDisplay.map(run => (
              <Flex key={run._id} p={4} borderWidth={1} borderRadius="lg" _hover={{ bg: 'gray.100', _dark: { bg: 'gray.700'} }} justifyContent="space-between" alignItems="center">
                <Link to={`/nuzlocke/${run._id}`} style={{ flexGrow: 1 }}>
                  <Flex align="center">
                    <ListIcon as={run.type === 'soullink' ? MdPeople : MdPlayArrow} color={run.type === 'soullink' ? 'purple.500' : 'green.500'} />
                    <Text fontWeight="bold" mr={2}>{run.runName}</Text>
                    <Text fontSize="sm" color="gray.500">({run.game})</Text>
                  </Flex>
                </Link>
                <HStack>
                  <IconButton
                    aria-label={run.isArchived ? "Run wiederherstellen" : "Run archivieren"}
                    icon={run.isArchived ? <MdUnarchive /> : <MdArchive />}
                    variant="ghost"
                    onClick={() => handleToggleArchive(run._id)}
                  />
                  <IconButton
                    aria-label="Run löschen"
                    icon={<MdDelete />}
                    colorScheme="red"
                    variant="ghost"
                    onClick={() => handleDeleteClick(run._id)}
                  />
                </HStack>
              </Flex>
            ))}
          </List>
        )}
      </Box>

      {/* Der Bestätigungsdialog für's Löschen */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Run löschen
            </AlertDialogHeader>
            <AlertDialogBody>
              Bist du sicher? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>
                Abbrechen
              </Button>
              <Button colorScheme="red" onClick={confirmDelete} ml={3}>
                Löschen
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}

export default DashboardPage;
