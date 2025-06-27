import React from 'react';
import { Button, HStack, Icon } from '@chakra-ui/react';
// Wir importieren passende Icons von react-icons
import { FaCheck, FaHeartBroken, FaTimes, FaGift } from 'react-icons/fa';

// Wir definieren unsere Status-Optionen jetzt mit Icons
const statusOptions = [
  { value: 'caught', label: 'Gefangen', color: 'green', icon: FaCheck },
  { value: 'gift', label: 'Geschenk', color: 'yellow', icon: FaGift },
  { value: 'fainted', label: 'Besiegt', color: 'red', icon: FaHeartBroken },
  { value: 'missed', label: 'Verpasst', color: 'blue', icon: FaTimes },
];

function StatusButtonGroup({ currentStatus, onChange }) {
  // Wenn der aktuelle Status 'pending' ist, zeigen wir keine Buttons an.
  // Das Feld bleibt dann leer, bis ein Pokémon eingetragen wird.
  if (currentStatus === 'pending') {
    return null; // Zeigt nichts an
  }
  
  return (
    <HStack spacing={1}>
      {statusOptions.map(({ value, label, color, icon }) => (
        <Button
          key={value}
          size="sm"
          colorScheme={currentStatus === value ? color : 'gray'}
          variant={currentStatus === value ? 'solid' : 'outline'}
          onClick={() => onChange(value)}
          title={label} // Der volle Name wird im Tooltip angezeigt
        >
          {/* Anstelle von Buchstaben verwenden wir jetzt die Icons */}
          <Icon as={icon} />
        </Button>
      ))}
    </HStack>
  );
}

export default StatusButtonGroup;
