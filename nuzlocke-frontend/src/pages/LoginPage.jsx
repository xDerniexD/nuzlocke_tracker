import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Heading,
  Text,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next'; // NEU: Import für die Übersetzungen

function LoginPage({ onLoginSuccess }) {
  const { t } = useTranslation(); // NEU: Der Hook für die Übersetzungsfunktion
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      const response = await api.post('/users/login', {
        username: username,
        password: password,
      });
      
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      onLoginSuccess(user);
    } catch (err) {
      // Wir übersetzen auch die Fehlermeldungen
      const errorMessage = err.response?.data?.message === 'Ungültige Anmeldedaten.' 
        ? t('login.invalidCredentials') 
        : t('login.genericError');
      setError(errorMessage);
    }
  };

  return (
    <Box maxW="md" mx="auto" mt={10} p={8} borderWidth={1} borderRadius="lg" boxShadow="lg">
      <VStack spacing={4}>
        <Heading as="h2" size="lg">{t('login.title')}</Heading>
        
        {error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel htmlFor="username">{t('login.usernameLabel')}</FormLabel>
              <Input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel htmlFor="password">{t('login.passwordLabel')}</FormLabel>
              <Input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </FormControl>
            <Button type="submit" colorScheme="teal" width="full">
              {t('login.button')}
            </Button>
          </VStack>
        </form>
        <Text>
          {t('login.registerPrompt')} <Link to="/register" style={{ color: 'teal' }}>{t('login.registerLink')}</Link>
        </Text>
      </VStack>
    </Box>
  );
}

export default LoginPage;
