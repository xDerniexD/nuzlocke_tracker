import React from 'react';
import { useTranslation } from 'react-i18next';
import { VStack, HStack, Text, Box, Badge } from '@chakra-ui/react';
import TypeIcons from './TypeIcons';

function TeamCoverageDisplay({ coverage, teamSize }) {
    const { t } = useTranslation();

    // Filtere und sortiere die Typen, gegen die das Team mindestens eine Schwäche hat
    const weaknesses = Object.entries(coverage)
        .filter(([, counts]) => counts.weak > 0)
        .sort(([, a], [, b]) => b.weak - a.weak); // Sortiere nach der Anzahl der schwachen Pokémon

    if (teamSize === 0) {
        return null; // Zeige nichts an, wenn das Team leer ist
    }

    if (weaknesses.length === 0) {
        return <Text fontSize="sm" color="gray.500">{t('type_efficacy.no_weaknesses')}</Text>;
    }

    return (
        <VStack align="stretch" spacing={3}>
            {weaknesses.map(([type, counts]) => (
                <HStack key={type} justify="space-between" align="center">
                    <TypeIcons types={[type]} />
                    <HStack>
                        <Badge
                            fontSize="0.8em"
                            colorScheme="red"
                            variant="solid"
                            borderRadius="full"
                            px="2"
                        >
                            {counts.weak}x
                        </Badge>
                        <Text fontSize="sm">schwach</Text>
                    </HStack>
                </HStack>
            ))}
        </VStack>
    );
}

export default TeamCoverageDisplay;