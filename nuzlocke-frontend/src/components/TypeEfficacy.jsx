import React from 'react';
import { useTranslation } from 'react-i18next';
import { VStack, Box, Text, Tag, Wrap, WrapItem } from '@chakra-ui/react';
import TypeIcons from './TypeIcons';

const multiplierToColorScheme = {
    '4': 'red',
    '2': 'orange',
    '0.5': 'green',
    '0.25': 'teal',
    '0': 'gray'
};

function TypeEfficacy({ groupedEfficacy }) {
    const { t } = useTranslation();

    const multiplierToLabel = {
        '4': t('type_efficacy.x4_weak'),
        '2': t('type_efficacy.x2_weak'),
        '0.5': t('type_efficacy.x0_5_resist'),
        '0.25': t('type_efficacy.x0_25_resist'),
        '0': t('type_efficacy.x0_immune')
    };

    const sortedMultipliers = Object.keys(groupedEfficacy).sort((a, b) => b - a);

    if (sortedMultipliers.length === 0) {
        return <Text fontSize="sm" color="gray.500">{t('type_efficacy.no_weaknesses')}</Text>;
    }

    return (
        <VStack align="stretch" spacing={4}>
            {sortedMultipliers.map(multiplier => (
                <Box key={multiplier}>
                    <Tag colorScheme={multiplierToColorScheme[multiplier]} mb={2} size="lg">
                        {multiplierToLabel[multiplier]}
                    </Tag>
                    <Wrap spacing={2}>
                        {groupedEfficacy[multiplier].map(type => (
                            <WrapItem key={type}>
                                <TypeIcons types={[type]} />
                            </WrapItem>
                        ))}
                    </Wrap>
                </Box>
            ))}
        </VStack>
    );
}

export default TypeEfficacy;