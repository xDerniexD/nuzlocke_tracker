import React from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  Button, Text, VStack, HStack, Divider, Box, Icon, Center, Tooltip
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import TypeIcons from './TypeIcons';
import { FaBolt, FaStar, FaSyncAlt } from 'react-icons/fa';

const InfoRow = ({ label, children }) => (
    <HStack justify="space-between" w="100%">
        <Text fontWeight="bold" color="gray.500">{label}:</Text>
        <Box>{children}</Box>
    </HStack>
);

function MoveDetailModal({ isOpen, onClose, move }) {
  const { i18n, t } = useTranslation();

  // KORREKTUR: Die fehlende Funktion wurde hier hinzugefügt.
  const getDamageClassIcon = (damageClass) => {
    const label = t(`damage_class.${damageClass}`, { defaultValue: damageClass });
    switch(damageClass) {
        case 'physical': return { icon: FaBolt, color: 'orange.400', label };
        case 'special': return { icon: FaStar, color: 'purple.400', label };
        case 'status': return { icon: FaSyncAlt, color: 'blue.400', label };
        default: return null;
    }
  };

  if (!move) return null;

  const damageClassInfo = getDamageClassIcon(move.damage_class);
  const displayName = i18n.language === 'de' && move.name_de ? move.name_de : move.name_en;
  const effectText = i18n.language === 'de' && move.effect_text_de ? move.effect_text_de : (move.effect_text_en || 'Keine Beschreibung verfügbar.');

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{displayName}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <VStack spacing={2} p={4} borderWidth={1} borderRadius="lg" bg="gray.50" _dark={{ bg: 'gray.700' }}>
                <InfoRow label={t('modal.type')}>
                    <TypeIcons types={[move.type]} />
                </InfoRow>
                <InfoRow label={t('modal.category')}>
                    {damageClassInfo && (
                        <Tooltip label={damageClassInfo.label}>
                            <HStack spacing={2}>
                                <Icon as={damageClassInfo.icon} color={damageClassInfo.color} />
                                <Text>{damageClassInfo.label}</Text>
                            </HStack>
                        </Tooltip>
                    )}
                </InfoRow>
                <Divider />
                <InfoRow label={t('modal.power')}><Text>{move.power || '—'}</Text></InfoRow>
                <InfoRow label={t('modal.accuracy')}><Text>{move.accuracy || '—'}</Text></InfoRow>
                <InfoRow label={t('modal.pp')}><Text>{move.pp || '—'}</Text></InfoRow>
            </VStack>
            
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

export default MoveDetailModal;