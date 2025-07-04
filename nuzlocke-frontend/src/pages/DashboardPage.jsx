import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/api';
import {
  Box, Button, Divider, Flex, Heading, Input, Select,
  Text, VStack, Spinner, Alert, AlertIcon, List, ListItem, ListIcon,
  HStack, IconButton, Switch, FormControl, FormLabel,
  AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader,
  AlertDialogContent, AlertDialogOverlay, useDisclosure, useToast,
  Grid, Tooltip, Radio, RadioGroup, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalCloseButton, ModalBody, ModalFooter, useClipboard,
} from '@chakra-ui/react';
import { MdPlayArrow, MdDelete, MdArchive, MdUnarchive, MdPeople, MdShare } from 'react-icons/md';

function DashboardPage({ user, onLogout }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();

  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [newRunName, setNewRunName] = useState('');
  const [selectedGame, setSelectedGame] = useState('platinum');
  const [runType, setRunType] = useState('solo');
  const [inviteCodeInput, setInviteCodeInput] = useState(''); // Umbenannt, um Konflikte zu vermeiden
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  // NEU: States für das Einladungs-Modal
  const { isOpen: isInviteOpen, onOpen: onInviteOpen, onClose: onInviteClose } = useDisclosure();
  const [runToInvite, setRunToInvite] = useState(null);
  const { onCopy, setValue, hasCopied } = useClipboard("");

  const [runToDelete, setRunToDelete] = useState(null);
  const cancelRef = useRef();

  useEffect(() => {
    const fetchNuzlockes = async () => {
      try {
        setError('');
        const response = await api.get('/nuzlockes');
        if (Array.isArray(response.data)) {
          setRuns(response.data);
        } else {
          setRuns([]); 
        }
      } catch (err) {
        setError(t('dashboard.error_loading'));
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (user) {
      fetchNuzlockes();
    }
  }, [user, t]);

  const handleCreateRun = async (event) => {
    event.preventDefault();
    if (!newRunName) return;
    setIsCreating(true);
    try {
      const response = await api.post('/nuzlockes', { runName: newRunName, game: selectedGame, type: runType });
      const newRun = response.data;
      if (newRun.type === 'soullink' && newRun.inviteCode) {
        setRuns(prevRuns => [...prevRuns, newRun]);
        setNewRunName('');
        handleInviteClick(newRun); // NEU: Öffnet direkt das Invite-Modal
      } else {
        navigate(`/nuzlocke/${newRun._id}`);
      }
    } catch (err) {
      setError(t('dashboard.create_run_error'));
    } finally {
      setIsCreating(false);
    }
  };
  
  const handleJoinRun = async (event) => {
    event.preventDefault();
    if (!inviteCodeInput) return;
    setIsJoining(true);
    try {
        const response = await api.post('/nuzlockes/join', { inviteCode: inviteCodeInput.trim() });
        const joinedRun = response.data;
        toast({ title: "Erfolgreich beigetreten!", description: `Du bist jetzt Teil von "${joinedRun.runName}".`, status: "success", duration: 5000, isClosable: true });
        if (joinedRun && joinedRun._id) {
          setRuns(prevRuns => [...prevRuns, joinedRun]);
        }
        setInviteCodeInput('');
    } catch (err) {
        toast({ title: "Beitritt fehlgeschlagen", description: err.response?.data?.message || t('dashboard.join_error'), status: "error", duration: 5000, isClosable: true });
    } finally {
        setIsJoining(false);
    }
  };
  
  // NEU: Funktion, um das Invite-Modal zu öffnen
  const handleInviteClick = (run) => {
    setRunToInvite(run);
    setValue(run.inviteCode); // Setzt den Wert, der kopiert werden soll
    onInviteOpen();
  };

  const handleDeleteClick = (runId) => {
    setRunToDelete(runId);
    onDeleteOpen();
  };

  const confirmDelete = async () => {
    if (!runToDelete) return;
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

  if (loading) {
    return (
      <Flex justify="center" align="center" height="200px">
        <Spinner size="xl" />
        <Text ml={4}>{t('dashboard.loading_runs')}</Text>
      </Flex>
    );
  }

  const activeRuns = runs.filter(run => !run.isArchived);
  const archivedRuns = runs.filter(run => run.isArchived);
  const runsToDisplay = showArchived ? archivedRuns : activeRuns;

  return (
    <>
      <Box maxW="container.lg" mx="auto" p={5}>
        <Flex justifyContent="space-between" alignItems="center" mb={6}>
          <Heading as="h1" size="lg">{t('dashboard.welcome', { username: user.username })}</Heading>
          <Button onClick={onLogout} colorScheme="gray">{t('dashboard.logout_button')}</Button>
        </Flex>
      
        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={10} my={8}>
            <Box p={6} borderWidth={1} borderRadius="lg">
                <Heading as="h2" size="md" mb={4}>{t('dashboard.new_run_header')}</Heading>
                <form onSubmit={handleCreateRun}>
                    <VStack spacing={4}>
                        <Input placeholder={t('dashboard.run_name_placeholder')} value={newRunName} onChange={(e) => setNewRunName(e.target.value)} />
                        <Select value={selectedGame} onChange={(e) => setSelectedGame(e.target.value)}>
                            <option value="platinum">{t('dashboard.game_platinum')}</option>
                        </Select>
                        <RadioGroup onChange={setRunType} value={runType}>
                            <HStack>
                                <Radio value="solo">{t('dashboard.run_type_solo')}</Radio>
                                <Radio value="soullink">{t('dashboard.run_type_soullink')}</Radio>
                            </HStack>
                        </RadioGroup>
                        <Button type="submit" colorScheme="teal" width="100%" isLoading={isCreating}>{t('dashboard.start_button')}</Button>
                    </VStack>
                </form>
            </Box>
            <Box p={6} borderWidth={1} borderRadius="lg">
                <Heading as="h2" size="md" mb={4}>{t('dashboard.join_soullink_header')}</Heading>
                <form onSubmit={handleJoinRun}>
                    <VStack spacing={4}>
                        <Input placeholder={t('dashboard.join_placeholder')} value={inviteCodeInput} onChange={(e) => setInviteCodeInput(e.target.value)} />
                        <Button type="submit" colorScheme="purple" width="100%" isLoading={isJoining}>{t('dashboard.join_button')}</Button>
                    </VStack>
                </form>
            </Box>
        </Grid>
      
        <Divider my={8} />

        <Box as="section">
          <Flex justifyContent="space-between" alignItems="center" mb={4}>
            <Heading as="h2" size="md">
              {showArchived ? t('dashboard.archived_runs_header') : t('dashboard.your_runs_header')}
            </Heading>
            <FormControl display="flex" alignItems="center" width="auto">
              <FormLabel htmlFor="show-archive" mb="0" mr={2}>
                {t('dashboard.show_archived_label')}
              </FormLabel>
              <Switch id="show-archive" isChecked={showArchived} onChange={() => setShowArchived(!showArchived)} />
            </FormControl>
          </Flex>

          {error && <Alert status="error" borderRadius="md" my={4}><AlertIcon />{error}</Alert>}
          
          {runsToDisplay.length === 0 ? (
            <Box p={4} borderWidth={1} borderRadius="lg" bg="gray.50" _dark={{bg: "gray.700"}}>
                <Text>{showArchived ? t('dashboard.no_archived_runs') : t('dashboard.no_active_runs')}</Text>
            </Box>
          ) : (
            <List spacing={3}>
              {runsToDisplay.map(run => (
                <Flex key={run._id} p={3} borderWidth={1} borderRadius="lg" _hover={{ bg: 'gray.100', _dark: { bg: 'gray.700' } }} justifyContent="space-between" alignItems="center">
                  <Link to={`/nuzlocke/${run._id}`} style={{ flexGrow: 1, textDecoration: 'none' }}>
                      <Flex align="center">
                      <ListIcon as={run.type === 'soullink' ? MdPeople : MdPlayArrow} color={run.type === 'soullink' ? 'purple.500' : 'green.500'} w={6} h={6} />
                      <Box>
                          <Text fontWeight="bold">{run.runName}</Text>
                          <Text fontSize="sm" color="gray.500" textTransform="capitalize">{run.game} ({run.type})</Text>
                      </Box>
                      </Flex>
                  </Link>
                  <HStack>
                      {/* NEU: Button zum Anzeigen des Invite-Codes */}
                      {run.type === 'soullink' && run.inviteCode && (
                        <Tooltip label="Partner einladen">
                            <IconButton
                                aria-label="Partner einladen"
                                icon={<MdShare />}
                                variant="ghost"
                                colorScheme="purple"
                                onClick={() => handleInviteClick(run)}
                            />
                        </Tooltip>
                      )}
                      <Tooltip label={run.isArchived ? t('dashboard.restore_run_aria') : t('dashboard.archive_run_aria')}>
                          <IconButton
                              aria-label={run.isArchived ? t('dashboard.restore_run_aria') : t('dashboard.archive_run_aria')}
                              icon={run.isArchived ? <MdUnarchive /> : <MdArchive />}
                              variant="ghost"
                              onClick={() => handleToggleArchive(run._id)}
                          />
                      </Tooltip>
                      <Tooltip label={t('dashboard.delete_run_aria')}>
                          <IconButton
                              aria-label={t('dashboard.delete_run_aria')}
                              icon={<MdDelete />}
                              colorScheme="red"
                              variant="ghost"
                              onClick={() => handleDeleteClick(run._id)}
                          />
                      </Tooltip>
                  </HStack>
                </Flex>
              ))}
            </List>
          )}
        </Box>
      </Box>

      {/* NEU: Modal zum Anzeigen des Invite-Codes */}
      <Modal isOpen={isInviteOpen} onClose={onInviteClose} isCentered>
        <ModalOverlay />
        <ModalContent>
            <ModalHeader>Partner einladen</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
                <Text mb={2}>Gib diesen Code an deinen Soullink-Partner, damit er oder sie beitreten kann:</Text>
                <Flex>
                    <Input value={runToInvite?.inviteCode || ''} isReadOnly fontSize="lg" fontWeight="bold" textAlign="center" />
                    <Button onClick={onCopy} ml={2}>
                        {hasCopied ? 'Kopiert!' : 'Kopieren'}
                    </Button>
                </Flex>
            </ModalBody>
            <ModalFooter>
                <Button colorScheme="blue" onClick={onInviteClose}>Schließen</Button>
            </ModalFooter>
        </ModalContent>
      </Modal>

      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              {t('dashboard.delete_run_title')}
            </AlertDialogHeader>
            <AlertDialogBody>
              {t('dashboard.delete_run_body')}
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>
                {t('dashboard.cancel_button')}
              </Button>
              <Button colorScheme="red" onClick={confirmDelete} ml={3}>
                {t('dashboard.delete_button')}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}

export default DashboardPage;