import {
  Box,
  Flex,
  Button,
  useColorMode,
  Heading,
  HStack,
  // Chakra-Komponenten für das Dropdown-Menü
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Text,
  Image // Image-Komponente für die Flaggen
} from '@chakra-ui/react';
// Icons für das Menü
import { MoonIcon, SunIcon, ChevronDownIcon } from '@chakra-ui/icons';
import { useTranslation } from 'react-i18next';

function Navbar() {
  const { colorMode, toggleColorMode } = useColorMode();
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  // Ein kleines Objekt, das uns hilft, die richtige Flagge zu finden
  const languageOptions = {
    de: { name: 'Deutsch', flag: 'de' },
    en: { name: 'English', flag: 'gb' },
  };

  return (
    <Box bg={colorMode === 'light' ? 'gray.100' : 'gray.900'} px={4} mb={8}>
      <Flex h={16} alignItems={'center'} justifyContent={'space-between'}>
        <Heading as="h1" size="md">{t('navbar.title')}</Heading>

        <HStack spacing={4}>
          {/* Dropdown-Menü für die Sprachauswahl */}
          <Menu>
            <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
              {/* Zeigt das Flaggen-Bild der aktuell ausgewählten Sprache an */}
              <Image
                boxSize="1.5rem"
                borderRadius="full"
                // NEU: Wir verwenden SVG für verlustfreie Skalierung
                src={`https://flagcdn.com/${languageOptions[i18n.language]?.flag || 'gb'}.svg`}
                alt={`${languageOptions[i18n.language]?.name} flag`}
              />
            </MenuButton>
            <MenuList>
              <MenuItem onClick={() => changeLanguage('de')}>
                <Image
                  boxSize="1.2rem"
                  // NEU: Wir verwenden SVG für verlustfreie Skalierung
                  src={`https://flagcdn.com/de.svg`}
                  alt="Germany flag"
                  mr="12px"
                />
                <Text>Deutsch</Text>
              </MenuItem>
              <MenuItem onClick={() => changeLanguage('en')}>
                <Image
                  boxSize="1.2rem"
                  // NEU: Wir verwenden SVG für verlustfreie Skalierung
                  src={`https://flagcdn.com/gb.svg`}
                  alt="United Kingdom flag"
                  mr="12px"
                />
                <Text>English</Text>
              </MenuItem>
              {/* Hier könnten später einfach weitere Sprachen hinzugefügt werden */}
            </MenuList>
          </Menu>
          
          {/* Dark Mode Schalter */}
          <Button onClick={toggleColorMode}>
            {colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
          </Button>
        </HStack>
      </Flex>
    </Box>
  );
}

export default Navbar;
