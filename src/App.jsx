// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import SupervisorDashboard from './pages/SupervisorDashboard'; // AJOUTÉ
import Moi from './pages/Moi';
import Register from './pages/Register';
import BottomNav from './components/BottomNav';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Fonction pour vérifier l'état de connexion
  const checkAuth = () => {
    const token = localStorage.getItem('cm_token');
    setIsLoggedIn(!!token);
  };

  useEffect(() => {
    // Vérifier au chargement
    checkAuth();

    // Écouter les changements de localStorage
    const handleStorageChange = () => checkAuth();
    window.addEventListener('storage', handleStorageChange);

    // Vérifier toutes les secondes (comme dans BottomNav)
    const interval = setInterval(checkAuth, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  return (
    <Router>
      <div className="relative min-h-screen">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />

          {/* Dashboard - ne pas protéger ici, laissez Dashboard gérer */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Profil - protégé par l'état global */}
          <Route
            path="/profile"
            element={
              isLoggedIn ? <Moi /> : <Navigate to="/dashboard" replace />
            }
          />

          <Route path="/moi" element={<Moi />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/supervisor" element={<SupervisorDashboard />} /> {/* AJOUTÉ */}
          <Route path="/register" element={<Register />} />

          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>

        <BottomNav />
      </div>
    </Router>
  );
}

export default App;
