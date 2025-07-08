import React from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  Button, Text, VStack, Box
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

function AbilityDetailModal({ isOpen, onClose, ability }) {
  const { i18n, t } = useTranslation();

  if (!ability) return null;

  const displayName = i18n.language === 'de' && ability.name_de ? ability.name_de : ability.name_en;
  const effectText = i18n.language === 'de' && ability.effect_text_de ? ability.effect_text_de : (ability.effect_text_en || 'Keine Beschreibung verfügbar.');

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{displayName}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Box>
                <Text fontWeight="bold" mb={2}>{t('modal.description')}:</Text>
                <Text fontSize="sm">{effectText}</Text>
            </Box>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="blue" onClick={onClose}>
            {t('modal.close_button')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default AbilityDetailModal;