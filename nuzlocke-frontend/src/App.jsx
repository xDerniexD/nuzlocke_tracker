import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';

// Importiere alle deine Seiten-Komponenten und die neue Navbar
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RegisterPage from './pages/RegisterPage';
import TrackerPage from './pages/TrackerPage';
import Navbar from './components/Navbar'; 

import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Die Logik hier bleibt unverändert
  useEffect(() => {
    const loggedInUserJSON = localStorage.getItem('user');
    if (loggedInUserJSON) {
      const foundUser = JSON.parse(loggedInUserJSON);
      setUser(foundUser);
    }
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

  return (
    <div className="App">
      <Navbar />
      <Routes>
        {/* Route für die Login-Seite */}
        <Route 
          path="/login" 
          element={user ? <Navigate to="/" /> : <LoginPage onLoginSuccess={handleLoginSuccess} />} 
        />
        
        {/* Route für die Registrierungs-Seite */}
        <Route 
          path="/register" 
          element={user ? <Navigate to="/" /> : <RegisterPage />} 
        />

        {/* Route für die Tracker-Detailseite */}
        <Route 
          path="/nuzlocke/:id" 
          element={user ? <TrackerPage /> : <Navigate to="/login" />}
        />

        {/* Route für das Dashboard (die Startseite "/") */}
        <Route 
          path="/" 
          element={user ? <DashboardPage user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
        />

        {/* DEBUGGING: "Catch-all"-Route, falls keine andere Route passt */}
        <Route 
          path="*"
          element={<h2 style={{ textAlign: 'center' }}>FEHLER: Keine Route für diesen Pfad gefunden!</h2>}
        />
      </Routes>
    </div>
  )
}

export default App
