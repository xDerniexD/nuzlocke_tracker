import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  ModalHeader, ModalCloseButton, ModalBody, ModalFooter, useClipboard, InputGroup, InputRightElement,
} from '@chakra-ui/react';
import { MdPlayArrow, MdDelete, MdArchive, MdUnarchive, MdPeople, MdShare } from 'react-icons/md';
import { FaUserPlus, FaUserTimes } from 'react-icons/fa'; // Icons für Editoren

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
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [editorInviteCodeInput, setEditorInviteCodeInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isJoiningAsEditor, setIsJoiningAsEditor] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const { isOpen: isInviteOpen, onOpen: onInviteOpen, onClose: onInviteClose } = useDisclosure();
  const { isOpen: isEditorInviteOpen, onOpen: onEditorInviteOpen, onClose: onEditorInviteClose } = useDisclosure();

  const [runToInvite, setRunToInvite] = useState(null);
  const [runToManageEditors, setRunToManageEditors] = useState(null);
  const [generatedEditorCode, setGeneratedEditorCode] = useState('');
  const { onCopy, setValue, hasCopied } = useClipboard("");
  const { onCopy: onCopyEditorCode, hasCopied: hasCopiedEditorCode } = useClipboard(generatedEditorCode);

  const [runToDelete, setRunToDelete] = useState(null);
  const cancelRef = useRef();

  const fetchNuzlockes = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
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
  }, [t]);

  useEffect(() => {
    if (user) {
      fetchNuzlockes();
    }
  }, [user, fetchNuzlockes]);

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
        handleInviteClick(newRun);
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
      setRuns(prevRuns => [...prevRuns, joinedRun]);
      setInviteCodeInput('');
    } catch (err) {
      toast({ title: "Beitritt fehlgeschlagen", description: err.response?.data?.message || t('dashboard.join_error'), status: "error", duration: 5000, isClosable: true });
    } finally {
      setIsJoining(false);
    }
  };

  const handleJoinAsEditor = async (e) => {
    e.preventDefault();
    if (!editorInviteCodeInput) return;
    setIsJoiningAsEditor(true);
    try {
      const res = await api.post('/nuzlockes/join-editor', { editorInviteCode: editorInviteCodeInput.trim() });
      toast({ title: "Erfolgreich beigetreten!", description: `Du kannst diesen Run jetzt bearbeiten.`, status: "success", duration: 5000, isClosable: true });
      setEditorInviteCodeInput('');
      fetchNuzlockes(); // Lade die Runs neu, um den neuen Run anzuzeigen
    } catch (err) {
      toast({ title: "Beitritt als Editor fehlgeschlagen", description: err.response?.data?.message, status: "error", isClosable: true });
    } finally {
      setIsJoiningAsEditor(false);
    }
  };

  const handleInviteClick = (run) => {
    setRunToInvite(run);
    setValue(run.inviteCode);
    onInviteOpen();
  };

  const handleOpenEditorModal = async (run) => {
    setRunToManageEditors(run);
    setGeneratedEditorCode('... generiere');
    onEditorInviteOpen();
    try {
      const res = await api.post(`/nuzlockes/${run._id}/invite-editor`);
      setGeneratedEditorCode(res.data.editorInviteCode);
    } catch (err) {
      setGeneratedEditorCode('Fehler beim Generieren des Codes.');
    }
  };

  const handleRemoveEditor = async (runId, editorId) => {
    try {
      const response = await api.delete(`/nuzlockes/${runId}/editor/${editorId}`);
      // Update den State, um die UI zu aktualisieren
      setRuns(prevRuns => prevRuns.map(run => {
        if (run._id === runId) {
          return { ...run, editors: response.data };
        }
        return run;
      }));
      setRunToManageEditors(prev => ({ ...prev, editors: response.data }));
      toast({ title: "Editor entfernt", status: "success", duration: 3000, isClosable: true });
    } catch (err) {
      toast({ title: "Fehler beim Entfernen", description: err.response?.data?.message, status: "error", isClosable: true });
    }
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
      toast({ title: `Run wurde ${updatedRun.isArchived ? 'archiviert' : 'wiederhergestellt'}.`, status: 'success', duration: 3000, isClosable: true });
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

  const isParticipantOf = (run) => run.participants.some(p => p._id === user._id);

  return (
    <>
      <Box maxW="container.lg" mx="auto" p={5}>
        <Flex justifyContent="space-between" alignItems="center" mb={6}>
          <Heading as="h1" size="lg">{t('dashboard.welcome', { username: user.username })}</Heading>
          <Button onClick={onLogout} colorScheme="gray">{t('dashboard.logout_button')}</Button>
        </Flex>

        <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={10} my={8}>
          <Box p={6} borderWidth={1} borderRadius="lg">
            <Heading as="h2" size="md" mb={4}>{t('dashboard.new_run_header')}</Heading>
            <form onSubmit={handleCreateRun}>
              <VStack spacing={4}>
                <Input placeholder={t('dashboard.run_name_placeholder')} value={newRunName} onChange={(e) => setNewRunName(e.target.value)} />
                <Select value={selectedGame} onChange={(e) => setSelectedGame(e.target.value)}>
                  <option value="platinum">{t('dashboard.game_platinum')}</option>
                </Select>
                <RadioGroup onChange={setRunType} value={runType}><HStack><Radio value="solo">{t('dashboard.run_type_solo')}</Radio><Radio value="soullink">{t('dashboard.run_type_soullink')}</Radio></HStack></RadioGroup>
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
          <Box p={6} borderWidth={1} borderRadius="lg">
            <Heading as="h2" size="md" mb={4}>Als Editor beitreten</Heading>
            <form onSubmit={handleJoinAsEditor}>
              <VStack spacing={4}>
                <Input placeholder="Editor-Code eingeben" value={editorInviteCodeInput} onChange={(e) => setEditorInviteCodeInput(e.target.value)} />
                <Button type="submit" colorScheme="orange" width="100%" isLoading={isJoiningAsEditor}>Beitreten</Button>
              </VStack>
            </form>
          </Box>
        </Grid>

        <Divider my={8} />

        <Box as="section">
          <Flex justifyContent="space-between" alignItems="center" mb={4}>
            <Heading as="h2" size="md">{showArchived ? t('dashboard.archived_runs_header') : t('dashboard.your_runs_header')}</Heading>
            <FormControl display="flex" alignItems="center" width="auto">
              <FormLabel htmlFor="show-archive" mb="0" mr={2}>{t('dashboard.show_archived_label')}</FormLabel>
              <Switch id="show-archive" isChecked={showArchived} onChange={() => setShowArchived(!showArchived)} />
            </FormControl>
          </Flex>

          {error && <Alert status="error" borderRadius="md" my={4}><AlertIcon />{error}</Alert>}

          {runsToDisplay.length === 0 ? (
            <Box p={4} borderWidth={1} borderRadius="lg" bg="gray.50" _dark={{ bg: "gray.700" }}><Text>{showArchived ? t('dashboard.no_archived_runs') : t('dashboard.no_active_runs')}</Text></Box>
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
                  {isParticipantOf(run) && (
                    <HStack>
                      {run.type === 'soullink' && run.inviteCode && (<Tooltip label="Partner einladen"><IconButton aria-label="Partner einladen" icon={<MdShare />} variant="ghost" colorScheme="purple" onClick={() => handleInviteClick(run)} /></Tooltip>)}
                      <Tooltip label="Editoren verwalten"><IconButton aria-label="Editoren verwalten" icon={<FaUserPlus />} variant="ghost" colorScheme="orange" onClick={() => handleOpenEditorModal(run)} /></Tooltip>
                      <Tooltip label={run.isArchived ? t('dashboard.restore_run_aria') : t('dashboard.archive_run_aria')}><IconButton aria-label={run.isArchived ? t('dashboard.restore_run_aria') : t('dashboard.archive_run_aria')} icon={run.isArchived ? <MdUnarchive /> : <MdArchive />} variant="ghost" onClick={() => handleToggleArchive(run._id)} /></Tooltip>
                      <Tooltip label={t('dashboard.delete_run_aria')}><IconButton aria-label={t('dashboard.delete_run_aria')} icon={<MdDelete />} colorScheme="red" variant="ghost" onClick={() => handleDeleteClick(run._id)} /></Tooltip>
                    </HStack>
                  )}
                </Flex>
              ))}
            </List>
          )}
        </Box>
      </Box>

      <Modal isOpen={isEditorInviteOpen} onClose={onEditorInviteClose}>
        <ModalOverlay /><ModalContent>
          <ModalHeader>Editoren für "{runToManageEditors?.runName}" verwalten</ModalHeader><ModalCloseButton />
          <ModalBody>
            <Heading size="sm" mb={2}>Editor einladen</Heading>
            <Text mb={2} fontSize="sm">Teile diesen Code, um anderen Bearbeitungsrechte zu geben.</Text>
            <InputGroup mb={6}>
              <Input value={generatedEditorCode} isReadOnly />
              <InputRightElement width="4.5rem"><Button h="1.75rem" size="sm" onClick={onCopyEditorCode}>{hasCopiedEditorCode ? 'Kopiert' : 'Kopieren'}</Button></InputRightElement>
            </InputGroup>
            <Heading size="sm" mb={3}>Aktuelle Editoren</Heading>
            {runToManageEditors?.editors?.length > 0 ? (
              <VStack align="stretch">
                {runToManageEditors.editors.map(editor => (
                  <Flex key={editor._id} justify="space-between" align="center" p={2} bg="gray.100" _dark={{ bg: "gray.700" }} borderRadius="md">
                    <Text>{editor.username}</Text>
                    <IconButton icon={<FaUserTimes />} size="sm" colorScheme="red" variant="ghost" aria-label="Editor entfernen" onClick={() => handleRemoveEditor(runToManageEditors._id, editor._id)} />
                  </Flex>
                ))}
              </VStack>
            ) : (<Text fontSize="sm" color="gray.500">Dieser Run hat noch keine Editoren.</Text>)}
          </ModalBody>
          <ModalFooter><Button colorScheme="blue" onClick={onEditorInviteClose}>Schließen</Button></ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isInviteOpen} onClose={onInviteClose} isCentered>
        <ModalOverlay /><ModalContent>
          <ModalHeader>Partner einladen</ModalHeader><ModalCloseButton />
          <ModalBody>
            <Text mb={2}>Gib diesen Code an deinen Soullink-Partner, damit er oder sie beitreten kann:</Text>
            <Flex>
              <Input value={runToInvite?.inviteCode || ''} isReadOnly fontSize="lg" fontWeight="bold" textAlign="center" />
              <Button onClick={onCopy} ml={2}>{hasCopied ? 'Kopiert!' : 'Kopieren'}</Button>
            </Flex>
          </ModalBody>
          <ModalFooter><Button colorScheme="blue" onClick={onInviteClose}>Schließen</Button></ModalFooter>
        </ModalContent>
      </Modal>

      <AlertDialog isOpen={isDeleteOpen} leastDestructiveRef={cancelRef} onClose={onDeleteClose}>
        <AlertDialogOverlay><AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">{t('dashboard.delete_run_title')}</AlertDialogHeader>
          <AlertDialogBody>{t('dashboard.delete_run_body')}</AlertDialogBody>
          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={onDeleteClose}>{t('dashboard.cancel_button')}</Button>
            <Button colorScheme="red" onClick={confirmDelete} ml={3}>{t('dashboard.delete_button')}</Button>
          </AlertDialogFooter>
        </AlertDialogContent></AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}

export default DashboardPage;