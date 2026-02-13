// pages/SupervisorDashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from "../api";
import SimpleCommuneMap from '../components/SimpleCommuneMap';

function SupervisorDashboard() {
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

  // --- DONNÉES SUPERVISEUR ---
  const [collectors, setCollectors] = useState([]); // Seulement les ramasseurs
  const [reports, setReports] = useState([]); // Tous les signalements de la commune
  const [collectorStats, setCollectorStats] = useState({});
  const [collectorReports, setCollectorReports] = useState({});

  // --- FILTRES ---
  const [selectedCollector, setSelectedCollector] = useState(null);
  const [selectedQuartier, setSelectedQuartier] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // --- ÉTATS UI ---
  const [activeTab, setActiveTab] = useState('collectors'); // 'collectors', 'reports', 'map', 'stats'
  const [reportsLoading, setReportsLoading] = useState(false);
  const [collectorsLoading, setCollectorsLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  // --- MODALES ---
  const [showCollectorModal, setShowCollectorModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedCollectorForAssignment, setSelectedCollectorForAssignment] = useState(null);

  // === FONCTIONS UTILITAIRES DE NORMALISATION ===
  const normalizeString = (str) => {
    if (str === null || str === undefined || str === '') return '';
    return String(str).trim().toLowerCase();
  };

  const normalizeCommune = (commune) => normalizeString(commune);
  const normalizeRole = (role) => normalizeString(role);

  const isSupervisorRole = (role) => {
    const r = normalizeRole(role);
    return r.includes('superviseur') || r.includes('supervisor');
  };

  const isCollectorRole = (role) => {
    const r = normalizeRole(role);
    return r.includes('ramasseur') || r.includes('collector');
  };

  // --- VÉRIFICATION DU RÔLE ---
  const isSupervisorUser = () => {
    const currentRole = userRole || localStorage.getItem('cm_user_role') || '';
    return isSupervisorRole(currentRole);
  };

  // === CORRECTION 1 : RÉCUPÉRER LES INFOS UTILISATEUR ===
  const fetchUserInfo = async (userToken) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/me`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });

      if (response.ok) {
        const userData = await response.json();

        let role = userData.role || '';
        let name = userData.full_name || 'Superviseur';
        let id = userData.id || '';
        let commune = userData.commune || '';

        // Mettre à jour l'état IMMÉDIATEMENT
        setUserRole(role);
        setUserName(name);
        setUserId(id);
        setUserCommune(commune);

        localStorage.setItem('cm_user_role', role);
        localStorage.setItem('cm_user_name', name);
        localStorage.setItem('cm_user_id', id);
        localStorage.setItem('cm_user_commune', commune);

        // DEBUG LOG
        console.log(`=== SUPERVISEUR DÉTECTÉ ===`);
        console.log(`Nom: ${name}, Rôle: ${role}, Commune: ${commune}`);

        // Vérifier le rôle avec normalisation
        const isSupervisor = isSupervisorRole(role);

        if (!isSupervisor) {
          setMessage({
            text: "Accès non autorisé. Redirection vers le dashboard principal...",
            type: "error"
          });
          setTimeout(() => navigate('/dashboard'), 2000);
          return;
        }

        // Log de confirmation - Les appels API seront faits par useEffect
        console.log(`✅ Superviseur ${name} - Commune: ${commune}`);
      }
    } catch (error) {
      console.error("Erreur récupération infos utilisateur:", error);
    }
  };

  // === CORRECTION 2 : CHARGER LES RAMASSEURS DE LA COMMUNE (NORMALISÉ) ===
  const fetchCollectors = async (userToken) => {
    setCollectorsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });

      if (response.ok) {
        const allUsers = await response.json();

        // DEBUG amélioré
        console.log("=== DEBUG fetchCollectors ===");
        console.log(`Superviseur commune: "${userCommune}"`);
        console.log(`Normalisé: "${normalizeCommune(userCommune)}"`);
        
        // Normaliser la commune du superviseur
        const normalizedSupervisorCommune = normalizeCommune(userCommune);

        // Filtrer uniquement les RAMASSEURS de la commune du superviseur
        const filteredCollectors = allUsers.filter(user => {
          // Normaliser la commune et le rôle de l'utilisateur
          const userCommuneNormalized = normalizeCommune(user.commune);
          const userRoleNormalized = normalizeRole(user.role);
          
          const isCollector = isCollectorRole(user.role);
          const sameCommune = userCommuneNormalized === normalizedSupervisorCommune;

          // DEBUG log pour chaque ramasseur potentiel
          if (isCollector) {
            console.log(`👷 ${user.full_name}:`, {
              dbCommune: `"${user.commune}"`,
              normalized: `"${userCommuneNormalized}"`,
              supervisorCommune: `"${userCommune}"`,
              supervisorNormalized: `"${normalizedSupervisorCommune}"`,
              match: sameCommune ? '✅ OUI' : '❌ NON'
            });
          }

          return isCollector && sameCommune;
        });

        console.log(`📊 Résultat: ${filteredCollectors.length} ramasseurs trouvés`);
        console.log("Liste:", filteredCollectors.map(c => c.full_name));
        
        setCollectors(filteredCollectors);
      } else {
        console.error("Erreur API:", await response.text());
      }
    } catch (error) {
      console.error("Erreur chargement des ramasseurs:", error);
    } finally {
      setCollectorsLoading(false);
    }
  };

  // === CORRECTION 3 : CHARGER TOUS LES SIGNALEMENTS DE LA COMMUNE ===
  const fetchReports = async (userToken) => {
    setReportsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });

      if (response.ok) {
        const allReports = await response.json();
        
        // 🔥 CORRECTION : Filtrer par commune du superviseur
        const supervisorCommuneNormalized = normalizeCommune(userCommune);
        
        const filteredReports = allReports.filter(report => {
          // Vérifier la commune de l'utilisateur qui a créé le signalement
          const reportCommuneNormalized = normalizeCommune(report.user?.commune || '');
          return reportCommuneNormalized === supervisorCommuneNormalized;
        });
        
        setReports(filteredReports);
        console.log(`📋 Signalements chargés: ${filteredReports.length} pour ${userCommune} (filtré sur ${allReports.length} total)`);
        console.log("Statut des signalements:", {
          pending: filteredReports.filter(r => r.status === 'PENDING').length,
          inProgress: filteredReports.filter(r => r.status === 'IN_PROGRESS').length,
          completed: filteredReports.filter(r => r.status === 'COMPLETED').length
        });
      }
    } catch (error) {
      console.error("Erreur chargement des signalements:", error);
    } finally {
      setReportsLoading(false);
    }
  };

  // === CORRECTION 4 : CHARGER LES STATISTIQUES D'UN RAMASSEUR (FILTRÉ PAR COMMUNE) ===
  const fetchCollectorStats = async (collectorId, userToken) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });

      if (response.ok) {
        const allReports = await response.json();
        
        // 🔥 CORRECTION : Filtrer par commune du superviseur
        const supervisorCommuneNormalized = normalizeCommune(userCommune);
        
        // 1. D'abord filtrer par commune
        const communeReports = allReports.filter(report => {
          const reportCommuneNormalized = normalizeCommune(report.user?.commune || '');
          return reportCommuneNormalized === supervisorCommuneNormalized;
        });
        
        // 2. Ensuite filtrer par ramasseur
        const assignedReports = communeReports.filter(report =>
          report.collector_id === collectorId ||
          report.collector?.id === collectorId
        );

        // Calculer les statistiques uniquement sur les signalements de la commune
        const completed = assignedReports.filter(r => r.status === 'COMPLETED').length;
        const inProgress = assignedReports.filter(r => r.status === 'IN_PROGRESS').length;
        const pending = assignedReports.filter(r => r.status === 'PENDING').length;
        const total = assignedReports.length;
        const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        setCollectorStats(prev => ({
          ...prev,
          [collectorId]: {
            completed,
            in_progress: inProgress,
            pending,
            total,
            success_rate: successRate,
            last_activity: assignedReports.length > 0
              ? new Date(Math.max(...assignedReports.map(r => new Date(r.updated_at || r.created_at))))
              : null
          }
        }));
        
        console.log(`📊 Stats ramasseur ${collectorId}: ${total} missions dans ${userCommune}`);
      }
    } catch (error) {
      console.error(`Erreur chargement stats ramasseur ${collectorId}:`, error);
    }
  };

  // === CORRECTION 5 : CHARGER LES RAPPORTS D'UN RAMASSEUR (FILTRÉ PAR COMMUNE) ===
  const fetchCollectorReports = async (collectorId, userToken) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });

      if (response.ok) {
        const allReports = await response.json();
        
        // 🔥 CORRECTION : Filtrer par commune
        const supervisorCommuneNormalized = normalizeCommune(userCommune);
        const communeReports = allReports.filter(report => {
          const reportCommuneNormalized = normalizeCommune(report.user?.commune || '');
          return reportCommuneNormalized === supervisorCommuneNormalized;
        });
        
        const collectorReports = communeReports.filter(report =>
          report.collector_id === collectorId ||
          report.collector?.id === collectorId
        );

        setCollectorReports(prev => ({
          ...prev,
          [collectorId]: collectorReports.slice(0, 10)
        }));
        
        console.log(`📋 Rapports ramasseur ${collectorId}: ${collectorReports.length} missions dans ${userCommune}`);
      }
    } catch (error) {
      console.error(`Erreur chargement rapports ramasseur ${collectorId}:`, error);
    }
  };

  // --- VOIR LE DASHBOARD D'UN RAMASSEUR ---
  const viewCollectorDashboard = async (collector) => {
    setSelectedCollector(collector);

    // Charger les statistiques et rapports du ramasseur
    await fetchCollectorStats(collector.id, token);
    await fetchCollectorReports(collector.id, token);

    setShowCollectorModal(true);
  };

  // --- ASSIGNER UN SIGNALEMENT À UN RAMASSEUR ---
  const assignReportToCollector = async (reportId, collectorId) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}`, {
        method: "PUT",
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: "IN_PROGRESS",
          collector_id: collectorId
        })
      });

      if (response.ok) {
        setMessage({
          text: "Signalement assigné avec succès !",
          type: "success"
        });

        // Recharger les signalements
        fetchReports(token);

        // Recharger les stats du ramasseur
        await fetchCollectorStats(collectorId, token);

        setShowAssignmentModal(false);
        setSelectedReport(null);
        setSelectedCollectorForAssignment(null);

        setTimeout(() => setMessage({text: "", type: ""}), 3000);
      } else {
        const errorData = await response.json();
        setMessage({
          text: errorData.detail || "Erreur lors de l'assignation",
          type: "error"
        });
      }
    } catch (error) {
      setMessage({ text: "Erreur réseau", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // --- MODIFIER LE STATUT D'UN RAMASSEUR (actif/inactif) ---
  const updateCollectorStatus = async (collectorId, isActive) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${collectorId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: isActive })
      });

      if (response.ok) {
        setMessage({
          text: `Ramasseur ${isActive ? 'activé' : 'désactivé'} avec succès`,
          type: "success"
        });

        // Recharger la liste des ramasseurs
        fetchCollectors(token);

        setTimeout(() => setMessage({text: "", type: ""}), 3000);
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

  // --- FILTRER LES RAMASSEURS (OPTIMISÉ AVEC NORMALISATION) ---
  const getFilteredCollectors = () => {
    let filtered = collectors;

    // Filtre par quartier avec normalisation
    if (selectedQuartier) {
      const normalizedQuartier = normalizeString(selectedQuartier);
      filtered = filtered.filter(collector =>
        normalizeString(collector.quartier) === normalizedQuartier
      );
    }

    // Filtre par recherche avec normalisation
    if (searchTerm) {
      const term = normalizeString(searchTerm);
      filtered = filtered.filter(collector =>
        normalizeString(collector.full_name)?.includes(term) ||
        normalizeString(collector.email)?.includes(term) ||
        collector.phone?.includes(searchTerm)
      );
    }

    return filtered;
  };

  // === CORRECTION 6 : FILTRER LES SIGNALEMENTS POUR L'AFFICHAGE ===
  const getFilteredReports = () => {
    let filtered = reports;

    // Pour l'onglet 'reports', on peut ajouter des filtres supplémentaires si besoin
    if (activeTab === 'reports') {
      // Exemple: filtrer par statut si on veut
      // Mais par défaut: afficher TOUS les signalements de la commune
    }

    return filtered;
  };

  // === CORRECTION 7 : useEffect SYNCHRONISÉ AVEC TOUTES LES DÉPENDANCES ===
  useEffect(() => {
    console.log("=== useEffect - Données superviseur ===");
    console.log("Commune:", userCommune);
    console.log("Rôle:", userRole);
    console.log("Token présent:", !!token);

    const isSupervisor = isSupervisorRole(userRole);

    if (userCommune && token && isSupervisor) {
      console.log("🚀 Chargement des données pour", userCommune);
      fetchCollectors(token);
      fetchReports(token);
    } else {
      console.log("⏳ Conditions non remplies:", {
        hasCommune: !!userCommune,
        hasToken: !!token,
        isSupervisor: isSupervisor
      });
    }
  }, [userCommune, userRole, token]); // ✅ Toutes les dépendances nécessaires

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
    if (userRole && !isSupervisorUser()) {
      navigate('/dashboard');
    }
  }, [userRole]);

  // Charger les statistiques pour tous les ramasseurs au chargement
  useEffect(() => {
    if (collectors.length > 0 && token) {
      collectors.forEach(collector => {
        fetchCollectorStats(collector.id, token);
      });
    }
  }, [collectors, token]);

  // === COMPOSANTS RÉUTILISABLES ===

  const CollectorCard = ({ collector, stats }) => (
    <div className="bg-gradient-to-br from-white to-warm-gray-50/30 rounded-2xl p-6 border border-warm-gray-400/25 shadow-[inset_0_1px_3px rgba(120,113,108,0.1),0_3px_10px rgba(0,0,0,0.05)] hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center border border-golden-brown-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_4px_12px rgba(193,154,107,0.25)]">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)]">
            <span className="text-xl font-bold text-golden-brown-700">👷</span>
          </div>
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-warm-gray-800 text-lg">{collector.full_name}</h4>
          <p className="text-sm text-warm-gray-600">{collector.email}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2 py-1 rounded-full bg-gradient-to-br from-white to-warm-gray-100 border border-warm-gray-400/30">
              {collector.commune}
            </span>
            {collector.quartier && (
              <span className="text-xs px-2 py-1 rounded-full bg-gradient-to-br from-white to-blue-100 border border-blue-400/30 text-blue-700">
                {collector.quartier}
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

      <div className="flex gap-2">
        <button
          onClick={() => viewCollectorDashboard(collector)}
          className="flex-1 py-3 rounded-xl bg-gradient-to-br from-golden-brown-600 to-amber-600 text-white font-bold hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex items-center justify-center gap-2 border border-golden-brown-700/60 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_2px_8px rgba(193,154,107,0.2)]"
        >
          <span>Voir activités</span>
          <span className="text-lg">→</span>
        </button>
        <button
          onClick={() => updateCollectorStatus(collector.id, !collector.is_active)}
          className={`px-4 py-3 rounded-xl font-bold hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex items-center justify-center border ${
            collector.is_active
              ? 'border-red-700/60 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_2px_8px rgba(239,68,68,0.2)] bg-gradient-to-br from-red-600 to-red-700 text-white'
              : 'border-emerald-700/60 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_2px_8px rgba(16,185,129,0.2)] bg-gradient-to-br from-emerald-600 to-emerald-700 text-white'
          }`}
          title={collector.is_active ? 'Désactiver' : 'Activer'}
        >
          {collector.is_active ? '⛔' : '✅'}
        </button>
      </div>
    </div>
  );

  const CollectorOverviewModal = ({ collector, stats, reports, onClose }) => {
    if (!collector) return null;

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-gradient-to-br from-white to-warm-gray-50/30 rounded-3xl p-8 max-w-4xl w-full mx-auto my-8 shadow-2xl border border-golden-brown-400/40 shadow-[inset_0_2px_5px rgba(255,255,255,0.3),0_8px_30px rgba(193,154,107,0.2)] max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center border border-golden-brown-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_4px_12px rgba(193,154,107,0.25)]">
                <div className="w-18 h-18 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)]">
                  <span className="text-3xl font-bold text-golden-brown-700">👷</span>
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-warm-gray-800">Dashboard Ramasseur</h3>
                <p className="text-warm-gray-600">{collector.full_name} • {collector.commune}</p>
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
              <p className="text-xs font-bold text-golden-brown-600 uppercase tracking-wider mb-2">Contact</p>
              <p className="font-medium text-warm-gray-800">{collector.email}</p>
              {collector.phone && <p className="text-sm text-warm-gray-600 mt-1">{collector.phone}</p>}
            </div>

            <div className="bg-gradient-to-br from-white to-warm-gray-100/30 rounded-2xl p-6 border border-warm-gray-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]">
              <p className="text-xs font-bold text-warm-gray-600 uppercase tracking-wider mb-2">📍 Zone</p>
              <p className="font-medium text-warm-gray-800">{collector.commune}</p>
              {collector.quartier && <p className="text-sm text-warm-gray-600 mt-1">Quartier: {collector.quartier}</p>}
            </div>

            <div className="bg-gradient-to-br from-white to-emerald-100/30 rounded-2xl p-6 border border-emerald-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]">
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">📅 Statut</p>
              <p className="font-medium text-warm-gray-800">
                {collector.is_active ? '✅ Actif' : '⛔ Inactif'}
              </p>
              <p className="text-sm text-warm-gray-600 mt-1">Inscrit: {formatDate(collector.created_at)}</p>
            </div>
          </div>          {/* Statistiques */}
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
              <p className="text-xs text-warm-gray-500 mt-3 text-center">
                Statistiques calculées uniquement sur les missions de {userCommune}
              </p>
            </div>
          )}

          {/* Activités récentes */}
          {reports && reports.length > 0 && (
            <div>
              <h4 className="text-lg font-bold text-warm-gray-800 mb-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-golden-brown-600/20 to-amber-600/20 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.3)]">
                  <span className="text-sm font-bold text-golden-brown-600">📋</span>
                </div>
                Activités Récentes dans {userCommune}
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
  };

  // === DEBUG PANEL ===
  const DebugPanel = () => (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-xl z-50 border border-emerald-500/50 shadow-2xl max-w-xs">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center">
          <span className="text-sm font-bold">🐛</span>
        </div>
        <h4 className="font-bold text-emerald-300">DEBUG PANEL</h4>
      </div>
      <div className="space-y-2 text-sm">
        <div><span className="text-emerald-400">Rôle:</span> {userRole || 'Non défini'}</div>
        <div><span className="text-emerald-400">Commune:</span> {userCommune || 'Non définie'}</div>
        <div><span className="text-emerald-400">Normalisé:</span> "{normalizeCommune(userCommune)}"</div>
        <div><span className="text-emerald-400">Ramasseurs:</span> {collectors?.length || 0}</div>
        <div><span className="text-emerald-400">Signalements:</span> {reports?.length || 0}</div>
        <div><span className="text-emerald-400">PENDING:</span> {reports.filter(r => r.status === 'PENDING').length}</div>
      </div>
      <button
        onClick={() => {
          console.log("=== MANUAL REFRESH ===");
          console.log("État actuel:", { 
            userRole, 
            userCommune, 
            normalizedCommune: normalizeCommune(userCommune),
            collectorsCount: collectors.length, 
            reportsCount: reports.length,
            reportsByStatus: {
              PENDING: reports.filter(r => r.status === 'PENDING').length,
              IN_PROGRESS: reports.filter(r => r.status === 'IN_PROGRESS').length,
              COMPLETED: reports.filter(r => r.status === 'COMPLETED').length
            }
          });
          console.log("Token:", token ? "Présent" : "Absent");
          console.log("Est superviseur:", isSupervisorUser());

          if (token && isSupervisorUser()) {
            fetchCollectors(token);
            fetchReports(token);
          }
        }}
        className="mt-3 w-full py-2 rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 text-white text-xs font-bold hover:shadow-lg transition-all"
      >
        FORCE REFRESH
      </button>
    </div>
  );

  // === RENDU SI NON CONNECTÉ ===
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-golden-brown-50 via-golden-brown-100/30 to-golden-brown-200/20 flex items-center justify-center p-6 font-sans text-warm-gray-800 relative overflow-hidden">
        <div className="text-center">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center mx-auto mb-6 shadow-lg border border-golden-brown-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_6px_20px rgba(193,154,107,0.25)]">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)]">
              <span className="text-4xl font-bold text-golden-brown-700">🔒</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-warm-gray-800 mb-4">Accès superviseur requis</h2>
          <p className="text-warm-gray-600 mb-8">Veuillez vous connecter pour accéder au panel de supervision</p>
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

  // === DASHBOARD SUPERVISEUR STYLÉ ===
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-golden-brown-50 via-amber-50/30 to-golden-brown-200/20 flex flex-col md:flex-row overflow-hidden font-sans text-warm-gray-800 relative">
      {/* DEBUG PANEL - À RETIRER APRÈS TESTS */}
      <DebugPanel />

      {/* Arrière-plan décoratif */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-1/3 h-1/3 bg-gradient-to-br from-golden-brown-200/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-1/3 h-1/3 bg-gradient-to-br from-amber-200/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1/2 h-1/2 bg-gradient-to-br from-amber-100/10 to-transparent rounded-full blur-3xl"></div>

        {/* Pattern subtil */}
        <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(circle_at_2px_2px,rgba(193,154,107,0.4)_1px,transparent_1px)] bg-[length:60px_60px]"></div>
      </div>

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
                      <span className="text-3xl font-bold text-golden-brown-700">👁️</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-warm-gray-800 text-xl truncate">{userName || 'Superviseur'}</h2>
                <div className="flex items-center gap-3 mt-3">
                  <div className="px-4 py-2 rounded-full text-sm font-bold border border-emerald-400/40 shadow-[inset_0_1px_2px rgba(255,255,255,0.5),0_2px_6px rgba(16,185,129,0.15)] bg-gradient-to-br from-white to-emerald-100 text-emerald-700">
                    Superviseur
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

              {/* Statistiques rapides */}
              <div className="bg-gradient-to-br from-white to-emerald-100/30 rounded-2xl p-6 border border-emerald-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-xs font-bold text-emerald-600">RAMASSEURS</p>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">{collectors.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-golden-brown-600">SIGNALEMENTS</p>
                    <p className="text-2xl font-bold text-golden-brown-700 mt-1">{reports.length}</p>
                  </div>
                </div>
                <div className="mt-3 text-center text-xs text-warm-gray-500">
                  {reports.filter(r => r.status === 'PENDING').length} en attente d'assignation
                </div>
              </div>
            </div>
          </div>
{/* Navigation stylée */}
<div className="my-10">
  <h3 className="text-xs font-bold text-warm-gray-500 uppercase tracking-widest mb-6 flex items-center gap-3">
    <div className="w-10 h-1.5 bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-full"></div>
    Panel de Supervision
  </h3>

  <div className="space-y-3">
    <button
      onClick={() => setActiveTab('collectors')}
      className={`w-full flex items-center gap-5 p-5 rounded-2xl transition-all duration-300 group border border-golden-brown-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)] ${
        activeTab === 'collectors'
          ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-2xl border-emerald-700/60 shadow-[inset_0_2px_5px rgba(255,255,255,0.4),0_6px_24px rgba(16,185,129,0.3)] transform scale-[1.02]'
          : 'bg-gradient-to-br from-white to-warm-gray-100 hover:bg-gradient-to-br hover:from-emerald-100 hover:to-emerald-200 hover:shadow-xl'
      }`}
    >
      <div className={`w-14 h-14 rounded-full flex items-center justify-center border ${
        activeTab === 'collectors'
          ? 'border-white/50 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)] bg-gradient-to-br from-white to-warm-gray-100'
          : 'border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.4)] bg-gradient-to-br from-emerald-100 to-emerald-200'
      }`}>
        <span className={`text-2xl font-bold ${
          activeTab === 'collectors' ? 'text-emerald-700' : 'text-warm-gray-700'
        }`}>
          👷
        </span>
      </div>
      <div className="text-left flex-1">
        <span className={`font-bold block transition-all duration-300 ${
          activeTab === 'collectors' ? 'text-white' : 'text-warm-gray-800 group-hover:text-emerald-700'
        }`}>
          Ramasseurs
        </span>
        <span className={`text-xs transition-all duration-300 ${
          activeTab === 'collectors' ? 'text-emerald-200' : 'text-warm-gray-600 group-hover:text-warm-gray-700'
        }`}>
          Gestion des équipes
        </span>
      </div>
    </button>

    <button
      onClick={() => {
        setActiveTab('reports');
        fetchReports(token);
      }}
      className={`w-full flex items-center gap-5 p-5 rounded-2xl transition-all duration-300 group border border-golden-brown-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)] ${
        activeTab === 'reports'
          ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-2xl border-emerald-700/60 shadow-[inset_0_2px_5px rgba(255,255,255,0.4),0_6px_24px rgba(16,185,129,0.3)] transform scale-[1.02]'
          : 'bg-gradient-to-br from-white to-warm-gray-100 hover:bg-gradient-to-br hover:from-emerald-100 hover:to-emerald-200 hover:shadow-xl'
      }`}
    >
      <div className={`w-14 h-14 rounded-full flex items-center justify-center border ${
        activeTab === 'reports'
          ? 'border-white/50 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)] bg-gradient-to-br from-white to-warm-gray-100'
          : 'border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.4)] bg-gradient-to-br from-emerald-100 to-emerald-200'
      }`}>
        <span className={`text-2xl font-bold ${
          activeTab === 'reports' ? 'text-emerald-700' : 'text-warm-gray-700'
        }`}>
          📋
        </span>
      </div>
      <div className="text-left flex-1">
        <span className={`font-bold block transition-all duration-300 ${
          activeTab === 'reports' ? 'text-white' : 'text-warm-gray-800 group-hover:text-emerald-700'
        }`}>
          Signalements
        </span>
        <span className={`text-xs transition-all duration-300 ${
          activeTab === 'reports' ? 'text-emerald-200' : 'text-warm-gray-600 group-hover:text-warm-gray-700'
        }`}>
          Assigner des missions
        </span>
      </div>
    </button>

    <button
      onClick={() => setActiveTab('map')}
      className={`w-full flex items-center gap-5 p-5 rounded-2xl transition-all duration-300 group border border-golden-brown-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)] ${
        activeTab === 'map'
          ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-2xl border-emerald-700/60 shadow-[inset_0_2px_5px rgba(255,255,255,0.4),0_6px_24px rgba(16,185,129,0.3)] transform scale-[1.02]'
          : 'bg-gradient-to-br from-white to-warm-gray-100 hover:bg-gradient-to-br hover:from-emerald-100 hover:to-emerald-200 hover:shadow-xl'
      }`}
    >
      <div className={`w-14 h-14 rounded-full flex items-center justify-center border ${
        activeTab === 'map'
          ? 'border-white/50 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)] bg-gradient-to-br from-white to-warm-gray-100'
          : 'border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.4)] bg-gradient-to-br from-emerald-100 to-emerald-200'
      }`}>
        <span className={`text-2xl font-bold ${
          activeTab === 'map' ? 'text-emerald-700' : 'text-warm-gray-700'
        }`}>
          🗺️
        </span>
      </div>
      <div className="text-left flex-1">
        <span className={`font-bold block transition-all duration-300 ${
          activeTab === 'map' ? 'text-white' : 'text-warm-gray-800 group-hover:text-emerald-700'
        }`}>
          Carte Interactive
        </span>
        <span className={`text-xs transition-all duration-300 ${
          activeTab === 'map' ? 'text-emerald-200' : 'text-warm-gray-600 group-hover:text-warm-gray-700'
        }`}>
          Visualiser les missions
        </span>
      </div>
    </button>

    <button
      onClick={() => setActiveTab('stats')}
      className={`w-full flex items-center gap-5 p-5 rounded-2xl transition-all duration-300 group border border-golden-brown-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)] ${
        activeTab === 'stats'
          ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-2xl border-emerald-700/60 shadow-[inset_0_2px_5px rgba(255,255,255,0.4),0_6px_24px rgba(16,185,129,0.3)] transform scale-[1.02]'
          : 'bg-gradient-to-br from-white to-warm-gray-100 hover:bg-gradient-to-br hover:from-emerald-100 hover:to-emerald-200 hover:shadow-xl'
      }`}
    >
      <div className={`w-14 h-14 rounded-full flex items-center justify-center border ${
        activeTab === 'stats'
          ? 'border-white/50 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)] bg-gradient-to-br from-white to-warm-gray-100'
          : 'border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.4)] bg-gradient-to-br from-emerald-100 to-emerald-200'
      }`}>
        <span className={`text-2xl font-bold ${
          activeTab === 'stats' ? 'text-emerald-700' : 'text-warm-gray-700'
        }`}>
          📊
        </span>
      </div>
      <div className="text-left flex-1">
        <span className={`font-bold block transition-all duration-300 ${
          activeTab === 'stats' ? 'text-white' : 'text-warm-gray-800 group-hover:text-emerald-700'
        }`}>
          Statistiques
        </span>
        <span className={`text-xs transition-all duration-300 ${
          activeTab === 'stats' ? 'text-emerald-200' : 'text-warm-gray-600 group-hover:text-warm-gray-700'
        }`}>
          Performance de l'équipe
        </span>
      </div>
    </button>
  </div>
</div>

          {/* Permissions */}
          <div className="bg-gradient-to-br from-white to-warm-gray-50/30 rounded-2xl p-6 border border-warm-gray-400/25 shadow-[inset_0_1px_3px rgba(120,113,108,0.1),0_3px_10px rgba(0,0,0,0.05)] mt-8">
            <h4 className="text-sm font-bold text-warm-gray-600 mb-4 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-600/20 to-emerald-700/20 flex items-center justify-center border border-emerald-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.3)]">
                <span className="text-xs font-bold text-emerald-600">👁️</span>
              </div>
              Permissions Superviseur
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-warm-gray-600">Gestion des ramasseurs</span>
                <span className="text-xs font-bold text-emerald-700">Oui</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-warm-gray-600">Assignation de missions</span>
                <span className="text-xs font-bold text-emerald-700">Oui</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-warm-gray-600">Vue commune: {userCommune}</span>
                <span className="text-xs font-bold text-emerald-700">Limité</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-warm-gray-600">Modification statuts</span>
                <span className="text-xs font-bold text-emerald-700">Oui</span>
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
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600/20 to-emerald-700/20 flex items-center justify-center mx-auto mb-3 border border-emerald-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.3)]">
              <span className="text-sm font-bold text-emerald-600">©</span>
            </div>
            <p className="text-xs text-warm-gray-500 font-medium">
              Panel Superviseur v2.0 • Kinshasa 2024
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
              <div className="absolute -inset-4 bg-gradient-to-r from-emerald-600/5 to-emerald-700/5 rounded-3xl blur-xl"></div>
              <div className="relative">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center shadow-lg border border-emerald-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_4px_12px rgba(16,185,129,0.25)]">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)]">
                      <span className="text-2xl font-bold text-emerald-700">
                        {activeTab === 'collectors' ? '👷' :
                         activeTab === 'reports' ? '📋' :
                         activeTab === 'map' ? '🗺️' :
                         '📊'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-3xl lg:text-4xl font-bold text-warm-gray-800">
                      {activeTab === 'collectors' ? 'Gestion des Ramasseurs' :
                       activeTab === 'reports' ? 'Signalements de ' + userCommune :
                       activeTab === 'map' ? 'Carte Interactive' :
                       'Statistiques de l\'Équipe'}
                    </h2>
                    <div className="w-24 h-1.5 bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-full mt-2"></div>
                  </div>
                </div>
                <p className="text-warm-gray-600 text-lg mt-4 pl-20">
                  {activeTab === 'collectors' ? `Supervisez ${collectors.length} ramasseurs dans ${userCommune}` :
                   activeTab === 'reports' ? `Assignez des missions parmi ${reports.length} signalements de ${userCommune}` :
                   activeTab === 'map' ? `Visualisez les signalements de ${userCommune}` :
                   `Suivez la performance de votre équipe dans ${userCommune}`}
                </p>
                {/* Indicateur de rôle */}
                <div className="flex items-center gap-3 mt-3 pl-20">
                  <div className="px-4 py-2 rounded-full text-sm font-bold flex items-center gap-3 border border-emerald-400/40 shadow-[inset_0_1px_2px rgba(255,255,255,0.5),0_2px_6px rgba(16,185,129,0.15)] bg-gradient-to-br from-white to-emerald-100 text-emerald-700">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center border border-emerald-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.3)]">
                      <span className="text-sm font-bold text-emerald-600">👁️</span>
                    </div>
                    <span>Superviseur • {userCommune}</span>
                  </div>
                  <span className="text-xs text-warm-gray-500">
                    ({collectors.length} ramasseurs • {reports.filter(r => r.status === 'PENDING').length} signalements en attente)
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

          {/* Filtres et actions */}
          <div className="pl-20">
            <div className="flex flex-wrap gap-4">
              {activeTab === 'collectors' && (
                <>
                  {/* Filtre par quartier */}
                  <select
                    value={selectedQuartier}
                    onChange={(e) => setSelectedQuartier(e.target.value)}
                    className="px-6 py-3 rounded-xl bg-gradient-to-br from-white to-warm-gray-100 text-warm-gray-700 font-bold border border-golden-brown-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]"
                  >
                    <option value="">Tous les quartiers</option>
                    {[...new Set(collectors.map(c => c.quartier))].filter(Boolean).map(quartier => (
                      <option key={quartier} value={quartier}>{quartier}</option>
                    ))}
                  </select>

                  {/* Recherche */}
                  <div className="relative">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Rechercher un ramasseur..."
                      className="pl-12 pr-6 py-3 rounded-xl bg-gradient-to-br from-white to-warm-gray-100 text-warm-gray-700 font-medium border border-golden-brown-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)] w-64"
                    />
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-golden-brown-100 to-golden-brown-200 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.4)]">
                      <span className="text-lg font-bold text-golden-brown-700">🔍</span>
                    </div>
                  </div>

                  <button
                    onClick={() => fetchCollectors(token)}
                    className="px-6 py-3 rounded-xl bg-gradient-to-br from-white to-warm-gray-100 text-warm-gray-700 font-bold hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex items-center gap-2 border border-golden-brown-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-golden-brown-100 to-golden-brown-200 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.4)]">
                      <span className="text-lg font-bold text-golden-brown-700">🔄</span>
                    </div>
                    <span>Actualiser</span>
                  </button>
                </>
              )}

              {activeTab === 'reports' && (
                <div className="flex gap-4">
                  <button
                    onClick={() => fetchReports(token)}
                    className="px-6 py-3 rounded-xl bg-gradient-to-br from-white to-warm-gray-100 text-warm-gray-700 font-bold hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex items-center gap-2 border border-golden-brown-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-golden-brown-100 to-golden-brown-200 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.4)]">
                      <span className="text-lg font-bold text-golden-brown-700">🔄</span>
                    </div>
                    <span>Actualiser les signalements</span>
                  </button>
                  
                  {/* Filtre par statut pour l'onglet signalements */}
                  <select
                    onChange={(e) => {
                      // Vous pouvez implémenter un filtre par statut ici si besoin
                    }}
                    className="px-6 py-3 rounded-xl bg-gradient-to-br from-white to-warm-gray-100 text-warm-gray-700 font-bold border border-golden-brown-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]"
                  >
                    <option value="">Tous les statuts</option>
                    <option value="PENDING">En attente</option>
                    <option value="IN_PROGRESS">En cours</option>
                    <option value="COMPLETED">Terminés</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CONTENU SELON L'ONGLE ACTIF */}
        {activeTab === 'collectors' ? (
          // === RAMASSEURS ===
          <div className="w-full mx-auto">
            <div className="bg-gradient-to-br from-white to-warm-gray-50/30 rounded-3xl overflow-hidden border border-golden-brown-400/30 shadow-[inset_0_1px_4px rgba(193,154,107,0.15),0_6px_24px rgba(0,0,0,0.08)]">
              <div className="p-10 border-b border-warm-gray-300/30 bg-gradient-to-r from-emerald-600/10 to-transparent">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div>
                    <h3 className="text-2xl font-bold text-warm-gray-800 mb-3 flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center border border-emerald-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_4px_12px rgba(16,185,129,0.25)]">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)]">
                          <span className="text-2xl font-bold text-emerald-700">👷</span>
                        </div>
                      </div>
                      <div>
                        <span>Équipe de Ramasseurs</span>
                        <p className="text-warm-gray-600 text-lg font-normal mt-2">
                          Gérez les ramasseurs de {userCommune}
                        </p>
                      </div>
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-bold text-emerald-700">{getFilteredCollectors().length}</p>
                    <p className="text-sm text-warm-gray-600">ramasseurs actifs</p>
                  </div>
                </div>
              </div>

              {collectorsLoading ? (
                <div className="p-16 text-center">
                  <div className="inline-block w-24 h-24 border border-warm-gray-400/30 border-t-emerald-600 rounded-full animate-spin"></div>
                  <p className="mt-6 text-warm-gray-600 text-lg">Chargement des ramasseurs...</p>
                  <p className="text-sm text-warm-gray-500 mt-2">Veuillez patienter</p>
                </div>
              ) : (
                <div>
                  {collectors.length === 0 ? (
                    <div className="p-16 text-center">
                      <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center mx-auto mb-6 shadow-lg border border-emerald-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_6px_20px rgba(16,185,129,0.25)]">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)]">
                          <span className="text-5xl font-bold text-emerald-700">👷</span>
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold text-warm-gray-700 mb-3">
                        {searchTerm || selectedQuartier ? 'Aucun ramasseur trouvé' : `Aucun ramasseur dans ${userCommune}`}
                      </h3>
                      <p className="text-warm-gray-600 text-lg mb-8 max-w-md mx-auto">
                        {searchTerm || selectedQuartier
                          ? 'Aucun ramasseur ne correspond à vos critères de recherche'
                          : `Aucun ramasseur n'est assigné à la commune ${userCommune}`}
                      </p>
                      <div className="inline-block px-6 py-3 rounded-xl bg-emerald-100 text-emerald-800 font-bold mb-6">
                        Total ramasseurs dans {userCommune}: {collectors.length}
                      </div>
                      {(searchTerm || selectedQuartier) && (
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setSelectedQuartier('');
                          }}
                          className="px-10 py-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white font-bold hover:shadow-xl transition-all duration-300 hover:-translate-y-2 flex items-center gap-3 border border-emerald-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_4px_12px rgba(16,185,129,0.25)]"
                        >
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px rgba(255,255,255,0.5)]">
                            <span className="text-xl font-bold text-emerald-700">🔄</span>
                          </div>
                          <span>Réinitialiser les filtres</span>
                        </button>
                      )}
                    </div>
                  ) : getFilteredCollectors().length === 0 ? (
                    <div className="p-16 text-center">
                      <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center mx-auto mb-6 shadow-lg border border-emerald-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_6px_20px rgba(16,185,129,0.25)]">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)]">
                          <span className="text-5xl font-bold text-emerald-700">👷</span>
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold text-warm-gray-700 mb-3">
                        Aucun ramasseur ne correspond aux filtres
                      </h3>
                      <p className="text-warm-gray-600 text-lg mb-8 max-w-md mx-auto">
                        Aucun ramasseur ne correspond à vos critères de recherche
                      </p>
                      <div className="inline-block px-6 py-3 rounded-xl bg-emerald-100 text-emerald-800 font-bold mb-6">
                        Total ramasseurs dans {userCommune}: {collectors.length}
                      </div>
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setSelectedQuartier('');
                        }}
                        className="px-10 py-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white font-bold hover:shadow-xl transition-all duration-300 hover:-translate-y-2 flex items-center gap-3 border border-emerald-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_4px_12px rgba(16,185,129,0.25)]"
                      >
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px rgba(255,255,255,0.5)]">
                          <span className="text-xl font-bold text-emerald-700">🔄</span>
                        </div>
                        <span>Réinitialiser les filtres</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-8">
                      <div className="mb-6 px-4">
                        <div className="inline-block px-4 py-2 rounded-lg bg-emerald-100 text-emerald-800 text-sm font-bold">
                          Affichage de {getFilteredCollectors().length} sur {collectors.length} ramasseurs
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {getFilteredCollectors().map(collector => (
                          <CollectorCard
                            key={collector.id}
                            collector={collector}
                            stats={collectorStats[collector.id]}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'reports' ? (
          // === CORRECTION 8 : TOUS LES SIGNALEMENTS DE LA COMMUNE (PAS SEULEMENT PENDING) ===
          <div className="w-full mx-auto">
            <div className="bg-gradient-to-br from-white to-warm-gray-50/30 rounded-3xl overflow-hidden border border-golden-brown-400/30 shadow-[inset_0_1px_4px rgba(193,154,107,0.15),0_6px_24px rgba(0,0,0,0.08)]">
              <div className="p-10 border-b border-warm-gray-300/30 bg-gradient-to-r from-amber-600/10 to-transparent">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div>
                    <h3 className="text-2xl font-bold text-warm-gray-800 mb-3 flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center border border-amber-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_4px_12px rgba(245,158,11,0.25)]">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)]">
                          <span className="text-2xl font-bold text-amber-700">📋</span>
                        </div>
                      </div>
                      <div>
                        <span>Signalements de {userCommune}</span>
                        <p className="text-warm-gray-600 text-lg font-normal mt-2">
                          Assignez des missions aux ramasseurs de {userCommune}
                        </p>
                      </div>
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-bold text-amber-600">{reports.length}</p>
                    <p className="text-sm text-warm-gray-600">signalements total</p>
                    <p className="text-xs text-amber-600 mt-1">
                      {reports.filter(r => r.status === 'PENDING').length} en attente
                    </p>
                  </div>
                </div>
              </div>

              {reportsLoading ? (
                <div className="p-16 text-center">
                  <div className="inline-block w-24 h-24 border border-warm-gray-400/30 border-t-amber-600 rounded-full animate-spin"></div>
                  <p className="mt-6 text-warm-gray-600 text-lg">Chargement des signalements...</p>
                  <p className="text-sm text-warm-gray-500 mt-2">Veuillez patienter</p>
                </div>
              ) : reports.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center mx-auto mb-6 shadow-lg border border-amber-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_6px_20px rgba(245,158,11,0.25)]">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)]">
                      <span className="text-5xl font-bold text-amber-700">📭</span>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-warm-gray-700 mb-3">Aucun signalement dans {userCommune}</h3>
                  <p className="text-warm-gray-600 text-lg mb-8 max-w-md mx-auto">
                    Aucun signalement n'a été rapporté dans votre commune
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-warm-gray-300/30">
                  {getFilteredReports()
                    .slice(0, 20) // Limiter à 20 signalements pour la performance
                    .map((report) => (
                    <div key={report.id} className="p-10 hover:bg-gradient-to-r hover:from-amber-50/30 hover:to-transparent transition-all duration-300">
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
                              Commune: {report.user?.commune || userCommune}
                            </span>
                            {report.collector && (
                              <span className="text-sm text-blue-600 px-4 py-2 rounded-xl bg-gradient-to-br from-white to-blue-100 border border-blue-400/30">
                                Assigné à: {report.collector?.full_name || 'Ramasseur'}
                              </span>
                            )}
                          </div>

                          <h4 className="text-2xl font-bold text-warm-gray-800 mb-4">Signalement #{report.id}</h4>

                          {report.description && (
                            <p className="text-warm-gray-600 text-lg mb-6 leading-relaxed">{report.description.substring(0, 200)}...</p>
                          )}

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                            <div className="bg-gradient-to-br from-white to-golden-brown-100/30 rounded-2xl p-6 border border-golden-brown-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]">
                              <p className="text-xs font-bold text-golden-brown-600 uppercase tracking-wider mb-4">📍 Localisation</p>
                              <p className="font-mono text-lg text-warm-gray-800 font-medium">
                                {report.latitude?.toFixed(6) || 'N/A'}, {report.longitude?.toFixed(6) || 'N/A'}
                              </p>
                            </div>

                            <div className="bg-gradient-to-br from-white to-warm-gray-100/30 rounded-2xl p-6 border border-warm-gray-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]">
                              <p className="text-xs font-bold text-warm-gray-600 uppercase tracking-wider mb-4">👤 Signalé par</p>
                              <p className="font-bold text-warm-gray-800 text-xl">{report.user?.full_name || 'Anonyme'}</p>
                              <p className="text-warm-gray-600">{report.user?.phone || 'Tél. non disponible'}</p>
                            </div>
                          </div>

                          {/* Photo du signalement */}
                          {report.image_url && (
                            <div className="mt-8">
                              <p className="text-xs font-bold text-warm-gray-600 uppercase tracking-wider mb-6">📸 Photo du signalement</p>
                              <div className="flex items-center gap-6">
                                <div className="relative w-48 h-48 rounded-2xl overflow-hidden border border-warm-gray-400/30 shadow-xl shadow-[0_8px_32px rgba(0,0,0,0.1)]">
                                  <img
                                    src={`${API_BASE_URL}${report.image_url}`}
                                    alt="Photo du signalement"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjE5MiIgaGVpZ2h0PSIxOTIiIGZpbGw9IiNFM0UzRTMiLz48cGF0aCBkPSJNMTIwIDg0QzEyMCA5Ny4yNTQ4IDEwOS4yNTUgMTA4IDk2IDEwOEM4Mi43NDUyIDEwOCA3MiA5Ny4yNTQ4IDcyIDg0QzcyIDcwLjc0NTIgODIuNzQ1yA2MCA5NiA2MEMxMDkuMjU1IDYwIDEyMCA3MC43NDUyIDEyMCA4NFoiIGZpbGw9IiNCQ0JDQkMiLz48cGF0aCBkPSJNMTQ0IDE0MEg0OEMzOS4xNjM0IDE0MCAzMiAxMzIuODM3IDMyIDEyNFY5NkMzMiA4Ny4xNjM0IDM5LjE2MzQgODAgNDggODBIMTQ0QzE1Mi44MzcgODAgMTYwIDg3LjE2MzQgMTYwIDk2VjEyNEMxNjAgMTMyLjgzNyAxNTIuODM3IDE0MCAxNDQgMTQwWiIgZmlsbD0iI0JDQkNCQyIvPjwvc3ZnPg==';
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Actions - Peut assigner même si déjà assigné (réassignation) */}
                        <div className="flex flex-col gap-5 min-w-[280px]">
                          <div className="bg-gradient-to-br from-white to-warm-gray-100/30 rounded-2xl p-6 border border-warm-gray-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]">
                            <p className="text-xs font-bold text-warm-gray-600 uppercase tracking-wider mb-4">
                              {report.status === 'PENDING' ? '🎯 Assigner à' : '🔄 Réassigner à'}
                            </p>

                            {collectors.length === 0 ? (
                              <p className="text-sm text-warm-gray-600 text-center py-4">Aucun ramasseur disponible</p>
                            ) : (
                              <div className="space-y-3 max-h-60 overflow-y-auto">
                                {collectors.filter(c => c.is_active).map(collector => (
                                  <button
                                    key={collector.id}
                                    onClick={() => {
                                      setSelectedReport(report);
                                      setSelectedCollectorForAssignment(collector);
                                      setShowAssignmentModal(true);
                                    }}
                                    disabled={report.status === 'COMPLETED'}
                                    className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-300 border ${
                                      report.status === 'COMPLETED'
                                        ? 'opacity-50 cursor-not-allowed bg-gradient-to-br from-gray-100 to-gray-200 border-gray-400/25'
                                        : 'bg-gradient-to-br from-white to-warm-gray-100 hover:bg-gradient-to-br hover:from-emerald-100 hover:to-emerald-200 border-warm-gray-400/25'
                                    }`}
                                  >
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border shadow-[inset_0_1px_2px rgba(255,255,255,0.4)] ${
                                      report.status === 'COMPLETED'
                                        ? 'bg-gradient-to-br from-gray-100 to-gray-200 border-gray-400/30'
                                        : 'bg-gradient-to-br from-emerald-100 to-emerald-200 border-emerald-400/30'
                                    }`}>
                                      <span className={`text-lg font-bold ${
                                        report.status === 'COMPLETED' ? 'text-gray-500' : 'text-emerald-700'
                                      }`}>
                                        {report.collector_id === collector.id ? '✅' : '👷'}
                                      </span>
                                    </div>
                                    <div className="text-left flex-1">
                                      <p className="font-bold text-warm-gray-800 text-sm">
                                        {collector.full_name}
                                        {report.collector_id === collector.id && (
                                          <span className="ml-2 text-xs text-emerald-600">(actuel)</span>
                                        )}
                                      </p>
                                      <p className="text-xs text-warm-gray-600">{collector.quartier || 'Sans quartier'}</p>
                                    </div>
                                    {report.status !== 'COMPLETED' && (
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/70">
                                        <span className="text-sm font-bold text-emerald-600">→</span>
                                      </div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                            
                            {report.status === 'COMPLETED' && (
                              <p className="text-sm text-center text-warm-gray-500 mt-3 py-2">
                                Ce signalement est terminé, aucune réassignation possible
                              </p>
                            )}
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
                          
                          {/* Information sur l'assignation actuelle */}
                          {report.collector && report.status !== 'COMPLETED' && (
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100/30 rounded-2xl p-4 border border-blue-400/30">
                              <p className="text-xs font-bold text-blue-600 mb-2">Assignation actuelle</p>
                              <p className="text-sm text-blue-800">
                                {report.collector?.full_name || 'Ramasseur inconnu'}
                              </p>
                              <p className="text-xs text-blue-600">Statut: {getStatusText(report.status)}</p>
                            </div>
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
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center border border-emerald-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_4px_12px rgba(16,185,129,0.25)]">
                    <div className="w-18 h-18 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)]">
                      <span className="text-3xl font-bold text-emerald-700">🗺️</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-warm-gray-800">Carte Interactive - {userCommune}</h3>
                    <p className="text-warm-gray-600">Visualisez les signalements de votre commune</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => fetchReports(token)}
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
                communeName={userCommune}
                userRole={userRole}
                onQuartierClick={() => {}}
                reports={reports.map(report => ({
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
                  collector_name: report.collector?.full_name || '',
                  user_name: report.user?.full_name || 'Anonyme'
                }))}
                token={token}
                API_BASE_URL={API_BASE_URL}
                onTakeMission={() => {}}
                onCompleteMission={() => {}}
                loading={loading}
                isAgent={true}
              />

              {/* Légende */}
              <div className="mt-8 p-6 bg-gradient-to-br from-white to-warm-gray-100/30 rounded-2xl border border-warm-gray-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]">
                <h4 className="font-bold text-warm-gray-800 mb-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600/20 to-emerald-700/20 flex items-center justify-center border border-emerald-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.3)]">
                    <span className="text-sm font-bold text-emerald-600">🎯</span>
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
                  Carte affichant {reports.length} signalements dans {userCommune}
                </p>
              </div>
            </div>
          </div>
        ) : (
          // === STATISTIQUES ===
          <div className="w-full mx-auto">
            <div className="bg-gradient-to-br from-white to-warm-gray-50/30 rounded-3xl p-10 border border-golden-brown-400/30 shadow-[inset_0_1px_4px rgba(193,154,107,0.15),0_6px_24px rgba(0,0,0,0.08)]">
              <div className="flex items-center gap-5 mb-10">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center border border-emerald-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_4px_12px rgba(16,185,129,0.25)]">
                  <div className="w-18 h-18 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)]">
                    <span className="text-3xl font-bold text-emerald-700">📊</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-warm-gray-800">Statistiques de l'Équipe - {userCommune}</h3>
                  <p className="text-warm-gray-600">Performance des ramasseurs de {userCommune}</p>
                </div>
              </div>

              {/* Statistiques principales */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <div className="bg-gradient-to-br from-white to-emerald-100/30 rounded-2xl p-8 text-center border border-emerald-400/30 shadow-[inset_0_1px_4px rgba(16,185,129,0.1),0_4px_16px rgba(16,185,129,0.06)]">
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">RAMASSEURS</p>
                  <p className="text-5xl font-bold text-emerald-600 mt-2">{collectors.length}</p>
                  <p className="text-sm text-warm-gray-500 mt-2">dans {userCommune}</p>
                </div>

                <div className="bg-gradient-to-br from-white to-amber-100/30 rounded-2xl p-8 text-center border border-amber-400/30 shadow-[inset_0_1px_4px rgba(245,158,11,0.1),0_4px_16px rgba(245,158,11,0.06)]">
                  <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">ACTIFS</p>
                  <p className="text-5xl font-bold text-amber-600 mt-2">{collectors.filter(c => c.is_active).length}</p>
                  <p className="text-sm text-warm-gray-500 mt-2">en service</p>
                </div>

                <div className="bg-gradient-to-br from-white to-golden-brown-100/30 rounded-2xl p-8 text-center border border-golden-brown-400/30 shadow-[inset_0_1px_4px rgba(193,154,107,0.1),0_4px_16px rgba(0,0,0,0.06)]">
                  <p className="text-xs font-bold text-golden-brown-600 uppercase tracking-wider">MISSIONS</p>
                  <p className="text-5xl font-bold text-golden-brown-700 mt-2">
                    {Object.values(collectorStats).reduce((sum, stats) => sum + (stats?.completed || 0), 0)}
                  </p>
                  <p className="text-sm text-warm-gray-500 mt-2">complétées dans {userCommune}</p>
                </div>

                <div className="bg-gradient-to-br from-white to-blue-100/30 rounded-2xl p-8 text-center border border-blue-400/30 shadow-[inset_0_1px_4px rgba(59,130,246,0.1),0_4px_16px rgba(59,130,246,0.06)]">
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">TAUX RÉUSSITE</p>
                  <p className="text-5xl font-bold text-blue-600 mt-2">
                    {collectors.length > 0
                      ? Math.round(Object.values(collectorStats).reduce((sum, stats) => sum + (stats?.success_rate || 0), 0) / collectors.length)
                      : 0}%
                  </p>
                  <p className="text-sm text-warm-gray-500 mt-2">moyenne à {userCommune}</p>
                </div>
              </div>

              {/* Tableau des performances */}
              {collectors.length > 0 && (
                <div>
                  <h4 className="text-xl font-bold text-warm-gray-800 mb-6 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-600/20 to-emerald-700/20 flex items-center justify-center border border-emerald-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.3)]">
                      <span className="text-lg font-bold text-emerald-600">🏆</span>
                    </div>
                    Classement des Ramasseurs - {userCommune}
                  </h4>
                  <div className="bg-gradient-to-br from-white to-warm-gray-100/30 rounded-2xl p-6 border border-warm-gray-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)]">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-warm-gray-300/30">
                            <th className="text-left py-4 px-6 text-sm font-bold text-warm-gray-700">Ramasseur</th>
                            <th className="text-right py-4 px-6 text-sm font-bold text-warm-gray-700">Missions</th>
                            <th className="text-right py-4 px-6 text-sm font-bold text-warm-gray-700">Taux réussite</th>
                            <th className="text-right py-4 px-6 text-sm font-bold text-warm-gray-700">Dernière activité</th>
                            <th className="text-right py-4 px-6 text-sm font-bold text-warm-gray-700">Statut</th>
                          </tr>
                        </thead>
                        <tbody>
                          {collectors
                            .sort((a, b) => {
                              const statsA = collectorStats[a.id] || { completed: 0, success_rate: 0 };
                              const statsB = collectorStats[b.id] || { completed: 0, success_rate: 0 };
                              return statsB.completed - statsA.completed;
                            })
                            .map((collector, index) => {
                              const stats = collectorStats[collector.id] || {};
                              return (
                                <tr key={collector.id} className="border-b border-warm-gray-300/20 hover:bg-gradient-to-r hover:from-emerald-50/30 hover:to-transparent">
                                  <td className="py-4 px-6">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center border border-emerald-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.4)]">
                                        <span className="text-sm font-bold text-emerald-700">{index + 1}</span>
                                      </div>
                                      <div>
                                        <p className="font-medium text-warm-gray-800">{collector.full_name}</p>
                                        <p className="text-xs text-warm-gray-600">{collector.quartier || 'Sans quartier'}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="text-right py-4 px-6">
                                    <span className="font-bold text-emerald-700 text-lg">{stats.completed || 0}</span>
                                    <p className="text-xs text-warm-gray-500">
                                      sur {stats.total || 0} missions
                                    </p>
                                  </td>
                                  <td className="text-right py-4 px-6">
                                    <div className="flex items-center justify-end gap-3">
                                      <div className="w-24 h-3 bg-gradient-to-r from-warm-gray-300/30 to-warm-gray-400/30 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-full"
                                          style={{ width: `${stats.success_rate || 0}%` }}
                                        ></div>
                                      </div>
                                      <span className="font-bold text-warm-gray-800 w-12">
                                        {stats.success_rate || 0}%
                                      </span>
                                    </div>
                                  </td>
                                  <td className="text-right py-4 px-6">
                                    <span className="text-sm text-warm-gray-600">
                                      {stats.last_activity ? formatDate(stats.last_activity) : 'Aucune'}
                                    </span>
                                  </td>
                                  <td className="text-right py-4 px-6">
                                    <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                                      collector.is_active
                                        ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 text-emerald-800 border border-emerald-300/40'
                                        : 'bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-800 border border-red-300/40'
                                    }`}>
                                      {collector.is_active ? 'ACTIF' : 'INACTIF'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4 text-center text-xs text-warm-gray-500">
                      Statistiques calculées uniquement sur les missions de {userCommune}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODALES */}
        {showCollectorModal && selectedCollector && (
          <CollectorOverviewModal
            collector={selectedCollector}
            stats={collectorStats[selectedCollector.id]}
            reports={collectorReports[selectedCollector.id]}
            onClose={() => {
              setShowCollectorModal(false);
              setSelectedCollector(null);
            }}
          />
        )}

        {showAssignmentModal && selectedReport && selectedCollectorForAssignment && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-white to-warm-gray-50/30 rounded-3xl p-10 max-w-md w-full mx-auto shadow-2xl border border-emerald-400/40 shadow-[inset_0_2px_5px rgba(255,255,255,0.3),0_8px_30px rgba(16,185,129,0.2)]">
              <div className="flex items-center gap-5 mb-8">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center shadow-lg border border-emerald-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_6px_20px rgba(16,185,129,0.25)]">
                  <div className="w-18 h-18 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px rgba(255,255,255,0.5)]">
                    <span className="text-3xl font-bold text-emerald-700">🎯</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-warm-gray-800">
                    {selectedReport.status === 'PENDING' ? 'Assigner une mission' : 'Réassigner une mission'}
                  </h3>
                  <p className="text-sm text-warm-gray-600">Confirmation d'assignation</p>
                </div>
              </div>

              <div className="mb-8">
                <p className="text-warm-gray-700 mb-4">
                  {selectedReport.status === 'PENDING' ? 'Assigner' : 'Réassigner'} le signalement 
                  <span className="font-bold text-emerald-700"> #{selectedReport.id}</span> à :
                </p>
                <div className="bg-gradient-to-br from-white to-emerald-100/30 rounded-2xl p-6 border border-emerald-400/30 mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center border border-emerald-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.4)]">
                      <span className="text-xl font-bold text-emerald-700">👷</span>
                    </div>
                    <div>
                      <p className="font-bold text-warm-gray-800">{selectedCollectorForAssignment.full_name}</p>
                      <p className="text-sm text-warm-gray-600">{selectedCollectorForAssignment.quartier || selectedCollectorForAssignment.commune}</p>
                      <p className="text-xs text-emerald-600 mt-1">
                        Ramasseur de {selectedCollectorForAssignment.commune}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedReport.description && (
                  <div className="bg-gradient-to-br from-white to-warm-gray-100/30 rounded-2xl p-4 border border-warm-gray-400/25">
                    <p className="text-sm text-warm-gray-700 italic">"{selectedReport.description.substring(0, 100)}..."</p>
                  </div>
                )}
                
                <div className="mt-4 text-sm text-warm-gray-600">
                  <p>Commune du signalement: <span className="font-bold">{selectedReport.user?.commune || userCommune}</span></p>
                  <p>Statut actuel: <span className={`font-bold ${getStatusColor(selectedReport.status)} px-2 py-1 rounded`}>
                    {getStatusText(selectedReport.status)}
                  </span></p>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => assignReportToCollector(selectedReport.id, selectedCollectorForAssignment.id)}
                  disabled={loading}
                  className="flex-1 py-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 flex items-center justify-center gap-3 border border-emerald-700/60 shadow-[inset_0_2px_4px rgba(255,255,255,0.4),0_4px_12px rgba(16,185,129,0.25)]"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px rgba(255,255,255,0.5)]">
                    <span className="text-xl font-bold text-emerald-700">✅</span>
                  </div>
                  <span>{selectedReport.status === 'PENDING' ? 'Confirmer' : 'Réassigner'}</span>
                </button>
                <button
                  onClick={() => {
                    setShowAssignmentModal(false);
                    setSelectedReport(null);
                    setSelectedCollectorForAssignment(null);
                  }}
                  disabled={loading}
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
      </div>
    </div>
  );
}

export default SupervisorDashboard;
