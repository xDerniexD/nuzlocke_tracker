import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ChakraProvider, Flex, Spinner, Heading } from '@chakra-ui/react';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RegisterPage from './pages/RegisterPage';
import TrackerPage from './pages/TrackerPage';
import TeambuilderPage from './pages/TeambuilderPage';
import SpectatorPage from './pages/SpectatorPage'; // NEU
import Navbar from './components/Navbar'; 

import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loggedInUserJSON = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (loggedInUserJSON && token) {
      const foundUser = JSON.parse(loggedInUserJSON);
      setUser(foundUser);
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    navigate('/');
  };

  if (loading) {
    return (
      <Flex justify="center" align="center" height="100vh">
        <Spinner size="xl" />
      </Flex>
    );
  }

  return (
    <div className="App">
      <ChakraProvider>
        {user && <Navbar user={user} onLogout={handleLogout} />}
        
        <Routes>
          <Route 
            path="/login" 
            element={user ? <Navigate to="/" /> : <LoginPage onLoginSuccess={handleLoginSuccess} />} 
          />
          
          <Route 
            path="/register" 
            element={user ? <Navigate to="/" /> : <RegisterPage />} 
          />

          {/* NEU: Route für die Zuschauer-Seite */}
          <Route 
            path="/spectate/:spectatorId"
            element={<SpectatorPage />}
          />

          <Route 
            path="/nuzlocke/:id/teambuilder" 
            element={user ? <TeambuilderPage /> : <Navigate to="/login" />}
          />

          <Route 
            path="/nuzlocke/:id/statistics" 
            element={user ? <Heading p={10}>Statistik-Seite (Demnächst)</Heading> : <Navigate to="/login" />}
          />

          <Route 
            path="/nuzlocke/:id" 
            element={user ? <TrackerPage /> : <Navigate to="/login" />}
          />

          <Route 
            path="/" 
            element={user ? <DashboardPage user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />

          <Route 
            path="*"
            element={<Heading as="h2" size="lg" textAlign="center" mt={20}>FEHLER 404: Seite nicht gefunden!</Heading>}
          />
        </Routes>
      </ChakraProvider>
    </div>
  )
}

export default App;