import React from 'react';
import { Button, HStack, Icon, Tooltip } from '@chakra-ui/react';
import { FaCheck, FaHeartBroken, FaTimes, FaGift } from 'react-icons/fa';

const statusOptions = [
  { value: 'caught', label: 'Gefangen', color: 'green', icon: FaCheck },
  { value: 'gift', label: 'Geschenk', color: 'yellow', icon: FaGift },
  { value: 'fainted', label: 'Besiegt', color: 'red', icon: FaHeartBroken },
  { value: 'missed', label: 'Verpasst', color: 'blue', icon: FaTimes },
];

function StatusButtonGroup({ currentStatus, onStatusChange, faintReason }) {
  // KORREKTUR: Die folgende Zeile wurde entfernt, um die Buttons immer anzuzeigen.
  // if (currentStatus === 'pending') { return null; }
  
  return (
    <HStack spacing={1}>
      {statusOptions.map(({ value, label, color, icon }) => {
        // Ignoriere den "Geschenk"-Button, wenn der Status nicht "gift" ist.
        if (value === 'gift' && currentStatus !== 'gift') {
            return null;
        }

        // Zeige alle anderen Buttons an.
        if (value !== 'gift') {
            const isSelected = currentStatus === value;
            
            // Spezielle Logik für den "Besiegt"-Button mit Tooltip für den Grund
            if (value === 'fainted' && faintReason) {
                return (
                     <Tooltip key={value} label={`Grund: ${faintReason}`} placement="top" hasArrow>
                        <Button
                            size="sm"
                            colorScheme={isSelected ? color : 'gray'}
                            variant={isSelected ? 'solid' : 'outline'}
                            onClick={() => onStatusChange(value)}
                            title={label}
                        >
                            <Icon as={icon} />
                        </Button>
                    </Tooltip>
                )
            }

            return (
                <Button
                    key={value}
                    size="sm"
                    colorScheme={isSelected ? color : 'gray'}
                    variant={isSelected ? 'solid' : 'outline'}
                    onClick={() => onStatusChange(value)}
                    title={label}
                >
                    <Icon as={icon} />
                </Button>
            );
        }
        return null; // Fallback
      })}
    </HStack>
  );
}

export default StatusButtonGroup;