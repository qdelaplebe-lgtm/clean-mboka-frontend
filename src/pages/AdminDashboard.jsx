// pages/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SimpleCommuneMap from '../components/SimpleCommuneMap';

// 🎯 FONCTIONS UTILITAIRES DE NORMALISATION (AJOUT CRITIQUE)
const normalizeString = (str) => {
  if (typeof str !== 'string') return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
};

const compareCommunes = (commune1, commune2) => {
  return normalizeString(commune1) === normalizeString(commune2);
};

const isRoleType = (userRole, targetTypes) => {
  const roleNormalized = normalizeString(userRole || '');
  const targets = Array.isArray(targetTypes) ? targetTypes : [targetTypes];
  
  return targets.some(target => 
    roleNormalized.includes(normalizeString(target))
  );
};

function AdminDashboard() {
  const navigate = useNavigate();

  // --- GESTION DE SESSION ---
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('cm_token') ? true : false;
  });

  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userId, setUserId] = useState('');
  const [userCommune, setUserCommune] = useState('');
  const [token, setToken] = useState(localStorage.getItem('cm_token') || '');
  const [message, setMessage] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);

  // --- DONNÉES ADMIN ---
  const [globalStats, setGlobalStats] = useState(null);
  const [adminDashboardData, setAdminDashboardData] = useState(null);
  const [communeStats, setCommuneStats] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allReports, setAllReports] = useState([]);
  const [selectedCommune, setSelectedCommune] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  // --- NOUVEAUX ÉTATS POUR COORDINATEUR ---
  const [supervisors, setSupervisors] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [agentStats, setAgentStats] = useState({});
  const [agentReports, setAgentReports] = useState({});

  // --- ÉTATS UI ---
  const [activeTab, setActiveTab] = useState('overview');
  const [reportsLoading, setReportsLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  // --- MODALES ---
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [selectedAgentType, setSelectedAgentType] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newZone, setNewZone] = useState({ commune: '', quartier: '' });

  // URL du backend - Dynamique selon l'environnement
  const API_BASE_URL = window.location.hostname === 'localhost'
    ? "http://localhost:8000"
    : "http://51.20.191.156:8000";

  // --- VÉRIFICATION DES PERMISSIONS ---
  const isAdminUser = () => {
    return isRoleType(userRole || localStorage.getItem('cm_user_role') || '', ['administrateur', 'admin']);
  };

  const isCoordinator = () => {
    return isRoleType(userRole || localStorage.getItem('cm_user_role') || '', ['coordinateur', 'coordinator']);
  };

  const isSupervisor = () => {
    return isRoleType(userRole || localStorage.getItem('cm_user_role') || '', ['superviseur', 'supervisor']);
  };

  // COORDINATEUR A LES MÊMES DROITS QUE L'ADMIN
  const hasElevatedPrivileges = () => {
    return isAdminUser() || isCoordinator();
  };

  // --- RÉCUPÉRER LES INFOS UTILISATEUR ---
  const fetchUserInfo = async (userToken) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/me`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });

      if (response.ok) {
        const userData = await response.json();

        let role = '';
        let name = '';
        let id = '';
        let commune = '';

        if (userData.role) {
          role = userData.role;
          name = userData.full_name || userData.name || userData.username || 'Utilisateur';
          id = userData.id || userData.user_id || '';
          commune = userData.commune || '';
        }

        setUserRole(role);
        setUserName(name);
        setUserId(id);
        setUserCommune(commune);

        localStorage.setItem('cm_user_role', role);
        localStorage.setItem('cm_user_name', name);
        localStorage.setItem('cm_user_id', id);
        localStorage.setItem('cm_user_commune', commune);

        // 🎯 CORRECTION CRITIQUE : SYNCHRONISATION AVEC setTimeout
        setTimeout(() => {
          const hasAdminAccess = isAdminUser() || isCoordinator() || isSupervisor();

          if (!hasAdminAccess) {
            setMessage({
              text: "Accès non autorisé. Redirection vers le dashboard principal...",
              type: "error"
            });
            setTimeout(() => navigate('/dashboard'), 2000);
          } else {
            // Charger les données selon les privilèges
            if (hasElevatedPrivileges()) {
              // Admin ET Coordinateur ont les mêmes droits
              fetchGlobalStats(userToken);
              fetchAdminDashboard(userToken);
              fetchAllUsers(userToken);
              fetchAllReports(userToken);

              // Chargement spécifique pour coordinateur (ses subordonnés)
              if (isCoordinator()) {
                console.log(`🔍 [COORD] Chargement agents pour commune: "${commune}"`);
                fetchAgentsForCoordinator(userToken);
              }
            } else if (isSupervisor()) {
              // Superviseur a des permissions limitées
              console.log(`🔍 [SUPERV] Chargement pour commune: "${commune}"`);
              fetchSupervisorUsers(userToken);
              fetchSupervisorReports(userToken);
            }
          }
        }, 50); // Petit délai pour la synchronisation React
      }
    } catch (error) {
      console.error("Erreur récupération infos utilisateur:", error);
    }
  };

  // --- FONCTIONS POUR ADMIN ET COORDINATEUR (MÊMES DROITS) ---
  const fetchGlobalStats = async (userToken) => {
    setStatsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/stats/global`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        setGlobalStats(data);
      }
    } catch (error) {
      console.error("Erreur chargement stats globales:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchAdminDashboard = async (userToken) => {
    setStatsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/admin/dashboard`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAdminDashboardData(data);
      }
    } catch (error) {
      console.error("Erreur chargement dashboard admin:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchAllUsers = async (userToken) => {
    setUsersLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAllUsers(data);
      }
    } catch (error) {
      console.error("Erreur chargement utilisateurs:", error);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchAllReports = async (userToken) => {
    setReportsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/all`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAllReports(data);
      }
    } catch (error) {
      console.error("Erreur chargement signalements:", error);
    } finally {
      setReportsLoading(false);
    }
  };

  // --- FONCTIONS SPÉCIFIQUES POUR COORDINATEUR ---
  const fetchAgentsForCoordinator = async (userToken) => {
    // 🔴 VÉRIFICATION AVANT EXÉCUTION
    if (!userToken || !userCommune) {
      console.warn("❌ [COORD] Données manquantes:", {
        token: !!userToken,
        commune: userCommune,
        type: typeof userCommune
      });
      return;
    }

    try {
      // 🎯 NORMALISATION ROBUSTE
      const normalizedCoordinatorCommune = normalizeString(userCommune);
      console.log(`📍 [COORD] Commune normalisée: "${normalizedCoordinatorCommune}" (brute: "${userCommune}")`);

      // 🚀 UN SEUL APPEL API (optimisation)
      const response = await fetch(`${API_BASE_URL}/api/users/`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const allUsers = await response.json();
      console.log(`👥 [COORD] ${allUsers.length} utilisateurs reçus`);

      // 🎯 FILTRAGE UNIFIÉ AVEC NORMALISATION
      const supervisorsData = [];
      const collectorsData = [];

      allUsers.forEach(user => {
        const userCommuneNormalized = normalizeString(user.commune || '');
        const userRoleNormalized = normalizeString(user.role || '');
        
        const communeMatch = userCommuneNormalized === normalizedCoordinatorCommune;
        
        if (!communeMatch) return; // Ignorer si pas la même commune

        // Détection rôle avec normalisation
        if (isRoleType(userRoleNormalized, ['superviseur', 'supervisor'])) {
          supervisorsData.push(user);
        } else if (isRoleType(userRoleNormalized, ['ramasseur', 'collector'])) {
          collectorsData.push(user);
        }
      });

      console.table({
        'Superviseurs trouvés': supervisorsData.length,
        'Ramasseurs trouvés': collectorsData.length,
        'Commune filtrée': normalizedCoordinatorCommune
      });

      // 🎯 MISE À JOUR ATOMIQUE
      setSupervisors(supervisorsData);
      setCollectors(collectorsData);

    } catch (error) {
      console.error('🔥 [COORD] Erreur fetchAgentsForCoordinator:', error);
      setMessage({
        text: `Erreur chargement agents: ${error.message}`,
        type: "error"
      });
    }
  };

  const fetchAgentStats = async (agentId, agentType, userToken) => {
    try {
      // Récupérer les signalements pour calculer les stats
      const response = await fetch(`${API_BASE_URL}/api/reports/`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });

      if (response.ok) {
        const allReports = await response.json();
        let agentReports = [];

        if (agentType === 'collector') {
          // Pour ramasseur: signalements où il est assigné
          agentReports = allReports.filter(report =>
            report.collector_id === agentId ||
            report.collector?.id === agentId
          );
        } else if (agentType === 'supervisor') {
          // Pour superviseur: signalements de sa commune
          // On récupère d'abord la commune du superviseur
          const userResponse = await fetch(`${API_BASE_URL}/api/users/${agentId}`, {
            headers: { 'Authorization': `Bearer ${userToken}` }
          });

          if (userResponse.ok) {
            const supervisor = await userResponse.json();
            agentReports = allReports.filter(report =>
              compareCommunes(report.user?.commune, supervisor.commune)
            );
          }
        }

        // Calculer les statistiques
        const completed = agentReports.filter(r => r.status === 'COMPLETED').length;
        const inProgress = agentReports.filter(r => r.status === 'IN_PROGRESS').length;
        const pending = agentReports.filter(r => r.status === 'PENDING').length;
        const total = agentReports.length;
        const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        setAgentStats(prev => ({
          ...prev,
          [agentId]: {
            type: agentType,
            completed,
            in_progress: inProgress,
            pending,
            total,
            success_rate: successRate
          }
        }));
      }
    } catch (error) {
      console.error(`Erreur chargement stats agent ${agentId}:`, error);
    }
  };

  const fetchAgentReports = async (agentId, userToken) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });

      if (response.ok) {
        const allReports = await response.json();
        let agentReports = [];

        // Pour le moment, on récupère tous les rapports
        // Vous pouvez ajouter une logique de filtrage ici
        agentReports = allReports.slice(0, 10); // Limiter à 10 rapports pour l'aperçu

        setAgentReports(prev => ({
          ...prev,
          [agentId]: agentReports
        }));
      }
    } catch (error) {
      console.error(`Erreur chargement rapports agent ${agentId}:`, error);
    }
  };

  const viewAgentDashboard = async (agent, type) => {
    setSelectedAgent(agent);
    setSelectedAgentType(type);

    // Charger les statistiques et rapports de l'agent
    await fetchAgentStats(agent.id, type, token);
    await fetchAgentReports(agent.id, token);

    setShowAgentModal(true);
  };

  // --- FONCTIONS SUPERVISEUR (RESTENT LIMITÉES) ---
  const fetchSupervisorUsers = async (userToken) => {
    setUsersLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        
        // 🎯 NORMALISATION DE LA COMMUNE
        const normalizedSupervisorCommune = normalizeString(userCommune || '');
        console.log(`📍 [SUPERV] Filtrage pour commune: "${normalizedSupervisorCommune}" (brute: "${userCommune}")`);

        // Superviseur ne voit que les ramasseurs de sa commune
        const filteredUsers = data.filter(user => {
          const userCommuneNormalized = normalizeString(user.commune || '');
          const userRoleNormalized = normalizeString(user.role || '');
          
          const communeMatch = userCommuneNormalized === normalizedSupervisorCommune;
          const isCollector = isRoleType(userRoleNormalized, ['ramasseur', 'collector']);
          
          return communeMatch && isCollector;
        });

        console.log(`👷 [SUPERV] ${filteredUsers.length} ramasseurs trouvés pour ${userCommune}`);
        setAllUsers(filteredUsers);
      }
    } catch (error) {
      console.error("Erreur chargement utilisateurs superviseur:", error);
      setMessage({
        text: "Erreur chargement des utilisateurs",
        type: "error"
      });
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchSupervisorReports = async (userToken) => {
    setReportsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAllReports(data);
      }
    } catch (error) {
      console.error("Erreur chargement signalements:", error);
    } finally {
      setReportsLoading(false);
    }
  };

  // --- GESTION DES UTILISATEURS ---
  const handleUpdateRole = async () => {
    if (!selectedUser || !newRole) {
      setMessage({ text: "Veuillez sélectionner un rôle", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${selectedUser.id}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });

      if (response.ok) {
        setMessage({ text: "Rôle mis à jour avec succès", type: "success" });

        // Recharger les utilisateurs selon le rôle
        if (hasElevatedPrivileges()) {
          fetchAllUsers(token);
          if (isCoordinator()) {
            fetchAgentsForCoordinator(token);
          }
        } else if (isSupervisor()) {
          fetchSupervisorUsers(token);
        }

        setShowRoleModal(false);
        setSelectedUser(null);
        setNewRole('');
      } else {
        const errorData = await response.json();
        setMessage({ text: errorData.detail || "Erreur de mise à jour", type: "error" });
      }
    } catch (error) {
      setMessage({ text: "Erreur réseau", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateZone = async () => {
    if (!selectedUser || !newZone.commune) {
      setMessage({ text: "Veuillez remplir la commune", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${selectedUser.id}/zone`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newZone)
      });

      if (response.ok) {
        setMessage({ text: "Zone mise à jour avec succès", type: "success" });

        // Recharger les utilisateurs
        if (hasElevatedPrivileges()) {
          fetchAllUsers(token);
          if (isCoordinator()) {
            fetchAgentsForCoordinator(token);
          }
        } else if (isSupervisor()) {
          fetchSupervisorUsers(token);
        }

        setShowZoneModal(false);
        setSelectedUser(null);
        setNewZone({ commune: '', quartier: '' });
      } else {
        const errorData = await response.json();
        setMessage({ text: errorData.detail || "Erreur de mise à jour", type: "error" });
      }
    } catch (error) {
      setMessage({ text: "Erreur réseau", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (userId, isActive) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: isActive })
      });

      if (response.ok) {
        setMessage({
          text: `Utilisateur ${isActive ? 'activé' : 'désactivé'} avec succès`,
          type: "success"
        });

        // Recharger les utilisateurs
        if (hasElevatedPrivileges()) {
          fetchAllUsers(token);
          if (isCoordinator()) {
            fetchAgentsForCoordinator(token);
          }
        } else if (isSupervisor()) {
          fetchSupervisorUsers(token);
        }
      } else {
        const errorData = await response.json();
        setMessage({ text: errorData.detail || "Erreur de mise à jour", type: "error" });
      }
    } catch (error) {
      setMessage({ text: "Erreur réseau", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // --- GESTION DÉCONNEXION ---
  const handleLogout = () => {
    localStorage.removeItem('cm_token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('cm_user_role');
    localStorage.removeItem('cm_user_name');
    localStorage.removeItem('cm_user_id');
    localStorage.removeItem('cm_user_commune');
    setIsLoggedIn(false);
    setToken("");
    setUserRole("");
    setUserName("");
    setUserId("");
    setUserCommune("");
    setMessage({ text: "Déconnexion réussie.", type: "info" });
    navigate('/home');
  };

  // --- FORMATAGE ---
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString || 'Date inconnue';
    }
  };

  const getRoleLabel = (role) => {
    const roleMap = {
      'citoyen': 'Citoyen',
      'ramasseur': 'Ramasseur',
      'superviseur': 'Superviseur',
      'coordinateur': 'Coordinateur',
      'administrateur': 'Administrateur',
      'citizen': 'Citoyen',
      'collector': 'Ramasseur',
      'supervisor': 'Superviseur',
      'coordinator': 'Coordinateur',
      'admin': 'Administrateur'
    };

    const normalizedRole = normalizeString(role);
    return roleMap[normalizedRole] || role || 'Inconnu';
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'PENDING': return 'EN ATTENTE';
      case 'IN_PROGRESS': return 'EN COURS';
      case 'COMPLETED': return 'TERMINÉ';
      default: return status || 'INCONNU';
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'PENDING': return 'bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-800 border border-amber-300/40 shadow-[inset_0_1px_2px rgba(245,158,11,0.2)]';
      case 'IN_PROGRESS': return 'bg-gradient-to-r from-golden-brown-500/20 to-golden-brown-600/20 text-golden-brown-800 border border-golden-brown-300/40 shadow-[inset_0_1px_2px rgba(193,154,107,0.2)]';
      case 'COMPLETED': return 'bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 text-emerald-800 border border-emerald-300/40 shadow-[inset_0_1px_2px rgba(16,185,129,0.2)]';
      default: return 'bg-gradient-to-br from-warm-gray-500/20 to-warm-gray-600/20 text-warm-gray-800 border border-warm-gray-300/40 shadow-[inset_0_1px_2px rgba(120,113,108,0.1)]';
    }
  };

  // --- HOOKS DEBUG (AJOUT CRITIQUE) ---
  useEffect(() => {
    console.group('🕵️‍♂️ ADMIN DASHBOARD DEBUG');
    console.log('userCommune:', `"${userCommune}"`);
    console.log('userCommune (normalisé):', normalizeString(userCommune));
    console.log('userRole:', userRole);
    console.log('isAdminUser:', isAdminUser());
    console.log('isCoordinator:', isCoordinator());
    console.log('isSupervisor:', isSupervisor());
    console.log('hasElevatedPrivileges:', hasElevatedPrivileges());
    console.log('Token présent:', !!token);
    console.groupEnd();
  }, [userCommune, userRole, token]);

  // 🎯 EFFET SPÉCIFIQUE POUR LA COMMUNE
  useEffect(() => {
    if (userCommune) {
      console.log(`🏙️  Commune détectée: "${userCommune}"`);
      console.log(`🏙️  Normalisée: "${normalizeString(userCommune)}"`);
      
      // Recharger les données si nécessaire
      if (token && userCommune) {
        if (isCoordinator()) {
          console.log('🔄 Rechargement des agents coordinateur...');
          fetchAgentsForCoordinator(token);
        } else if (isSupervisor()) {
          console.log('🔄 Rechargement des ramasseurs superviseur...');
          fetchSupervisorUsers(token);
        }
      }
    }
  }, [userCommune]);

  // --- INITIALISATION ---
  useEffect(() => {
    if (!isLoggedIn) {
      const savedToken = localStorage.getItem('cm_token');
      if (savedToken) {
        setToken(savedToken);
        fetchUserInfo(savedToken);
        setIsLoggedIn(true);
      } else {
        navigate('/dashboard');
      }
    } else if (token) {
      fetchUserInfo(token);
    }
  }, [isLoggedIn, token]);

  // Vérifier l'accès
  useEffect(() => {
    if (userRole && !isAdminUser() && !isCoordinator() && !isSupervisor()) {
      navigate('/dashboard');
    }
  }, [userRole]);

  // --- RENDU SI NON CONNECTÉ ---
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-golden-brown-50 via-golden-brown-100/30 to-golden-brown-200/20 flex items-center justify-center p-6 font-sans text-warm-gray-800 relative overflow-hidden">
        <div className="text-center">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center mx-auto mb-6 shadow-lg border border-golden-brown-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_6px_20px rgba(193,154,107,0.25)]">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)]">
              <span className="text-4xl font-bold text-golden-brown-700">🔒</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-warm-gray-800 mb-4">Accès administrateur requis</h2>
          <p className="text-warm-gray-600 mb-8">Veuillez vous connecter pour accéder au panel d'administration</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-8 py-4 rounded-2xl bg-gradient-to-br from-golden-brown-600 to-amber-600 text-white font-bold hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex items-center gap-3 mx-auto border border-golden-brown-700/60 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_2px_8px rgba(193,154,107,0.2)]"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px rgba(255,255,255,0.5)]">
              <span className="text-lg font-bold text-golden-brown-700">←</span>
            </div>
            <span>Retour au dashboard</span>
          </button>
        </div>
      </div>
    );
  }

  // === COMPOSANTS RÉUTILISABLES ===

  const AgentCard = ({ agent, type, stats }) => (
    <div className="bg-gradient-to-br from-white to-warm-gray-50/30 rounded-2xl p-6 border border-warm-gray-400/25 shadow-[inset_0_1px_3px rgba(120,113,108,0.1),0_3px_10px rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center border border-golden-brown-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_4px_12px rgba(193,154,107,0.25)]">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)]">
            <span className="text-xl font-bold text-golden-brown-700">
              {type === 'supervisor' ? '👁️' : '👷'}
            </span>
          </div>
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-warm-gray-800 text-lg">{agent.full_name}</h4>
          <p className="text-sm text-warm-gray-600">{agent.email}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2 py-1 rounded-full bg-gradient-to-br from-white to-warm-gray-100 border border-warm-gray-400/30">
              {agent.commune}
            </span>
            {agent.quartier && (
              <span className="text-xs px-2 py-1 rounded-full bg-gradient-to-br from-white to-blue-100 border border-blue-400/30 text-blue-700">
                {agent.quartier}
              </span>
            )}
          </div>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="text-center p-3 rounded-xl bg-gradient-to-br from-white to-emerald-100/30 border border-emerald-400/30">
            <p className="text-xs font-bold text-emerald-600">Missions</p>
            <p className="text-xl font-bold text-emerald-700">{stats.completed || 0}</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-gradient-to-br from-white to-golden-brown-100/30 border border-golden-brown-400/30">
            <p className="text-xs font-bold text-golden-brown-600">Taux</p>
            <p className="text-xl font-bold text-golden-brown-700">{stats.success_rate || 0}%</p>
          </div>
        </div>
      )}

      <button
        onClick={() => viewAgentDashboard(agent, type)}
        className="w-full py-3 rounded-xl bg-gradient-to-br from-golden-brown-600 to-amber-600 text-white font-bold hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex items-center justify-center gap-2 border border-golden-brown-700/60 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_2px_8px rgba(193,154,107,0.2)]"
      >
        <span>Voir Dashboard</span>
        <span className="text-lg">→</span>
      </button>
    </div>
  );

  const AgentOverviewModal = ({ agent, type, stats, reports, onClose }) => {
    if (!agent) return null;

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-gradient-to-br from-white to-warm-gray-50/30 rounded-3xl p-8 max-w-4xl w-full mx-auto my-8 shadow-2xl border border-golden-brown-400/40 shadow-[inset_0_2px_5px rgba(255,255,255,0.3),0_8px_30px rgba(193,154,107,0.2)] max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center border border-golden-brown-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_4px_12px rgba(193,154,107,0.25)]">
                <div className="w-18 h-18 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)]">
                  <span className="text-3xl font-bold text-golden-brown-700">
                    {type === 'supervisor' ? '👁️' : '👷'}
                  </span>
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-warm-gray-800">
                  Dashboard {type === 'supervisor' ? 'Superviseur' : 'Ramasseur'}
                </h3>
                <p className="text-warm-gray-600">{agent.full_name} • {agent.commune}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)] hover:bg-gradient-to-br hover:from-golden-brown-100 hover:to-golden-brown-200 transition-all duration-300"
            >
              <span className="text-xl font-bold text-golden-brown-700">✕</span>
            </button>
          </div>

          {/* Informations de base */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-white to-golden-brown-100/30 rounded-2xl p-6 border border-golden-brown-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]">
              <p className="text-xs font-bold text-golden-brown-600 uppercase tracking-wider mb-2">�  Contact</p>
              <p className="font-medium text-warm-gray-800">{agent.email}</p>
              {agent.phone && <p className="text-sm text-warm-gray-600 mt-1">{agent.phone}</p>}
            </div>

            <div className="bg-gradient-to-br from-white to-warm-gray-100/30 rounded-2xl p-6 border border-warm-gray-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]">
              <p className="text-xs font-bold text-warm-gray-600 uppercase tracking-wider mb-2">📍 Zone</p>
              <p className="font-medium text-warm-gray-800">{agent.commune}</p>
              {agent.quartier && <p className="text-sm text-warm-gray-600 mt-1">Quartier: {agent.quartier}</p>}
            </div>

            <div className="bg-gradient-to-br from-white to-emerald-100/30 rounded-2xl p-6 border border-emerald-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]">
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">📅 Inscription</p>
              <p className="font-medium text-warm-gray-800">{formatDate(agent.created_at)}</p>
              <p className="text-sm text-warm-gray-600 mt-1">
                {agent.is_active ? '✅ Actif' : '⛔ Inactif'}
              </p>
            </div>
          </div>

          {/* Statistiques */}
          {stats && (
            <div className="mb-8">
              <h4 className="text-lg font-bold text-warm-gray-800 mb-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-golden-brown-600/20 to-amber-600/20 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.3)]">
                  <span className="text-sm font-bold text-golden-brown-600">📊</span>
                </div>
                Statistiques de Performance
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-white to-emerald-100/30 rounded-2xl p-6 text-center border border-emerald-400/30">
                  <p className="text-xs font-bold text-emerald-600">Complétées</p>
                  <p className="text-3xl font-bold text-emerald-700">{stats.completed || 0}</p>
                </div>
                <div className="bg-gradient-to-br from-white to-amber-100/30 rounded-2xl p-6 text-center border border-amber-400/30">
                  <p className="text-xs font-bold text-amber-600">En cours</p>
                  <p className="text-3xl font-bold text-amber-700">{stats.in_progress || 0}</p>
                </div>
                <div className="bg-gradient-to-br from-white to-golden-brown-100/30 rounded-2xl p-6 text-center border border-golden-brown-400/30">
                  <p className="text-xs font-bold text-golden-brown-600">Taux réussite</p>
                  <p className="text-3xl font-bold text-golden-brown-700">{stats.success_rate || 0}%</p>
                </div>
                <div className="bg-gradient-to-br from-white to-blue-100/30 rounded-2xl p-6 text-center border border-blue-400/30">
                  <p className="text-xs font-bold text-blue-600">Total missions</p>
                  <p className="text-3xl font-bold text-blue-700">{stats.total || 0}</p>
                </div>
              </div>
            </div>
          )}

          {/* Activités récentes */}
          {reports && reports.length > 0 && (
            <div>
              <h4 className="text-lg font-bold text-warm-gray-800 mb-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-golden-brown-600/20 to-amber-600/20 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.3)]">
                  <span className="text-sm font-bold text-golden-brown-600">📋</span>
                </div>
                Activités Récentes
              </h4>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {reports.slice(0, 5).map(report => (
                  <div key={report.id} className="bg-gradient-to-br from-white to-warm-gray-100/30 rounded-xl p-4 border border-warm-gray-400/25">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${getStatusColor(report.status)}`}>
                        {getStatusText(report.status)}
                      </span>
                      <span className="text-xs text-warm-gray-500">{formatDate(report.created_at)}</span>
                    </div>
                    <p className="text-sm text-warm-gray-800 truncate">
                      {report.description || 'Pas de description'}
                    </p>
                    <p className="text-xs text-warm-gray-600 mt-1">
                      Commune: {report.user?.commune || 'Inconnue'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-warm-gray-300/30">
            <button
              onClick={onClose}
              className="w-full py-4 rounded-2xl bg-gradient-to-br from-golden-brown-600 to-amber-600 text-white font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 flex items-center justify-center gap-3 border border-golden-brown-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_4px_12px rgba(193,154,107,0.25)]"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px rgba(255,255,255,0.5)]">
                <span className="text-xl font-bold text-golden-brown-700">←</span>
              </div>
              <span>Retour au tableau de bord</span>
            </button>
          </div>
        </div>
      </div>
    );
  };  // === DASHBOARD ADMIN STYLÉ ===
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-golden-brown-50 via-amber-50/30 to-golden-brown-200/20 flex flex-col md:flex-row overflow-hidden font-sans text-warm-gray-800 relative">
      {/* Arrière-plan décoratif */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-1/3 h-1/3 bg-gradient-to-br from-golden-brown-200/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-1/3 h-1/3 bg-gradient-to-br from-amber-200/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1/2 h-1/2 bg-gradient-to-br from-amber-100/10 to-transparent rounded-full blur-3xl"></div>

        {/* Pattern subtil */}
        <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(circle_at_2px_2px,rgba(193,154,107,0.4)_1px,transparent_1px)] bg-[length:60px_60px]"></div>
      </div>

      {/* 🐛 PANEL DEBUG TEMPORAIRE (AJOUT CRITIQUE) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 bg-black/90 text-white p-3 rounded-xl z-50 border border-red-500/50 shadow-2xl max-w-xs text-xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center">
              <span className="text-xs font-bold">🐛</span>
            </div>
            <h4 className="font-bold text-red-300">DEBUG ADMIN</h4>
          </div>
          <div className="space-y-1">
            <div><span className="text-emerald-400">Commune:</span> "{userCommune}"</div>
            <div><span className="text-emerald-400">Normalisé:</span> "{normalizeString(userCommune)}"</div>
            <div><span className="text-emerald-400">Rôle:</span> {userRole}</div>
            <div><span className="text-emerald-400">Superviseurs:</span> {supervisors.length}</div>
            <div><span className="text-emerald-400">Ramasseurs:</span> {collectors.length}</div>
            <div><span className="text-emerald-400">Tab:</span> {activeTab}</div>
          </div>
          <button
            onClick={() => {
              console.log("=== FORCE DEBUG ADMIN ===");
              console.log("État:", { userRole, userCommune });
              console.log("LocalStorage:", {
                role: localStorage.getItem('cm_user_role'),
                commune: localStorage.getItem('cm_user_commune')
              });
              
              if (token) {
                if (isCoordinator()) {
                  fetchAgentsForCoordinator(token);
                } else if (isSupervisor()) {
                  fetchSupervisorUsers(token);
                }
              }
            }}
            className="mt-2 w-full py-1 rounded bg-gradient-to-r from-red-600 to-amber-700 text-white text-xs font-bold hover:opacity-90"
          >
            FORCE DEBUG
          </button>
        </div>
      )}

      {/* SIDEBAR STYLÉ */}
      <div className="w-full md:w-80 lg:w-96 bg-gradient-to-b from-white via-white to-golden-brown-50/30 p-8 flex flex-col justify-between shadow-xl z-20 h-auto md:h-full relative overflow-hidden border-r border-golden-brown-300/30 shadow-[inset_-1px_0_3px rgba(193,154,107,0.15)]">
        {/* Effet de profondeur */}
        <div className="absolute inset-0 bg-gradient-to-br from-golden-brown-600/5 via-transparent to-amber-600/5"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-golden-brown-600/10 to-transparent rounded-full -translate-y-16 translate-x-16"></div>

        <div className="relative z-10">
          {/* Carte utilisateur stylée */}
          <div className="bg-gradient-to-br from-white to-warm-gray-50/30 rounded-3xl p-8 relative overflow-hidden border border-golden-brown-300/30 shadow-[inset_0_1px_4px rgba(193,154,107,0.2),0_6px_20px rgba(0,0,0,0.08)]">
            {/* Effet décoratif */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-golden-brown-600/10 to-transparent rounded-full -translate-y-6 translate-x-6"></div>

            <div className="flex items-center gap-6 mb-8">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-golden-brown-600 to-amber-600 shadow-lg flex items-center justify-center border border-golden-brown-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_6px_20px rgba(193,154,107,0.25)]">
                  <div className="w-22 h-22 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center overflow-hidden border border-white/80 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)]">
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-golden-brown-100 to-amber-100 flex items-center justify-center">
                      <span className="text-3xl font-bold text-golden-brown-700">
                        {userName?.charAt(0).toUpperCase() || (isAdminUser() ? '👑' : isCoordinator() ? '🎯' : '👁️')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-warm-gray-800 text-xl truncate">
                  {userName || (isAdminUser() ? 'Administrateur' : isCoordinator() ? 'Coordinateur' : 'Superviseur')}
                </h2>
                <div className="flex items-center gap-3 mt-3">
                  <div className={`px-4 py-2 rounded-full text-sm font-bold border shadow-[inset_0_1px_2px rgba(255,255,255,0.5),0_2px_6px rgba(193,154,107,0.15)] ${
                    isAdminUser()
                      ? 'border-golden-brown-400/40 bg-gradient-to-br from-white to-golden-brown-100 text-golden-brown-700'
                      : isCoordinator()
                      ? 'border-blue-400/40 bg-gradient-to-br from-white to-blue-100 text-blue-700'
                      : 'border-emerald-400/40 bg-gradient-to-br from-white to-emerald-100 text-emerald-700'
                  }`}>
                    {getRoleLabel(userRole)}
                  </div>
                  {userCommune && (
                    <div className="px-3 py-1.5 bg-gradient-to-br from-white to-warm-gray-100 rounded-full text-xs font-medium text-warm-gray-600 border border-warm-gray-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.4)]">
                      {userCommune}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Informations utilisateur */}
            <div className="space-y-5">
              {/* Bouton retour dashboard */}
              <div className="bg-gradient-to-r from-golden-brown-50/50 to-golden-brown-100/30 rounded-2xl p-4 border border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.4),0_1px_6px rgba(0,0,0,0.04)]">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-white to-warm-gray-100 text-warm-gray-700 hover:bg-gradient-to-br hover:from-golden-brown-100 hover:to-golden-brown-200 transition-all duration-300 border border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.4),0_1px_6px rgba(0,0,0,0.04)]"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-golden-brown-100 to-golden-brown-200 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.4)]">
                    <span className="text-xl font-bold text-golden-brown-700">←</span>
                  </div>
                  <div className="text-left flex-1">
                    <span className="font-bold block">Retour au Dashboard</span>
                    <span className="text-xs text-warm-gray-600">Interface principale</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Navigation stylée */}
          <div className="my-10">
            <h3 className="text-xs font-bold text-warm-gray-500 uppercase tracking-widest mb-6 flex items-center gap-3">
              <div className="w-10 h-1.5 bg-gradient-to-r from-golden-brown-600 to-amber-600 rounded-full"></div>
              Panel d'Administration
            </h3>

            <div className="space-y-3">
              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center gap-5 p-5 rounded-2xl transition-all duration-300 group border border-golden-brown-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)] ${
                  activeTab === 'overview'
                    ? 'bg-gradient-to-br from-golden-brown-600 to-amber-600 text-white shadow-2xl border-golden-brown-700/60 shadow-[inset_0_2px_5px rgba(255,255,255,0.4),0_6px_24px rgba(193,154,107,0.3)] transform scale-[1.02]'
                    : 'bg-gradient-to-br from-white to-warm-gray-100 hover:bg-gradient-to-br hover:from-golden-brown-100 hover:to-golden-brown-200 hover:shadow-xl'
                }`}
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center border ${
                  activeTab === 'overview'
                    ? 'border-white/50 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)] bg-gradient-to-br from-white to-warm-gray-100'
                    : 'border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.4)] bg-gradient-to-br from-golden-brown-100 to-golden-brown-200'
                }`}>
                  <span className={`text-2xl font-bold ${
                    activeTab === 'overview' ? 'text-golden-brown-700' : 'text-warm-gray-700'
                  }`}>
                    📊
                  </span>
                </div>
                <div className="text-left flex-1">
                  <span className={`font-bold block transition-all duration-300 ${
                    activeTab === 'overview' ? 'text-white' : 'text-warm-gray-800 group-hover:text-golden-brown-700'
                  }`}>
                    Vue d'ensemble
                  </span>
                  <span className={`text-xs transition-all duration-300 ${
                    activeTab === 'overview' ? 'text-amber-200' : 'text-warm-gray-600 group-hover:text-warm-gray-700'
                  }`}>
                    {isCoordinator() ? 'Superviseurs & Ramasseurs' : 'Statistiques et KPI'}
                  </span>
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveTab('users');
                  if (hasElevatedPrivileges()) {
                    fetchAllUsers(token);
                  } else if (isSupervisor()) {
                    fetchSupervisorUsers(token);
                  }
                }}
                className={`w-full flex items-center gap-5 p-5 rounded-2xl transition-all duration-300 group border border-golden-brown-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)] ${
                  activeTab === 'users'
                    ? 'bg-gradient-to-br from-golden-brown-600 to-amber-600 text-white shadow-2xl border-golden-brown-700/60 shadow-[inset_0_2px_5px rgba(255,255,255,0.4),0_6px_24px rgba(193,154,107,0.3)] transform scale-[1.02]'
                    : 'bg-gradient-to-br from-white to-warm-gray-100 hover:bg-gradient-to-br hover:from-golden-brown-100 hover:to-golden-brown-200 hover:shadow-xl'
                }`}
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center border ${
                  activeTab === 'users'
                    ? 'border-white/50 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)] bg-gradient-to-br from-white to-warm-gray-100'
                    : 'border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.4)] bg-gradient-to-br from-golden-brown-100 to-golden-brown-200'
                }`}>
                  <span className={`text-2xl font-bold ${
                    activeTab === 'users' ? 'text-golden-brown-700' : 'text-warm-gray-700'
                  }`}>
                    👥
                  </span>
                </div>
                <div className="text-left flex-1">
                  <span className={`font-bold block transition-all duration-300 ${
                    activeTab === 'users' ? 'text-white' : 'text-warm-gray-800 group-hover:text-golden-brown-700'
                  }`}>
                    Gestion des Utilisateurs
                  </span>
                  <span className={`text-xs transition-all duration-300 ${
                    activeTab === 'users' ? 'text-amber-200' : 'text-warm-gray-600 group-hover:text-warm-gray-700'
                  }`}>
                    {hasElevatedPrivileges() ? 'Tous les utilisateurs' : 'Ramasseurs de ma commune'}
                  </span>
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveTab('reports');
                  if (hasElevatedPrivileges()) {
                    fetchAllReports(token);
                  } else if (isSupervisor()) {
                    fetchSupervisorReports(token);
                  }
                }}
                className={`w-full flex items-center gap-5 p-5 rounded-2xl transition-all duration-300 group border border-golden-brown-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)] ${
                  activeTab === 'reports'
                    ? 'bg-gradient-to-br from-golden-brown-600 to-amber-600 text-white shadow-2xl border-golden-brown-700/60 shadow-[inset_0_2px_5px rgba(255,255,255,0.4),0_6px_24px rgba(193,154,107,0.3)] transform scale-[1.02]'
                    : 'bg-gradient-to-br from-white to-warm-gray-100 hover:bg-gradient-to-br hover:from-golden-brown-100 hover:to-golden-brown-200 hover:shadow-xl'
                }`}
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center border ${
                  activeTab === 'reports'
                    ? 'border-white/50 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)] bg-gradient-to-br from-white to-warm-gray-100'
                    : 'border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.4)] bg-gradient-to-br from-golden-brown-100 to-golden-brown-200'
                }`}>
                  <span className={`text-2xl font-bold ${
                    activeTab === 'reports' ? 'text-golden-brown-700' : 'text-warm-gray-700'
                  }`}>
                    📋
                  </span>
                </div>
                <div className="text-left flex-1">
                  <span className={`font-bold block transition-all duration-300 ${
                    activeTab === 'reports' ? 'text-white' : 'text-warm-gray-800 group-hover:text-golden-brown-700'
                  }`}>
                    Signalements
                  </span>
                  <span className={`text-xs transition-all duration-300 ${
                    activeTab === 'reports' ? 'text-amber-200' : 'text-warm-gray-600 group-hover:text-warm-gray-700'
                  }`}>
                    {hasElevatedPrivileges() ? 'Tous les signalements' : 'Signalements de ma commune'}
                  </span>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('map')}
                className={`w-full flex items-center gap-5 p-5 rounded-2xl transition-all duration-300 group border border-golden-brown-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)] ${
                  activeTab === 'map'
                    ? 'bg-gradient-to-br from-golden-brown-600 to-amber-600 text-white shadow-2xl border-golden-brown-700/60 shadow-[inset_0_2px_5px rgba(255,255,255,0.4),0_6px_24px rgba(193,154,107,0.3)] transform scale-[1.02]'
                    : 'bg-gradient-to-br from-white to-warm-gray-100 hover:bg-gradient-to-br hover:from-golden-brown-100 hover:to-golden-brown-200 hover:shadow-xl'
                }`}
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center border ${
                  activeTab === 'map'
                    ? 'border-white/50 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)] bg-gradient-to-br from-white to-warm-gray-100'
                    : 'border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.4)] bg-gradient-to-br from-golden-brown-100 to-golden-brown-200'
                }`}>
                  <span className={`text-2xl font-bold ${
                    activeTab === 'map' ? 'text-golden-brown-700' : 'text-warm-gray-700'
                  }`}>
                    🗺️
                  </span>
                </div>
                <div className="text-left flex-1">
                  <span className={`font-bold block transition-all duration-300 ${
                    activeTab === 'map' ? 'text-white' : 'text-warm-gray-800 group-hover:text-golden-brown-700'
                  }`}>
                    Carte Interactive
                  </span>
                  <span className={`text-xs transition-all duration-300 ${
                    activeTab === 'map' ? 'text-amber-200' : 'text-warm-gray-600 group-hover:text-warm-gray-700'
                  }`}>
                    Visualisation géographique
                  </span>
                </div>
              </button>

              {/* Analytics Avancés - Maintenant accessible aux Admin ET Coordinateur */}
              {(isAdminUser() || isCoordinator()) && (
                <button
                  onClick={() => {
                    setActiveTab('analytics');
                    fetchGlobalStats(token);
                    fetchAdminDashboard(token);
                  }}
                  className={`w-full flex items-center gap-5 p-5 rounded-2xl transition-all duration-300 group border border-golden-brown-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)] ${
                    activeTab === 'analytics'
                      ? 'bg-gradient-to-br from-golden-brown-600 to-amber-600 text-white shadow-2xl border-golden-brown-700/60 shadow-[inset_0_2px_5px rgba(255,255,255,0.4),0_6px_24px rgba(193,154,107,0.3)] transform scale-[1.02]'
                      : 'bg-gradient-to-br from-white to-warm-gray-100 hover:bg-gradient-to-br hover:from-golden-brown-100 hover:to-golden-brown-200 hover:shadow-xl'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center border ${
                    activeTab === 'analytics'
                      ? 'border-white/50 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)] bg-gradient-to-br from-white to-warm-gray-100'
                      : 'border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.4)] bg-gradient-to-br from-golden-brown-100 to-golden-brown-200'
                  }`}>
                    <span className={`text-2xl font-bold ${
                      activeTab === 'analytics' ? 'text-golden-brown-700' : 'text-warm-gray-700'
                    }`}>
                      📈
                    </span>
                  </div>
                  <div className="text-left flex-1">
                    <span className={`font-bold block transition-all duration-300 ${
                      activeTab === 'analytics' ? 'text-white' : 'text-warm-gray-800 group-hover:text-golden-brown-700'
                    }`}>
                      Analytics Avancés
                    </span>
                    <span className={`text-xs transition-all duration-300 ${
                      activeTab === 'analytics' ? 'text-amber-200' : 'text-warm-gray-600 group-hover:text-warm-gray-700'
                    }`}>
                      Statistiques détaillées
                    </span>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Informations du rôle */}
          <div className="bg-gradient-to-br from-white to-warm-gray-50/30 rounded-2xl p-6 border border-warm-gray-400/25 shadow-[inset_0_1px_3px rgba(120,113,108,0.1),0_3px_10px rgba(0,0,0,0.05)]">
            <h4 className="text-sm font-bold text-warm-gray-600 mb-4 flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center border shadow-[inset_0_1px_2px rgba(255,255,255,0.3)] ${
                isAdminUser()
                  ? 'border-golden-brown-400/30 bg-gradient-to-br from-golden-brown-600/20 to-amber-600/20'
                  : isCoordinator()
                  ? 'border-blue-400/30 bg-gradient-to-br from-blue-600/20 to-blue-700/20'
                  : 'border-emerald-400/30 bg-gradient-to-br from-emerald-600/20 to-emerald-700/20'
              }`}>
                <span className={`text-xs font-bold ${
                  isAdminUser() ? 'text-golden-brown-600' :
                  isCoordinator() ? 'text-blue-600' :
                  'text-emerald-600'
                }`}>
                  {isAdminUser() ? '👑' : isCoordinator() ? '🎯' : '👁️'}
                </span>
              </div>
              Permissions
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-warm-gray-600">Vue des utilisateurs</span>
                <span className="text-xs font-bold text-golden-brown-700">
                  {hasElevatedPrivileges() ? 'Tous' : 'Ramasseurs seulement'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-warm-gray-600">Vue des signalements</span>
                <span className="text-xs font-bold text-golden-brown-700">
                  {hasElevatedPrivileges() ? 'Tous' : 'Ma commune'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-warm-gray-600">Modification rôles</span>
                <span className="text-xs font-bold text-golden-brown-700">
                  {hasElevatedPrivileges() ? 'Oui' : 'Non'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-warm-gray-600">Analytics avancés</span>
                <span className="text-xs font-bold text-golden-brown-700">
                  {hasElevatedPrivileges() ? 'Oui' : 'Non'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Déconnexion stylée */}
        <div className="relative z-10 pt-8 border-t border-golden-brown-400/30">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-5 p-5 rounded-2xl bg-gradient-to-br from-white to-warm-gray-100 border border-warm-gray-400/30 text-warm-gray-700 hover:bg-gradient-to-br hover:from-red-100 hover:to-red-200/50 hover:border-red-400/40 hover:text-red-700 font-semibold transition-all duration-300 group shadow-sm hover:shadow-xl shadow-[inset_0_1px_2px rgba(255,255,255,0.4),0_2px_8px rgba(0,0,0,0.04)]"
          >
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-warm-gray-100 to-warm-gray-200 flex items-center justify-center group-hover:bg-gradient-to-br group-hover:from-red-100 group-hover:to-red-200 transition-all duration-300 border border-warm-gray-400/30 group-hover:border-red-400/40 shadow-[inset_0_1px_2px rgba(255,255,255,0.4)]">
              <span className="text-2xl font-bold group-hover:text-red-600 transition-colors duration-300">🚪</span>
            </div>
            <span className="flex-1 text-left font-bold">Déconnexion</span>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transform group-hover:translate-x-1 transition-all duration-300 border border-white/70">
              <span className="text-lg font-bold text-red-600">→</span>
            </div>
          </button>

          <div className="mt-8 text-center">
            <div className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-golden-brown-400/30 to-transparent mb-4"></div>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 border shadow-[inset_0_1px_2px rgba(255,255,255,0.3)] ${
              isAdminUser()
                ? 'border-golden-brown-400/30 bg-gradient-to-br from-golden-brown-600/20 to-amber-600/20'
                : isCoordinator()
                ? 'border-blue-400/30 bg-gradient-to-br from-blue-600/20 to-blue-700/20'
                : 'border-emerald-400/30 bg-gradient-to-br from-emerald-600/20 to-emerald-700/20'
            }`}>
              <span className={`text-sm font-bold ${
                isAdminUser() ? 'text-golden-brown-600' :
                isCoordinator() ? 'text-blue-600' :
                'text-emerald-600'
              }`}>©</span>
            </div>
            <p className="text-xs text-warm-gray-500 font-medium">
              Panel Admin v2.0 • Kinshasa 2024
            </p>
            <p className="text-xs text-warm-gray-500 mt-1">
              Service Municipal de Propreté Urbaine
            </p>
          </div>
        </div>
      </div>

      {/* CONTENU PRINCIPAL STYLÉ */}
      <div className="flex-1 p-6 md:p-8 lg:p-10 overflow-y-auto h-full relative">
        {/* Header avec design moderne */}
        <div className="mb-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
            <div className="relative">
              {/* Élément décoratif */}
              <div className="absolute -inset-4 bg-gradient-to-r from-golden-brown-600/5 to-amber-600/5 rounded-3xl blur-xl"></div>
              <div className="relative">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center shadow-lg border border-golden-brown-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_4px_12px rgba(193,154,107,0.25)]">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)]">
                      <span className="text-2xl font-bold text-golden-brown-700">
                        {activeTab === 'overview' ? '📊' :
                         activeTab === 'users' ? '👥' :
                         activeTab === 'reports' ? '📋' :
                         activeTab === 'map' ? '🗺️' :
                         '📈'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-3xl lg:text-4xl font-bold text-warm-gray-800">
                      {activeTab === 'overview' ? (isCoordinator() ? 'Tableau de Bord Coordinateur' : 'Vue d\'ensemble') :
                       activeTab === 'users' ? 'Gestion des Utilisateurs' :
                       activeTab === 'reports' ? 'Signalements' :
                       activeTab === 'map' ? 'Carte Interactive' :
                       'Analytics Avancés'}
                    </h2>
                    <div className="w-24 h-1.5 bg-gradient-to-r from-golden-brown-600 to-amber-600 rounded-full mt-2"></div>
                  </div>
                </div>
                <p className="text-warm-gray-600 text-lg mt-4 pl-20">
                  {activeTab === 'overview' ?
                    (isCoordinator() ?
                      `Surveillance des superviseurs et ramasseurs de ${userCommune}` :
                      'Statistiques et indicateurs clés de performance') :
                   activeTab === 'users' ? 'Gérez les utilisateurs selon vos permissions hiérarchiques' :
                   activeTab === 'reports' ? 'Consultez et gérez les signalements' :
                   activeTab === 'map' ? 'Visualisez les signalements sur la carte interactive' :
                   'Statistiques détaillées et analytics'}
                </p>
                {/* Indicateur de rôle */}
                <div className="flex items-center gap-3 mt-3 pl-20">
                  <div className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-3 border ${
                    isAdminUser()
                      ? 'border-golden-brown-400/40 shadow-[inset_0_1px_2px rgba(255,255,255,0.5),0_2px_6px rgba(193,154,107,0.15)] bg-gradient-to-br from-white to-golden-brown-100 text-golden-brown-700'
                      : isCoordinator()
                      ? 'border-blue-400/40 shadow-[inset_0_1px_2px rgba(255,255,255,0.5),0_2px_6px rgba(59,130,246,0.15)] bg-gradient-to-br from-white to-blue-100 text-blue-700'
                      : 'border-emerald-400/40 shadow-[inset_0_1px_2px rgba(255,255,255,0.5),0_2px_6px rgba(16,185,129,0.15)] bg-gradient-to-br from-white to-emerald-100 text-emerald-700'
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                      isAdminUser() ? 'border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.3)] bg-gradient-to-br from-golden-brown-100 to-golden-brown-200' :
                      isCoordinator() ? 'border-blue-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.3)] bg-gradient-to-br from-blue-100 to-blue-200' :
                      'border-emerald-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.3)] bg-gradient-to-br from-emerald-100 to-emerald-200'
                    }`}>
                      <span className="text-sm font-bold">
                        {isAdminUser() ? '👑' : isCoordinator() ? '🎯' : '👁️'}
                      </span>
                    </div>
                    <span>
                      {isAdminUser() ? 'Administrateur' :
                       isCoordinator() ? 'Coordinateur' :
                       'Superviseur'} • {userCommune || 'Kinshasa'}
                    </span>
                  </div>
                  <span className="text-xs text-warm-gray-500">
                    ({allUsers.length} utilisateurs • {allReports.length} signalements)
                  </span>
                </div>
              </div>
            </div>

            {/* Message feedback avec animation */}
            {message.text && (
              <div className={`px-8 py-6 rounded-3xl text-base font-semibold flex items-center gap-5 shadow-2xl border border-emerald-300/40 shadow-[inset_0_1px_4px rgba(255,255,255,0.4),0_6px_24px rgba(16,185,129,0.15)] ${
                message.type === "success"
                  ? "bg-gradient-to-r from-emerald-50/80 to-emerald-100/50 text-emerald-800"
                  : message.type === "error"
                  ? "bg-gradient-to-r from-red-50/80 to-red-100/50 text-red-800 border-red-300/40 shadow-[inset_0_1px_4px rgba(255,255,255,0.4),0_6px_24px rgba(239,68,68,0.15)]"
                  : "bg-gradient-to-r from-amber-50/80 to-amber-100/50 text-amber-800 border-amber-300/40 shadow-[inset_0_1px_4px rgba(255,255,255,0.4),0_6px_24px rgba(245,158,11,0.15)]"
              }`}>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center border ${
                  message.type === "success" ? "border-emerald-600/50 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_4px_12px rgba(16,185,129,0.2)] bg-gradient-to-br from-emerald-600 to-emerald-700" :
                  message.type === "error" ? "border-red-600/50 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_4px_12px rgba(239,68,68,0.2)] bg-gradient-to-br from-red-600 to-red-700" :
                  "border-amber-600/50 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_4px_12px rgba(245,158,11,0.2)] bg-gradient-to-br from-amber-600 to-amber-700"
                }`}>
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)]">
                    <span className="text-2xl font-bold">
                      {message.type === "success" ? "✅" : message.type === "error" ? "⚠️" : "ℹ️"}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="block text-lg">{message.text}</span>
                  <span className="text-sm font-normal opacity-80">
                    {message.type === "success" ? "Action réussie" : "Veuillez vérifier"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Boutons d'action rapide */}
          <div className="pl-20">
            <div className="flex flex-wrap gap-4">
              {activeTab === 'users' && (
                <>
                  {hasElevatedPrivileges() && (
                    <button
                      onClick={() => {
                        setSelectedCommune('');
                        setSelectedRole('');
                        fetchAllUsers(token);
                      }}
                      className="px-6 py-3 rounded-xl bg-gradient-to-br from-white to-warm-gray-100 text-warm-gray-700 font-bold hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex items-center gap-2 border border-golden-brown-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-golden-brown-100 to-golden-brown-200 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.4)]">
                        <span className="text-lg font-bold text-golden-brown-700">🔄</span>
                      </div>
                      <span>Tous les utilisateurs</span>
                    </button>
                  )}

                  {/* Filtre par commune (admin et coordinateur seulement) */}
                  {hasElevatedPrivileges() && (
                    <select
                      value={selectedCommune}
                      onChange={(e) => {
                        setSelectedCommune(e.target.value);
                        if (e.target.value) {
                          const filtered = allUsers.filter(user =>
                            compareCommunes(user.commune, e.target.value)
                          );
                          setAllUsers(filtered);
                        } else {
                          fetchAllUsers(token);
                        }
                      }}
                      className="px-6 py-3 rounded-xl bg-gradient-to-br from-white to-warm-gray-100 text-warm-gray-700 font-bold border border-golden-brown-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]"
                    >
                      <option value="">Toutes les communes</option>
                      {[...new Set(allUsers.map(user => user.commune))].filter(Boolean).map(commune => (
                        <option key={commune} value={commune}>{commune}</option>
                      ))}
                    </select>
                  )}

                  {/* Filtre par rôle */}
                  <select
                    value={selectedRole}
                    onChange={(e) => {
                      setSelectedRole(e.target.value);
                      if (e.target.value) {
                        const filtered = allUsers.filter(user =>
                          normalizeString(user.role) === normalizeString(e.target.value)
                        );
                        setAllUsers(filtered);
                      } else {
                        if (hasElevatedPrivileges()) {
                          fetchAllUsers(token);
                        } else if (isSupervisor()) {
                          fetchSupervisorUsers(token);
                        }
                      }
                    }}
                    className="px-6 py-3 rounded-xl bg-gradient-to-br from-white to-warm-gray-100 text-warm-gray-700 font-bold border border-golden-brown-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]"
                  >
                    <option value="">Tous les rôles</option>
                    {hasElevatedPrivileges() && <option value="administrateur">Administrateur</option>}
                    {hasElevatedPrivileges() && <option value="coordinateur">Coordinateur</option>}
                    <option value="superviseur">Superviseur</option>
                    <option value="ramasseur">Ramasseur</option>
                    <option value="citoyen">Citoyen</option>
                  </select>
                </>
              )}
            </div>
          </div>
        </div>

        {/* CONTENU SELON L'ONGLE ACTIF */}
        {activeTab === 'overview' ? (
          // === VUE D'ENSEMBLE ===
          <div className="w-full mx-auto">
            {/* VUE SPÉCIFIQUE POUR COORDINATEUR */}
            {isCoordinator() ? (
              <div>
                {/* Section Superviseurs */}
                <div className="bg-gradient-to-br from-white to-warm-gray-50/30 rounded-3xl p-10 mb-10 border border-golden-brown-400/30 shadow-[inset_0_1px_4px rgba(193,154,107,0.15),0_6px_24px rgba(0,0,0,0.08)]">
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-5">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center border border-golden-brown-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_4px_12px rgba(193,154,107,0.25)]">
                        <div className="w-18 h-18 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)]">
                          <span className="text-3xl font-bold text-golden-brown-700">👁️</span>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-warm-gray-800">Activités des Superviseurs</h3>
                        <p className="text-warm-gray-600">Superviseurs de {userCommune} sous votre coordination</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-4xl font-bold text-golden-brown-700">{supervisors.length}</p>
                      <p className="text-sm text-warm-gray-600">superviseurs actifs</p>
                    </div>
                  </div>

                  {supervisors.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center mx-auto mb-6 shadow-lg border border-golden-brown-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_6px_20px rgba(193,154,107,0.25)]">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)]">
                          <span className="text-4xl font-bold text-golden-brown-700">👁️</span>
                        </div>
                      </div>
                      <h4 className="text-xl font-bold text-warm-gray-700 mb-3">Aucun superviseur trouvé</h4>
                      <p className="text-warm-gray-600">Aucun superviseur n'est assigné à votre commune</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {supervisors.map(supervisor => (
                        <AgentCard
                          key={supervisor.id}
                          agent={supervisor}
                          type="supervisor"
                          stats={agentStats[supervisor.id]}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Section Ramasseurs */}
                <div className="bg-gradient-to-br from-white to-warm-gray-50/30 rounded-3xl p-10 mb-10 border border-golden-brown-400/30 shadow-[inset_0_1px_4px rgba(193,154,107,0.15),0_6px_24px rgba(0,0,0,0.08)]">
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-5">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center border border-golden-brown-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_4px_12px rgba(193,154,107,0.25)]">
                        <div className="w-18 h-18 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)]">
                          <span className="text-3xl font-bold text-golden-brown-700">👷</span>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-warm-gray-800">Activités des Ramasseurs</h3>
                        <p className="text-warm-gray-600">Ramasseurs de {userCommune} sous votre supervision</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-4xl font-bold text-golden-brown-700">{collectors.length}</p>
                      <p className="text-sm text-warm-gray-600">ramasseurs actifs</p>
                    </div>
                  </div>

                  {collectors.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center mx-auto mb-6 shadow-lg border border-golden-brown-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_6px_20px rgba(193,154,107,0.25)]">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)]">
                          <span className="text-4xl font-bold text-golden-brown-700">👷</span>
                        </div>
                      </div>
                      <h4 className="text-xl font-bold text-warm-gray-700 mb-3">Aucun ramasseur trouvé</h4>
                      <p className="text-warm-gray-600">Aucun ramasseur n'est assigné à votre commune</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {collectors.map(collector => (
                        <AgentCard
                          key={collector.id}
                          agent={collector}
                          type="collector"
                          stats={agentStats[collector.id]}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Statistiques rapides */}
                <div className="bg-gradient-to-br from-white to-warm-gray-50/30 rounded-3xl p-10 border border-golden-brown-400/30 shadow-[inset_0_1px_4px rgba(193,154,107,0.15),0_6px_24px rgba(0,0,0,0.08)]">
                  <div className="flex items-center gap-5 mb-10">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center border border-golden-brown-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_4px_12px rgba(193,154,107,0.25)]">
                      <div className="w-18 h-18 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)]">
                        <span className="text-3xl font-bold text-golden-brown-700">📊</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-warm-gray-800">Statistiques de la Commune</h3>
                      <p className="text-warm-gray-600">Performance globale de {userCommune}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-gradient-to-br from-white to-emerald-100/30 rounded-2xl p-8 text-center border border-emerald-400/30 shadow-[inset_0_1px_4px rgba(16,185,129,0.1),0_4px_16px rgba(16,185,129,0.06)]">
                      <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">AGENTS</p>
                      <p className="text-5xl font-bold text-emerald-600 mt-2">{supervisors.length + collectors.length}</p>
                      <p className="text-sm text-warm-gray-500 mt-2">actifs</p>
                    </div>

                    <div className="bg-gradient-to-br from-white to-golden-brown-100/30 rounded-2xl p-8 text-center border border-golden-brown-400/30 shadow-[inset_0_1px_4px rgba(193,154,107,0.1),0_4px_16px rgba(0,0,0,0.06)]">
                      <p className="text-xs font-bold text-golden-brown-600 uppercase tracking-wider">SUPERVISEURS</p>
                      <p className="text-5xl font-bold text-golden-brown-700 mt-2">{supervisors.length}</p>
                      <p className="text-sm text-warm-gray-500 mt-2">en activité</p>
                    </div>

                    <div className="bg-gradient-to-br from-white to-amber-100/30 rounded-2xl p-8 text-center border border-amber-400/30 shadow-[inset_0_1px_4px rgba(245,158,11,0.1),0_4px_16px rgba(245,158,11,0.06)]">
                      <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">RAMASSEURS</p>
                      <p className="text-5xl font-bold text-amber-600 mt-2">{collectors.length}</p>
                      <p className="text-sm text-warm-gray-500 mt-2">opérationnels</p>
                    </div>

                    <div className="bg-gradient-to-br from-white to-blue-100/30 rounded-2xl p-8 text-center border border-blue-400/30 shadow-[inset_0_1px_4px rgba(59,130,246,0.1),0_4px_16px rgba(59,130,246,0.06)]">
                      <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">MISSIONS</p>
                      <p className="text-5xl font-bold text-blue-600 mt-2">
                        {Object.values(agentStats).reduce((sum, stats) => sum + (stats?.completed || 0), 0)}
                      </p>
                      <p className="text-sm text-warm-gray-500 mt-2">complétées</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // VUE STANDARD POUR ADMIN ET SUPERVISEUR
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-10">
                {/* Statistiques principales */}
                <div className="bg-gradient-to-br from-white to-warm-gray-50/30 rounded-3xl p-10 border border-golden-brown-400/30 shadow-[inset_0_1px_4px rgba(193,154,107,0.15),0_6px_24px rgba(0,0,0,0.08)]">
                  <div className="flex items-center gap-5 mb-10">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center border border-golden-brown-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_4px_12px rgba(193,154,107,0.25)]">
                      <div className="w-18 h-18 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)]">
                        <span className="text-3xl font-bold text-golden-brown-700">📊</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-warm-gray-800">Statistiques principales</h3>
                      <p className="text-warm-gray-600">Vue d'ensemble de l'activité</p>
                    </div>
                  </div>

                  {statsLoading ? (
                    <div className="text-center py-12">
                      <div className="inline-block w-16 h-16 border border-warm-gray-400/30 border-t-golden-brown-600 rounded-full animate-spin"></div>
                      <p className="mt-6 text-warm-gray-600">Chargement des statistiques...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-gradient-to-br from-white to-golden-brown-100/30 rounded-2xl p-8 text-center border border-golden-brown-400/30 shadow-[inset_0_1px_4px rgba(193,154,107,0.1),0_4px_16px rgba(0,0,0,0.06)]">
                        <p className="text-xs font-bold text-golden-brown-600 uppercase tracking-wider">UTILISATEURS</p>
                        <p className="text-5xl font-bold text-golden-brown-700 mt-2">{allUsers.length}</p>
                        <div className="mt-4 flex justify-center space-x-2">
                          {Object.entries(allUsers.reduce((acc, user) => {
                            const role = getRoleLabel(user.role);
                            acc[role] = (acc[role] || 0) + 1;
                            return acc;
                          }, {})).map(([role, count]) => (
                            <div key={role} className="text-xs px-2 py-1 rounded-full bg-gradient-to-br from-white to-warm-gray-100 border border-warm-gray-400/30">
                              {role}: {count}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-white to-emerald-100/30 rounded-2xl p-8 text-center border border-emerald-400/30 shadow-[inset_0_1px_4px rgba(16,185,129,0.1),0_4px_16px rgba(16,185,129,0.06)]">
                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">SIGNALEMENTS</p>
                        <p className="text-5xl font-bold text-emerald-600 mt-2">{allReports.length}</p>
                        <div className="mt-4 flex justify-center space-x-2">
                          <div className="text-xs px-2 py-1 rounded-full bg-gradient-to-br from-white to-amber-100 border border-amber-400/30 text-amber-700">
                            En attente: {allReports.filter(r => r.status === 'PENDING').length}
                          </div>
                          <div className="text-xs px-2 py-1 rounded-full bg-gradient-to-br from-white to-golden-brown-100 border border-golden-brown-400/30 text-golden-brown-700">
                            En cours: {allReports.filter(r => r.status === 'IN_PROGRESS').length}
                          </div>
                          <div className="text-xs px-2 py-1 rounded-full bg-gradient-to-br from-white to-emerald-100 border border-emerald-400/30 text-emerald-700">
                            Terminés: {allReports.filter(r => r.status === 'COMPLETED').length}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions rapides */}
                  <div className="mt-10 pt-10 border-t border-warm-gray-300/30">
                    <h4 className="text-lg font-bold text-warm-gray-800 mb-6 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-golden-brown-600/20 to-amber-600/20 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.3)]">
                        <span className="text-sm font-bold text-golden-brown-600">⚡</span>
                      </div>
                      Actions rapides
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => {
                          setActiveTab('users');
                          if (hasElevatedPrivileges()) {
                            fetchAllUsers(token);
                          } else if (isSupervisor()) {
                            fetchSupervisorUsers(token);
                          }
                        }}
                        className="p-6 rounded-2xl bg-gradient-to-br from-white to-warm-gray-100 hover:bg-gradient-to-br hover:from-golden-brown-100 hover:to-golden-brown-200 transition-all duration-300 border border-golden-brown-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-golden-brown-100 to-golden-brown-200 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.4)]">
                            <span className="text-xl font-bold text-golden-brown-700">👥</span>
                          </div>
                          <div className="text-left">
                            <span className="font-bold text-warm-gray-800 block">Gérer les utilisateurs</span>
                            <span className="text-xs text-warm-gray-600">{allUsers.length} utilisateurs</span>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab('reports');
                          if (hasElevatedPrivileges()) {
                            fetchAllReports(token);
                          } else if (isSupervisor()) {
                            fetchSupervisorReports(token);
                          }
                        }}
                        className="p-6 rounded-2xl bg-gradient-to-br from-white to-warm-gray-100 hover:bg-gradient-to-br hover:from-golden-brown-100 hover:to-golden-brown-200 transition-all duration-300 border border-golden-brown-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-golden-brown-100 to-golden-brown-200 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.4)]">
                            <span className="text-xl font-bold text-golden-brown-700">📋</span>
                          </div>
                          <div className="text-left">
                            <span className="font-bold text-warm-gray-800 block">Voir les signalements</span>
                            <span className="text-xs text-warm-gray-600">{allReports.length} signalements</span>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Activité récente */}
                <div className="bg-gradient-to-br from-white to-warm-gray-50/30 rounded-3xl p-10 border border-golden-brown-400/30 shadow-[inset_0_1px_4px rgba(193,154,107,0.15),0_6px_24px rgba(0,0,0,0.08)]">
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-5">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center border border-golden-brown-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_4px_12px rgba(193,154,107,0.25)]">
                        <div className="w-18 h-18 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)]">
                          <span className="text-3xl font-bold text-golden-brown-700">🕒</span>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-warm-gray-800">Activité récente</h3>
                        <p className="text-warm-gray-600">Derniers signalements et utilisateurs</p>
                      </div>
                    </div>
                  </div>

                  {/* Liste des signalements récents */}
                  <div className="space-y-4 max-h-[500px] overflow-y-auto">
                    <h4 className="text-lg font-bold text-warm-gray-800 mb-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-golden-brown-600/20 to-amber-600/20 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.3)]">
                        <span className="text-sm font-bold text-golden-brown-600">📋</span>
                      </div>
                      Signalements récents
                    </h4>

                    {allReports.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center mx-auto mb-4 border border-warm-gray-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4)]">
                          <span className="text-2xl font-bold text-warm-gray-400">📭</span>
                        </div>
                        <p className="text-warm-gray-600">Aucun signalement récent</p>
                      </div>
                    ) : (
                      allReports.slice(0, 5).map(report => (
                        <div key={report.id} className="bg-gradient-to-br from-white to-warm-gray-100/30 rounded-2xl p-6 border border-warm-gray-400/25 shadow-[inset_0_1px_3px rgba(120,113,108,0.1),0_3px_10px rgba(0,0,0,0.05)]">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <span className={`px-3 py-1 rounded-lg text-xs font-bold ${getStatusColor(report.status)}`}>
                                {getStatusText(report.status)}
                              </span>
                              <span className="text-sm text-warm-gray-500">{formatDate(report.created_at)}</span>
                            </div>
                            <span className="text-sm font-bold text-golden-brown-700">#{report.id}</span>
                          </div>
                          <p className="text-warm-gray-800 font-medium mb-2">
                            {report.description ? report.description.substring(0, 100) + '...' : 'Pas de description'}
                          </p>
                          <div className="flex items-center justify-between text-sm text-warm-gray-500">
                            <span>Commune: {report.user?.commune || 'Inconnue'}</span>
                            <span>Signalé par: {report.user?.full_name || 'Anonyme'}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Nouveaux utilisateurs */}
                  <div className="mt-10 pt-10 border-t border-warm-gray-300/30">
                    <h4 className="text-lg font-bold text-warm-gray-800 mb-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-golden-brown-600/20 to-amber-600/20 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.3)]">
                        <span className="text-sm font-bold text-golden-brown-600">👤</span>
                      </div>
                      Nouveaux utilisateurs
                    </h4>

                    {allUsers.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-warm-gray-600">Aucun utilisateur</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {allUsers.slice(0, 3).map(user => (
                          <div key={user.id} className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-white to-warm-gray-100/30 border border-warm-gray-400/25">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-golden-brown-100 to-golden-brown-200 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.4)]">
                              <span className="text-lg font-bold text-golden-brown-700">
                                {user.full_name?.charAt(0).toUpperCase() || '👤'}
                              </span>
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-warm-gray-800">{user.full_name || 'Utilisateur'}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs px-2 py-1 rounded-full bg-gradient-to-br from-white to-warm-gray-100 border border-warm-gray-400/30">
                                  {getRoleLabel(user.role)}
                                </span>
                                <span className="text-xs text-warm-gray-500">{user.commune || 'Sans commune'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Pour les administrateurs seulement - Statistiques avancées */}
            {isAdminUser() && adminDashboardData && (
              <div className="bg-gradient-to-br from-white to-warm-gray-50/30 rounded-3xl p-10 mt-10 border border-golden-brown-400/30 shadow-[inset_0_1px_4px rgba(193,154,107,0.15),0_6px_24px rgba(0,0,0,0.08)]">
                <div className="flex items-center gap-5 mb-10">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center border border-golden-brown-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_4px_12px rgba(193,154,107,0.25)]">
                    <div className="w-18 h-18 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)]">
                      <span className="text-3xl font-bold text-golden-brown-700">📈</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-warm-gray-800">Analytics Avancés</h3>
                    <p className="text-warm-gray-600">Statistiques détaillées pour Kinshasa</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-white to-golden-brown-100/30 rounded-2xl p-8 border border-golden-brown-400/30 shadow-[inset_0_1px_4px rgba(193,154,107,0.1),0_4px_16px rgba(0,0,0,0.06)]">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-golden-brown-600/20 to-amber-600/20 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.3)]">
                        <span className="text-lg font-bold text-golden-brown-600">👥</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-golden-brown-600 uppercase tracking-wider">UTILISATEURS</p>
                        <p className="text-3xl font-bold text-golden-brown-700">{adminDashboardData.user_stats?.total || 0}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {adminDashboardData.user_stats?.by_role && Object.entries(adminDashboardData.user_stats.by_role).map(([role, count]) => (
                        <div key={role} className="flex justify-between items-center">
                          <span className="text-sm text-warm-gray-600">{getRoleLabel(role)}</span>
                          <span className="font-bold text-warm-gray-800">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-white to-emerald-100/30 rounded-2xl p-8 border border-emerald-400/30 shadow-[inset_0_1px_4px rgba(16,185,129,0.1),0_4px_16px rgba(16,185,129,0.06)]">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-600/20 to-emerald-700/20 flex items-center justify-center border border-emerald-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.3)]">
                        <span className="text-lg font-bold text-emerald-600">📋</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">SIGNALEMENTS</p>
                        <p className="text-3xl font-bold text-emerald-600">{adminDashboardData.report_stats?.total || 0}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {adminDashboardData.report_stats?.by_status && Object.entries(adminDashboardData.report_stats.by_status).map(([status, count]) => (
                        <div key={status} className="flex justify-between items-center">
                          <span className="text-sm text-warm-gray-600">{getStatusText(status)}</span>
                          <span className="font-bold text-warm-gray-800">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-white to-amber-100/30 rounded-2xl p-8 border border-amber-400/30 shadow-[inset_0_1px_4px rgba(245,158,11,0.1),0_4px_16px rgba(245,158,11,0.06)]">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-600/20 to-amber-700/20 flex items-center justify-center border border-amber-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.3)]">
                        <span className="text-lg font-bold text-amber-600">🏆</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">TOP COLLECTEURS</p>
                        <p className="text-3xl font-bold text-amber-600">{adminDashboardData.top_collectors?.length || 0}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {adminDashboardData.top_collectors?.slice(0, 3).map((collector, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span className="text-sm text-warm-gray-600 truncate">{collector.name || 'Collecteur'}</span>
                          <span className="font-bold text-warm-gray-800">{collector.completed_reports || 0} missions</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Top communes */}
                {adminDashboardData.top_communes && adminDashboardData.top_communes.length > 0 && (
                  <div className="mt-10 pt-10 border-t border-warm-gray-300/30">
                    <h4 className="text-lg font-bold text-warm-gray-800 mb-6 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-golden-brown-600/20 to-amber-600/20 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.3)]">
                        <span className="text-sm font-bold text-golden-brown-600">🏙️</span>
                      </div>
                      Top communes
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {adminDashboardData.top_communes.map((commune, index) => (
                        <div key={index} className="bg-gradient-to-br from-white to-warm-gray-100/30 rounded-2xl p-6 text-center border border-warm-gray-400/25 shadow-[inset_0_1px_3px rgba(120,113,108,0.1),0_3px_10px rgba(0,0,0,0.05)]">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-golden-brown-100 to-golden-brown-200 flex items-center justify-center mx-auto mb-3 border border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.4)]">
                            <span className="text-lg font-bold text-golden-brown-700">{index + 1}</span>
                          </div>
                          <p className="font-bold text-warm-gray-800 text-sm truncate">{commune.commune || 'Commune'}</p>
                          <p className="text-2xl font-bold text-golden-brown-700 mt-2">{commune.count || 0}</p>
                          <p className="text-xs text-warm-gray-500">signalements</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : activeTab === 'users' ? (
          // === GESTION DES UTILISATEURS ===
          <div className="w-full mx-auto">
            <div className="bg-gradient-to-br from-white to-warm-gray-50/30 rounded-3xl overflow-hidden border border-golden-brown-400/30 shadow-[inset_0_1px_4px rgba(193,154,107,0.15),0_6px_24px rgba(0,0,0,0.08)]">
              <div className="p-10 border-b border-warm-gray-300/30 bg-gradient-to-r from-golden-brown-600/10 to-transparent">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div>
                    <h3 className="text-2xl font-bold text-warm-gray-800 mb-3 flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center border border-golden-brown-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_4px_12px rgba(193,154,107,0.25)]">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)]">
                          <span className="text-2xl font-bold text-golden-brown-700">👥</span>
                        </div>
                      </div>
                      <div>
                        <span>Gestion des Utilisateurs</span>
                        <p className="text-warm-gray-600 text-lg font-normal mt-2">
                          {hasElevatedPrivileges() ? 'Tous les utilisateurs de Kinshasa' : 'Ramasseurs de votre commune'}
                        </p>
                      </div>
                    </h3>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        if (hasElevatedPrivileges()) {
                          fetchAllUsers(token);
                        } else if (isSupervisor()) {
                          fetchSupervisorUsers(token);
                        }
                      }}
                      className="px-8 py-4 rounded-2xl bg-gradient-to-br from-white to-warm-gray-100 text-warm-gray-700 font-bold hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex items-center gap-3 border border-golden-brown-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-golden-brown-100 to-golden-brown-200 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.4)]">
                        <span className="text-lg font-bold text-golden-brown-700">🔄</span>
                      </div>
                      <span>Actualiser</span>
                    </button>
                  </div>
                </div>
              </div>

              {usersLoading ? (
                <div className="p-16 text-center">
                  <div className="inline-block w-24 h-24 border border-warm-gray-400/30 border-t-golden-brown-600 rounded-full animate-spin"></div>
                  <p className="mt-6 text-warm-gray-600 text-lg">Chargement des utilisateurs...</p>
                  <p className="text-sm text-warm-gray-500 mt-2">Veuillez patienter</p>
                </div>
              ) : allUsers.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center mx-auto mb-6 shadow-lg border border-golden-brown-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_6px_20px rgba(193,154,107,0.25)]">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)]">
                      <span className="text-5xl font-bold text-golden-brown-700">👥</span>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-warm-gray-700 mb-3">Aucun utilisateur trouvé</h3>
                  <p className="text-warm-gray-600 text-lg mb-8 max-w-md mx-auto">
                    {hasElevatedPrivileges() ? 'Aucun utilisateur enregistré dans le système' : 'Aucun ramasseur dans votre commune'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-warm-gray-300/30">
                  {allUsers.map((user) => (
                    <div key={user.id} className="p-10 hover:bg-gradient-to-r hover:from-golden-brown-50/30 hover:to-transparent transition-all duration-300">
                      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-10">
                        <div className="flex-1">
                          <div className="flex items-start gap-6 mb-8">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center border border-golden-brown-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_4px_12px rgba(193,154,107,0.25)]">
                              <div className="w-18 h-18 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)]">
                                <span className="text-3xl font-bold text-golden-brown-700">
                                  {user.full_name?.charAt(0).toUpperCase() || '👤'}
                                </span>
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-4 mb-4">
                                <h4 className="text-2xl font-bold text-warm-gray-800">{user.full_name || 'Utilisateur'}</h4>
                                <span className={`px-4 py-2 rounded-xl text-sm font-bold ${
                                  user.is_active
                                    ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 text-emerald-800 border border-emerald-300/40 shadow-[inset_0_1px_2px rgba(16,185,129,0.2)]'
                                    : 'bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-800 border border-red-300/40 shadow-[inset_0_1px_2px rgba(239,68,68,0.2)]'
                                }`}>
                                  {user.is_active ? 'ACTIF' : 'INACTIF'}
                                </span>
                                {user.is_verified && (
                                  <span className="px-3 py-1.5 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20 text-blue-800 text-xs font-bold border border-blue-300/40 shadow-[inset_0_1px_2px rgba(59,130,246,0.2)]">
                                    VÉRIFIÉ
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                                <div className="bg-gradient-to-br from-white to-golden-brown-100/30 rounded-2xl p-6 border border-golden-brown-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]">
                                  <p className="text-xs font-bold text-golden-brown-600 uppercase tracking-wider mb-2">📧 Email</p>
                                  <p className="font-medium text-warm-gray-800 truncate">{user.email || 'Non fourni'}</p>
                                </div>

                                <div className="bg-gradient-to-br from-white to-warm-gray-100/30 rounded-2xl p-6 border border-warm-gray-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]">
                                  <p className="text-xs font-bold text-warm-gray-600 uppercase tracking-wider mb-2">📱 Téléphone</p>
                                  <p className="font-medium text-warm-gray-800">{user.phone || 'Non fourni'}</p>
                                </div>

                                <div className="bg-gradient-to-br from-white to-emerald-100/30 rounded-2xl p-6 border border-emerald-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]">
                                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">📍 Localisation</p>
                                  <p className="font-medium text-warm-gray-800">{user.commune || 'Non spécifiée'}</p>
                                  {user.quartier && (
                                    <p className="text-sm text-warm-gray-600 mt-1">Quartier: {user.quartier}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-4 min-w-[280px]">
                          {/* Rôle actuel */}
                          <div className="bg-gradient-to-br from-white to-warm-gray-100/30 rounded-2xl p-6 border border-warm-gray-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]">
                            <p className="text-xs font-bold text-warm-gray-600 uppercase tracking-wider mb-3">🎯 Rôle actuel</p>
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-golden-brown-100 to-golden-brown-200 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.4)]">
                                <span className="text-lg font-bold text-golden-brown-700">
                                  {isRoleType(user.role, ['admin']) ? '👑' :
                                   isRoleType(user.role, ['coord']) ? '🎯' :
                                   isRoleType(user.role, ['superv']) ? '👁️' :
                                   isRoleType(user.role, ['ramass', 'collector']) ? '👷' : '👤'}
                                </span>
                              </div>
                              <div>
                                <p className="font-bold text-warm-gray-800">{getRoleLabel(user.role)}</p>
                                <p className="text-xs text-warm-gray-500">Inscrit le: {formatDate(user.created_at)}</p>
                              </div>
                            </div>
                          </div>

                          {/* Boutons d'action */}
                          <div className="flex flex-col gap-3">
                            {/* Modifier le rôle */}
                            {(hasElevatedPrivileges() || (isSupervisor() && isRoleType(user.role, ['ramasseur', 'collector']))) && (
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setNewRole(user.role);
                                  setShowRoleModal(true);
                                }}
                                className="px-6 py-4 rounded-xl bg-gradient-to-br from-golden-brown-600 to-amber-600 text-white font-bold hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex items-center justify-center gap-3 border border-golden-brown-700/60 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_2px_8px rgba(193,154,107,0.2)]"
                              >
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px rgba(255,255,255,0.5)]">
                                  <span className="text-lg font-bold text-golden-brown-700">🔄</span>
                                </div>
                                <span>Modifier le rôle</span>
                              </button>
                            )}

                            {/* Modifier la zone (admin, coordinateur et superviseur pour ses ramasseurs) */}
                            {(hasElevatedPrivileges() || (isSupervisor() && isRoleType(user.role, ['ramasseur', 'collector']))) && (
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setNewZone({ commune: user.commune || '', quartier: user.quartier || '' });
                                  setShowZoneModal(true);
                                }}
                                className="px-6 py-4 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white font-bold hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex items-center justify-center gap-3 border border-blue-700/60 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_2px_8px rgba(59,130,246,0.2)]"
                              >
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px rgba(255,255,255,0.5)]">
                                  <span className="text-lg font-bold text-blue-700">📍</span>
                                </div>
                                <span>Modifier la zone</span>
                              </button>
                            )}

                            {/* Activer/Désactiver (admin et coordinateur seulement) */}
                            {hasElevatedPrivileges() && (
                              <button
                                onClick={() => handleUpdateStatus(user.id, !user.is_active)}
                                className={`px-6 py-4 rounded-xl font-bold hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex items-center justify-center gap-3 border ${
                                  user.is_active
                                    ? 'border-red-700/60 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_2px_8px rgba(239,68,68,0.2)] bg-gradient-to-br from-red-600 to-red-700 text-white'
                                    : 'border-emerald-700/60 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_2px_8px rgba(16,185,129,0.2)] bg-gradient-to-br from-emerald-600 to-emerald-700 text-white'
                                }`}
                              >
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px rgba(255,255,255,0.5)]">
                                  <span className={`text-lg font-bold ${
                                    user.is_active ? 'text-red-700' : 'text-emerald-700'
                                  }`}>
                                    {user.is_active ? '⛔' : '✅'}
                                  </span>
                                </div>
                                <span>{user.is_active ? 'Désactiver' : 'Activer'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'reports' ? (
          // === SIGNALEMENTS ===
          <div className="w-full mx-auto">
            <div className="bg-gradient-to-br from-white to-warm-gray-50/30 rounded-3xl overflow-hidden border border-golden-brown-400/30 shadow-[inset_0_1px_4px rgba(193,154,107,0.15),0_6px_24px rgba(0,0,0,0.08)]">
              <div className="p-10 border-b border-warm-gray-300/30 bg-gradient-to-r from-golden-brown-600/10 to-transparent">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div>
                    <h3 className="text-2xl font-bold text-warm-gray-800 mb-3 flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center border border-golden-brown-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_4px_12px rgba(193,154,107,0.25)]">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)]">
                          <span className="text-2xl font-bold text-golden-brown-700">📋</span>
                        </div>
                      </div>
                      <div>
                        <span>Signalements</span>
                        <p className="text-warm-gray-600 text-lg font-normal mt-2">
                          {hasElevatedPrivileges() ? 'Tous les signalements de Kinshasa' : 'Signalements de votre commune'}
                        </p>
                      </div>
                    </h3>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        if (hasElevatedPrivileges()) {
                          fetchAllReports(token);
                        } else if (isSupervisor()) {
                          fetchSupervisorReports(token);
                        }
                      }}
                      className="px-8 py-4 rounded-2xl bg-gradient-to-br from-white to-warm-gray-100 text-warm-gray-700 font-bold hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex items-center gap-3 border border-golden-brown-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-golden-brown-100 to-golden-brown-200 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.4)]">
                        <span className="text-lg font-bold text-golden-brown-700">🔄</span>
                      </div>
                      <span>Actualiser</span>
                    </button>
                  </div>
                </div>
              </div>

              {reportsLoading ? (
                <div className="p-16 text-center">
                  <div className="inline-block w-24 h-24 border border-warm-gray-400/30 border-t-golden-brown-600 rounded-full animate-spin"></div>
                  <p className="mt-6 text-warm-gray-600 text-lg">Chargement des signalements...</p>
                  <p className="text-sm text-warm-gray-500 mt-2">Veuillez patienter</p>
                </div>
              ) : allReports.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center mx-auto mb-6 shadow-lg border border-golden-brown-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_6px_20px rgba(193,154,107,0.25)]">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)]">
                      <span className="text-5xl font-bold text-golden-brown-700">📭</span>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-warm-gray-700 mb-3">Aucun signalement</h3>
                  <p className="text-warm-gray-600 text-lg mb-8 max-w-md mx-auto">
                    {hasElevatedPrivileges() ? 'Aucun signalement enregistré dans Kinshasa' : 'Aucun signalement dans votre commune'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-warm-gray-300/30">
                  {allReports.map((report) => (
                    <div key={report.id} className="p-10 hover:bg-gradient-to-r hover:from-golden-brown-50/30 hover:to-transparent transition-all duration-300">
                      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-10">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-8">
                            <span className={`px-5 py-2.5 rounded-xl text-sm font-bold ${getStatusColor(report.status)}`}>
                              {getStatusText(report.status)}
                            </span>
                            <span className="text-sm text-warm-gray-500 px-4 py-2 rounded-xl bg-gradient-to-br from-white to-warm-gray-100 border border-warm-gray-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.4)]">
                              {formatDate(report.created_at)}
                            </span>
                            <span className="text-sm text-warm-gray-500 px-4 py-2 rounded-xl bg-gradient-to-br from-white to-warm-gray-100 border border-warm-gray-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.4)]">
                              Commune: {report.user?.commune || 'Inconnue'}
                            </span>
                          </div>

                          <h4 className="text-2xl font-bold text-warm-gray-800 mb-4">Signalement #{report.id}</h4>

                          {report.description && (
                            <p className="text-warm-gray-600 text-lg mb-6 leading-relaxed">{report.description}</p>
                          )}

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                            <div className="bg-gradient-to-br from-white to-golden-brown-100/30 rounded-2xl p-8 border border-golden-brown-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]">
                              <p className="text-xs font-bold text-golden-brown-600 uppercase tracking-wider mb-4">📍 Localisation</p>
                              <p className="font-mono text-lg text-warm-gray-800 font-medium">
                                {report.latitude?.toFixed(6) || 'N/A'}, {report.longitude?.toFixed(6) || 'N/A'}
                              </p>
                              <p className="text-sm text-warm-gray-600 mt-3">{report.address_description || 'Adresse non spécifiée'}</p>
                            </div>

                            <div className="bg-gradient-to-br from-white to-warm-gray-100/30 rounded-2xl p-8 border border-warm-gray-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]">
                              <p className="text-xs font-bold text-warm-gray-600 uppercase tracking-wider mb-4">👤 Signalé par</p>
                              <p className="font-bold text-warm-gray-800 text-xl">{report.user?.full_name || 'Anonyme'}</p>
                              <p className="text-warm-gray-600">{report.user?.phone || 'Tél. non disponible'}</p>
                              <p className="text-sm text-warm-gray-500 mt-2">{report.user?.commune || 'Commune inconnue'}</p>
                            </div>
                          </div>

                          {/* Photo du signalement */}
                          {report.image_url && (
                            <div className="mt-8">
                              <p className="text-xs font-bold text-warm-gray-600 uppercase tracking-wider mb-6">📸 Photo du signalement</p>
                              <div className="flex items-center gap-10">
                                <div className="relative w-64 h-64 rounded-2xl overflow-hidden border border-warm-gray-400/30 shadow-xl shadow-[0_8px_32px rgba(0,0,0,0.1)]">
                                  <img
                                    src={`${API_BASE_URL}${report.image_url}`}
                                    alt="Photo du signalement"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjE5MiIgaGVpZ2h0PSIxOTIiIGZpbGw9IiNFM0UzRTMiLz48cGF0aCBkPSJNMTIwIDg0QzEyMCA5Ny4yNTQ4IDEwOS4yNTUgMTA4IDk2IDEwOEM4Mi43NDUyIDEwOCA3MiA5Ny4yNTQ4IDcyIDg0QzcyIDcwLjc0NTIgODIuNzQ1MiA2MCA5NiA2MEMxMDkuMjU1IDYwIDEyMCA3MC43NDUyIDEyMCA4NFoiIGZpbGw9IiNCQ0JDQkMiLz48cGF0aCBkPSJNMTQ0IDE0MEg0OEMzOS4xNjM0IDE0MCAzMiAxMzIuODM3IDMyIDEyNFY5NkMzMiA4Ny4xNjM0IDM5LjE2MzQgODAgNDggODBIMTQ0QzE1Mi44MzcgODAgMTYwIDg3LjE2MzQgMTYwIDk2VjEyNEMxNjAgMTMyLjgzNyAxNTIuODM3IDE0MCAxNDQgMTQwWiIgZmlsbD0iI0JDQkNCQyIvPjwvc3ZnPg==';
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                                  <a
                                    href={`${API_BASE_URL}${report.image_url}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute bottom-6 right-6 px-6 py-3 rounded-xl bg-gradient-to-br from-golden-brown-600 to-amber-600 text-white font-bold hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex items-center gap-2 border border-golden-brown-700/60 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_2px_8px rgba(193,154,107,0.2)]"
                                  >
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px rgba(255,255,255,0.5)]">
                                      <span className="text-lg font-bold text-golden-brown-700">🔍</span>
                                    </div>
                                    <span>Agrandir</span>
                                  </a>
                                </div>
                                <div className="flex-1">
                                  <div className="bg-gradient-to-br from-white to-warm-gray-100/30 rounded-2xl p-8 border border-warm-gray-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]">
                                    <p className="text-xs font-bold text-warm-gray-600 uppercase tracking-wider mb-4">🎯 Coordonnées GPS</p>
                                    <div className="font-mono text-lg text-warm-gray-800 space-y-3 bg-gradient-to-br from-white to-warm-gray-100 p-6 rounded-xl border border-warm-gray-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.4)]">
                                      <p><span className="text-golden-brown-600">Latitude:</span> {report.latitude?.toFixed(6)}</p>
                                      <p><span className="text-golden-brown-600">Longitude:</span> {report.longitude?.toFixed(6)}</p>
                                    </div>
                                    {report.latitude && report.longitude && (
                                      <a
                                        href={`https://maps.google.com/?q=${report.latitude},${report.longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-4 mt-6 px-8 py-4 rounded-2xl bg-gradient-to-br from-white to-warm-gray-100 text-warm-gray-700 font-bold hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-golden-brown-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]"
                                      >
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-golden-brown-100 to-golden-brown-200 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.4)]">
                                          <span className="text-xl font-bold text-golden-brown-700">📍</span>
                                        </div>
                                        <span>Ouvrir dans Google Maps</span>
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/70">
                                          <span className="text-lg font-bold text-golden-brown-600">→</span>
                                        </div>
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Informations supplémentaires */}
                        <div className="flex flex-col gap-5 min-w-[280px]">
                          <div className="bg-gradient-to-br from-white to-warm-gray-100/30 rounded-2xl p-6 border border-warm-gray-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]">
                            <p className="text-xs font-bold text-warm-gray-600 uppercase tracking-wider mb-4">📊 Informations</p>
                            <div className="space-y-3">
                              <div className="flex justify-between">
                                <span className="text-sm text-warm-gray-600">ID</span>
                                <span className="font-bold text-warm-gray-800">#{report.id}</span>
                              </div>
                              {report.resolved_at && (
                                <div className="flex justify-between">
                                  <span className="text-sm text-warm-gray-600">Résolu le</span>
                                  <span className="font-bold text-warm-gray-800">{formatDate(report.resolved_at)}</span>
                                </div>
                              )}
                              {report.collector_id && (
                                <div className="flex justify-between">
                                  <span className="text-sm text-warm-gray-600">Collecteur assigné</span>
                                  <span className="font-bold text-warm-gray-800">ID: {report.collector_id}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Voir sur carte */}
                          {report.latitude && report.longitude && (
                            <a
                              href={`https://maps.google.com/?q=${report.latitude},${report.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-6 py-4 rounded-xl bg-gradient-to-br from-white to-warm-gray-100 text-warm-gray-700 font-bold hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex items-center justify-center gap-3 border border-golden-brown-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]"
                            >
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-golden-brown-100 to-golden-brown-200 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.4)]">
                                <span className="text-lg font-bold text-golden-brown-700">🗺️</span>
                              </div>
                              <span>Voir sur carte</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'map' ? (
          // === CARTE INTERACTIVE ===
          <div className="w-full mx-auto">
            <div className="bg-gradient-to-br from-white to-warm-gray-50/30 rounded-3xl p-10 border border-golden-brown-400/30 shadow-[inset_0_1px_4px rgba(193,154,107,0.15),0_6px_24px rgba(0,0,0,0.08)]">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center border border-golden-brown-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_4px_12px rgba(193,154,107,0.25)]">
                    <div className="w-18 h-18 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)]">
                      <span className="text-3xl font-bold text-golden-brown-700">🗺️</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-warm-gray-800">
                      Carte Interactive {!hasElevatedPrivileges() && `- ${userCommune}`}
                    </h3>
                    <p className="text-warm-gray-600">
                      {hasElevatedPrivileges()
                        ? 'Visualisez tous les signalements de Kinshasa'
                        : `Visualisez les signalements de ${userCommune}`}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      if (hasElevatedPrivileges()) {
                        fetchAllReports(token);
                      } else if (isSupervisor()) {
                        fetchSupervisorReports(token);
                      }
                    }}
                    className="px-6 py-4 rounded-2xl bg-gradient-to-br from-white to-warm-gray-100 text-warm-gray-700 font-bold hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex items-center gap-3 border border-golden-brown-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-golden-brown-100 to-golden-brown-200 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.4)]">
                      <span className="text-lg font-bold text-golden-brown-700">🔄</span>
                    </div>
                    <span>Actualiser</span>
                  </button>
                </div>
              </div>

              {/* Carte avec les signalements */}
              <SimpleCommuneMap
                communeName={hasElevatedPrivileges() ? 'Kinshasa' : userCommune}
                userRole={userRole}
                onQuartierClick={() => {}}
                reports={allReports.map(report => ({
                  id: report.id,
                  latitude: report.latitude,
                  longitude: report.longitude,
                  status: report.status,
                  description: report.description || '',
                  image_url: report.image_url || '',
                  created_at: report.created_at,
                  reporter_name: report.user?.full_name || 'Anonyme',
                  address: report.address_description || '',
                  commune: report.user?.commune || 'Inconnue',
                  reporter_phone: report.user?.phone || '',
                  reporter_commune: report.user?.commune || '',
                  collector_name: report.collector_full_name || '',
                  user_name: report.user?.full_name || 'Anonyme'
                }))}
                token={token}
                API_BASE_URL={API_BASE_URL}
                onTakeMission={() => {}}
                onCompleteMission={() => {}}
                loading={loading}
                isAgent={true}
                isAdmin={hasElevatedPrivileges()}
              />

              {/* Légende */}
              <div className="mt-8 p-6 bg-gradient-to-br from-white to-warm-gray-100/30 rounded-2xl border border-warm-gray-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]">
                <h4 className="font-bold text-warm-gray-800 mb-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-golden-brown-600/20 to-amber-600/20 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.3)]">
                    <span className="text-sm font-bold text-golden-brown-600">🎯</span>
                  </div>
                  Légende de la carte
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-red-500 rounded-full border border-red-600 shadow-[inset_0_1px_2px rgba(255,255,255,0.3)]"></div>
                    <span className="text-sm text-warm-gray-700"><span className="font-bold text-red-600">Rouge</span> : En attente</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-blue-500 rounded-full border border-blue-600 shadow-[inset_0_1px_2px rgba(255,255,255,0.3)]"></div>
                    <span className="text-sm text-warm-gray-700"><span className="font-bold text-blue-600">Bleu</span> : En cours</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-emerald-500 rounded-full border border-emerald-600 shadow-[inset_0_1px_2px rgba(255,255,255,0.3)]"></div>
                    <span className="text-sm text-warm-gray-700"><span className="font-bold text-emerald-600">Vert</span> : Terminé</span>
                  </div>
                </div>
                <p className="text-sm text-warm-gray-600 mt-4">
                  {hasElevatedPrivileges()
                    ? `Carte affichant ${allReports.length} signalements sur Kinshasa`
                    : `Carte affichant ${allReports.length} signalements dans ${userCommune}`}
                </p>
              </div>
            </div>
          </div>
        ) : (
          // === ANALYTICS AVANCÉS (ADMIN ET COORDINATEUR SEULEMENT) ===
          <div className="w-full mx-auto">
            {hasElevatedPrivileges() ? (
              <div>
                {statsLoading ? (
                  <div className="text-center py-20">
                    <div className="inline-block w-20 h-20 border border-warm-gray-400/30 border-t-golden-brown-600 rounded-full animate-spin"></div>
                    <p className="mt-6 text-warm-gray-600 text-lg">Chargement des analytics...</p>
                  </div>
                ) : globalStats ? (
                  <div className="bg-gradient-to-br from-white to-warm-gray-50/30 rounded-3xl p-10 border border-golden-brown-400/30 shadow-[inset_0_1px_4px rgba(193,154,107,0.15),0_6px_24px rgba(0,0,0,0.08)]">
                    <div className="flex items-center gap-5 mb-10">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center border border-golden-brown-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_4px_12px rgba(193,154,107,0.25)]">
                        <div className="w-18 h-18 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)]">
                          <span className="text-3xl font-bold text-golden-brown-700">📈</span>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-warm-gray-800">Analytics Avancés</h3>
                        <p className="text-warm-gray-600">Statistiques détaillées de Kinshasa</p>
                      </div>
                    </div>

                    {/* Statistiques principales */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                      <div className="bg-gradient-to-br from-white to-golden-brown-100/30 rounded-2xl p-8 text-center border border-golden-brown-400/30 shadow-[inset_0_1px_4px rgba(193,154,107,0.1),0_4px_16px rgba(0,0,0,0.06)]">
                        <p className="text-xs font-bold text-golden-brown-600 uppercase tracking-wider">TOTAL</p>
                        <p className="text-5xl font-bold text-golden-brown-700 mt-2">{globalStats.total || 0}</p>
                        <p className="text-sm text-warm-gray-500 mt-2">signalements</p>
                      </div>

                      <div className="bg-gradient-to-br from-white to-amber-100/30 rounded-2xl p-8 text-center border border-amber-400/30 shadow-[inset_0_1px_4px rgba(245,158,11,0.1),0_4px_16px rgba(245,158,11,0.06)]">
                        <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">EN ATTENTE</p>
                        <p className="text-5xl font-bold text-amber-600 mt-2">{globalStats.pending || 0}</p>
                        <p className="text-sm text-warm-gray-500 mt-2">à traiter</p>
                      </div>

                      <div className="bg-gradient-to-br from-white to-golden-brown-100/30 rounded-2xl p-8 text-center border border-golden-brown-400/30 shadow-[inset_0_1px_4px rgba(193,154,107,0.1),0_4px_16px rgba(0,0,0,0.06)]">
                        <p className="text-xs font-bold text-golden-brown-700 uppercase tracking-wider">EN COURS</p>
                        <p className="text-5xl font-bold text-golden-brown-700 mt-2">{globalStats.in_progress || 0}</p>
                        <p className="text-sm text-warm-gray-500 mt-2">en traitement</p>
                      </div>

                      <div className="bg-gradient-to-br from-white to-emerald-100/30 rounded-2xl p-8 text-center border border-emerald-400/30 shadow-[inset_0_1px_4px rgba(16,185,129,0.1),0_4px_16px rgba(16,185,129,0.06)]">
                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">TERMINÉS</p>
                        <p className="text-5xl font-bold text-emerald-600 mt-2">{globalStats.completed || 0}</p>
                        <p className="text-sm text-warm-gray-500 mt-2">collectés</p>
                      </div>
                    </div>

                    {/* Statistiques par commune */}
                    {globalStats.commune_stats && Object.keys(globalStats.commune_stats).length > 0 && (
                      <div className="mb-10">
                        <h4 className="text-xl font-bold text-warm-gray-800 mb-6 flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-golden-brown-600/20 to-amber-600/20 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.3)]">
                            <span className="text-lg font-bold text-golden-brown-600">🏙️</span>
                          </div>
                          Signalements par commune
                        </h4>
                        <div className="bg-gradient-to-br from-white to-warm-gray-100/30 rounded-2xl p-6 border border-warm-gray-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]">
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-warm-gray-300/30">
                                  <th className="text-left py-4 px-6 text-sm font-bold text-warm-gray-700">Commune</th>
                                  <th className="text-right py-4 px-6 text-sm font-bold text-warm-gray-700">Signalements</th>
                                  <th className="text-right py-4 px-6 text-sm font-bold text-warm-gray-700">Pourcentage</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(globalStats.commune_stats)
                                  .sort(([,a], [,b]) => b - a)
                                  .map(([commune, count]) => (
                                    <tr key={commune} className="border-b border-warm-gray-300/20 hover:bg-gradient-to-r hover:from-golden-brown-50/30 hover:to-transparent">
                                      <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-golden-brown-100 to-golden-brown-200 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.4)]">
                                            <span className="text-sm font-bold text-golden-brown-700">📍</span>
                                          </div>
                                          <span className="font-medium text-warm-gray-800">{commune}</span>
                                        </div>
                                      </td>
                                      <td className="text-right py-4 px-6">
                                        <span className="font-bold text-golden-brown-700 text-lg">{count}</span>
                                      </td>
                                      <td className="text-right py-4 px-6">
                                        <div className="flex items-center justify-end gap-3">
                                          <div className="w-32 h-3 bg-gradient-to-r from-warm-gray-300/30 to-warm-gray-400/30 rounded-full overflow-hidden">
                                            <div
                                              className="h-full bg-gradient-to-r from-golden-brown-600 to-amber-600 rounded-full"
                                              style={{ width: `${(count / globalStats.total) * 100}%` }}
                                            ></div>
                                          </div>
                                          <span className="font-bold text-warm-gray-800 w-12">
                                            {((count / globalStats.total) * 100).toFixed(1)}%
                                          </span>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Évolution mensuelle */}
                    {globalStats.monthly_stats && Object.keys(globalStats.monthly_stats).length > 0 && (
                      <div>
                        <h4 className="text-xl font-bold text-warm-gray-800 mb-6 flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-golden-brown-600/20 to-amber-600/20 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.3)]">
                            <span className="text-lg font-bold text-golden-brown-600">📅</span>
                          </div>
                          Évolution mensuelle (6 derniers mois)
                        </h4>
                        <div className="bg-gradient-to-br from-white to-warm-gray-100/30 rounded-2xl p-6 border border-warm-gray-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {Object.entries(globalStats.monthly_stats)
                              .sort(([a], [b]) => a.localeCompare(b))
                              .map(([month, count]) => (
                                <div key={month} className="text-center">
                                  <div className="bg-gradient-to-br from-white to-golden-brown-100/30 rounded-2xl p-6 border border-golden-brown-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]">
                                    <p className="text-xs font-bold text-golden-brown-600 uppercase tracking-wider">{month}</p>
                                    <p className="text-3xl font-bold text-golden-brown-700 mt-2">{count}</p>
                                    <p className="text-sm text-warm-gray-500 mt-1">signalements</p>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-20">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center mx-auto mb-6 shadow-lg border border-golden-brown-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_6px_20px rgba(193,154,107,0.25)]">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)]">
                        <span className="text-4xl font-bold text-golden-brown-700">📊</span>
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-warm-gray-700 mb-3">Aucune donnée disponible</h3>
                    <p className="text-warm-gray-600 text-lg mb-8 max-w-md mx-auto">
                      Les statistiques avancées ne sont pas encore disponibles
                    </p>
                    <button
                      onClick={() => {
                        fetchGlobalStats(token);
                        fetchAdminDashboard(token);
                      }}
                      className="px-10 py-5 rounded-2xl bg-gradient-to-br from-golden-brown-600 to-amber-600 text-white font-bold hover:shadow-xl transition-all duration-300 hover:-translate-y-2 flex items-center gap-3 border border-golden-brown-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_4px_12px rgba(193,154,107,0.25)]"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px rgba(255,255,255,0.5)]">
                        <span className="text-xl font-bold text-golden-brown-700">🔄</span>
                      </div>
                      <span>Actualiser</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center mx-auto mb-6 shadow-lg border border-golden-brown-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_6px_20px rgba(193,154,107,0.25)]">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)]">
                    <span className="text-4xl font-bold text-golden-brown-700">👑</span>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-warm-gray-700 mb-3">Accès restreint</h3>
                <p className="text-warm-gray-600 text-lg mb-8 max-w-md mx-auto">
                  Les analytics avancés sont réservés aux administrateurs et coordinateurs uniquement
                </p>
                <button
                  onClick={() => setActiveTab('overview')}
                  className="px-10 py-5 rounded-2xl bg-gradient-to-br from-golden-brown-600 to-amber-600 text-white font-bold hover:shadow-xl transition-all duration-300 hover:-translate-y-2 flex items-center gap-3 border border-golden-brown-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_4px_12px rgba(193,154,107,0.25)]"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px rgba(255,255,255,0.5)]">
                    <span className="text-xl font-bold text-golden-brown-700">←</span>
                  </div>
                  <span>Retour à la vue d'ensemble</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* MODALES */}
        {showRoleModal && selectedUser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-white to-warm-gray-50/30 rounded-3xl p-10 max-w-md w-full mx-auto shadow-2xl border border-golden-brown-400/40 shadow-[inset_0_2px_5px rgba(255,255,255,0.3),0_8px_30px rgba(193,154,107,0.2)]">
              <div className="flex items-center gap-5 mb-8">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center shadow-lg border border-golden-brown-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_6px_20px rgba(193,154,107,0.25)]">
                  <div className="w-18 h-18 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)]">
                    <span className="text-3xl font-bold text-golden-brown-700">🔄</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-warm-gray-800">Modifier le rôle</h3>
                  <p className="text-sm text-warm-gray-600">Utilisateur: {selectedUser.full_name}</p>
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-bold text-warm-gray-700 mb-4">Nouveau rôle</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-gradient-to-br from-white to-warm-gray-100 text-warm-gray-700 font-medium border border-golden-brown-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]"
                >
                  <option value="">Sélectionnez un rôle</option>
                  {hasElevatedPrivileges() && <option value="administrateur">Administrateur</option>}
                  {hasElevatedPrivileges() && <option value="coordinateur">Coordinateur</option>}
                  {(hasElevatedPrivileges() || isSupervisor()) && <option value="superviseur">Superviseur</option>}
                  {(hasElevatedPrivileges() || isSupervisor()) && <option value="ramasseur">Ramasseur</option>}
                  {(hasElevatedPrivileges()) && <option value="citoyen">Citoyen</option>}
                </select>
                <p className="text-xs text-warm-gray-500 mt-3">
                  Rôle actuel: <span className="font-bold text-golden-brown-700">{getRoleLabel(selectedUser.role)}</span>
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleUpdateRole}
                  disabled={loading || !newRole}
                  className="flex-1 py-5 rounded-2xl bg-gradient-to-br from-golden-brown-600 to-amber-600 text-white font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 flex items-center justify-center gap-3 border border-golden-brown-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_4px_12px rgba(193,154,107,0.25)]"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px rgba(255,255,255,0.5)]">
                    <span className="text-xl font-bold text-golden-brown-700">✅</span>
                  </div>
                  <span>Modifier</span>
                </button>
                <button
                  onClick={() => {
                    setShowRoleModal(false);
                    setSelectedUser(null);
                    setNewRole('');
                  }}
                  className="flex-1 py-5 rounded-2xl bg-gradient-to-br from-white to-warm-gray-100 text-warm-gray-700 font-bold text-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 flex items-center justify-center gap-3 border border-golden-brown-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-golden-brown-100 to-golden-brown-200 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.4)]">
                    <span className="text-xl font-bold text-golden-brown-700">✕</span>
                  </div>
                  <span>Annuler</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {showZoneModal && selectedUser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-white to-warm-gray-50/30 rounded-3xl p-10 max-w-md w-full mx-auto shadow-2xl border border-blue-400/40 shadow-[inset_0_2px_5px rgba(255,255,255,0.3),0_8px_30px rgba(59,130,246,0.2)]">
              <div className="flex items-center gap-5 mb-8">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg border border-blue-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_6px_20px rgba(59,130,246,0.25)]">
                  <div className="w-18 h-18 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)]">
                    <span className="text-3xl font-bold text-blue-700">📍</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-warm-gray-800">Modifier la zone</h3>
                  <p className="text-sm text-warm-gray-600">Utilisateur: {selectedUser.full_name}</p>
                </div>
              </div>

              <div className="space-y-6 mb-8">
                <div>
                  <label className="block text-sm font-bold text-warm-gray-700 mb-3">Commune</label>
                  <input
                    type="text"
                    value={newZone.commune}
                    onChange={(e) => setNewZone({...newZone, commune: e.target.value})}
                    className="w-full p-4 rounded-2xl bg-gradient-to-br from-white to-warm-gray-100 text-warm-gray-700 font-medium border border-golden-brown-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]"
                    placeholder="Nom de la commune"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-warm-gray-700 mb-3">Quartier (optionnel)</label>
                  <input
                    type="text"
                    value={newZone.quartier}
                    onChange={(e) => setNewZone({...newZone, quartier: e.target.value})}
                    className="w-full p-4 rounded-2xl bg-gradient-to-br from-white to-warm-gray-100 text-warm-gray-700 font-medium border border-golden-brown-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]"
                    placeholder="Nom du quartier"
                  />
                </div>
                <p className="text-xs text-warm-gray-500">
                  Zone actuelle: <span className="font-bold text-golden-brown-700">{selectedUser.commune || 'Non spécifiée'}</span>
                  {selectedUser.quartier && `, ${selectedUser.quartier}`}
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleUpdateZone}
                  disabled={loading || !newZone.commune}
                  className="flex-1 py-5 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 flex items-center justify-center gap-3 border border-blue-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_4px_12px rgba(59,130,246,0.25)]"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px rgba(255,255,255,0.5)]">
                    <span className="text-xl font-bold text-blue-700">✅</span>
                  </div>
                  <span>Modifier</span>
                </button>
                <button
                  onClick={() => {
                    setShowZoneModal(false);
                    setSelectedUser(null);
                    setNewZone({ commune: '', quartier: '' });
                  }}
                  className="flex-1 py-5 rounded-2xl bg-gradient-to-br from-white to-warm-gray-100 text-warm-gray-700 font-bold text-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 flex items-center justify-center gap-3 border border-golden-brown-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-golden-brown-100 to-golden-brown-200 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.4)]">
                    <span className="text-xl font-bold text-golden-brown-700">✕</span>
                  </div>
                  <span>Annuler</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal d'aperçu agent */}
        {showAgentModal && selectedAgent && (
          <AgentOverviewModal
            agent={selectedAgent}
            type={selectedAgentType}
            stats={agentStats[selectedAgent.id]}
            reports={agentReports[selectedAgent.id]}
            onClose={() => {
              setShowAgentModal(false);
              setSelectedAgent(null);
              setSelectedAgentType('');
            }}
          />
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
