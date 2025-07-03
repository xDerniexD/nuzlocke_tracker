import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Flex, Spinner } from '@chakra-ui/react'; // Spinner importieren

// Importiere alle deine Seiten-Komponenten und die neue Navbar
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RegisterPage from './pages/RegisterPage';
import TrackerPage from './pages/TrackerPage';
import Navbar from './components/Navbar'; 

import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // NEU: Ladezustand
  const navigate = useNavigate();

  useEffect(() => {
    const loggedInUserJSON = localStorage.getItem('user');
    const token = localStorage.getItem('token'); // Auch den Token prüfen
    if (loggedInUserJSON && token) {
      const foundUser = JSON.parse(loggedInUserJSON);
      setUser(foundUser);
    }
    setLoading(false); // NEU: Ladevorgang abschließen
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

  // NEU: Während der Prüfung wird ein Lade-Spinner angezeigt
  if (loading) {
    return (
      <Flex justify="center" align="center" height="100vh">
        <Spinner size="xl" />
      </Flex>
    );
  }

  return (
    <div className="App">
      {/* Die Navbar wird nur angezeigt, wenn ein User eingeloggt ist */}
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
          element={<h2 style={{ textAlign: 'center' }}>FEHLER: Keine Route für diesen Pfad gefunden!</h2>}
        />
      </Routes>
    </div>
  )
}

export default App