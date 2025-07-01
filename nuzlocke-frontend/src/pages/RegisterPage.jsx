import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
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

function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Das Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }

    try {
      // Sende nur noch 'username' und 'password'
      await axios.post('https://nuzlocke-api.zyndoras.de/api/users/register', {
        username,
        password,
      });

      // Leite den Nutzer zur Login-Seite weiter
      navigate('/login');

    } catch (err) {
      setError(err.response?.data?.message || 'Ein Fehler ist aufgetreten.');
    }
  };

  return (
    <Box maxW="md" mx="auto" mt={10} p={8} borderWidth={1} borderRadius="lg" boxShadow="lg">
      <VStack spacing={4}>
        <Heading as="h2" size="lg">Konto erstellen</Heading>
        
        {error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel htmlFor="username">Benutzername</FormLabel>
              <Input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </FormControl>

            {/* Das E-Mail-Feld wurde entfernt */}

            <FormControl isRequired>
              <FormLabel htmlFor="password">Passwort</FormLabel>
              <Input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </FormControl>

            <Button type="submit" colorScheme="teal" width="full">
              Konto erstellen
            </Button>
          </VStack>
        </form>
        <Text>
          Schon ein Konto? <Link to="/login" style={{ color: 'teal' }}>Hier einloggen</Link>
        </Text>
      </VStack>
    </Box>
  );
}

export default RegisterPage;
