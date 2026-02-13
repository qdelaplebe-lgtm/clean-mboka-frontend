// pages/Moi.jsx
import { useState, useEffect } from 'react';
import { API_BASE_URL } from "../api";
import { Link, useNavigate } from 'react-router-dom';

function Moi() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userId, setUserId] = useState('');
  const [userCommune, setUserCommune] = useState('');
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userPoints, setUserPoints] = useState(0);
  const [userLevel, setUserLevel] = useState('Débutant');
  const [currentMode, setCurrentMode] = useState(() => {
    return localStorage.getItem('cm_preferred_mode') || 'agent';
  });
  const [userStats, setUserStats] = useState({
    totalReports: 0,
    completedReports: 0,
    pendingReports: 0
  });

  // ========== NOUVEAUX ÉTATS POUR POINTS ET RÉCOMPENSES ==========
  const [pointsData, setPointsData] = useState(null);
  const [rewardsUnlocked, setRewardsUnlocked] = useState([]);
  const [nextReward, setNextReward] = useState(null);
  const [eligibleForLottery, setEligibleForLottery] = useState(false);
  const [totalWeightKg, setTotalWeightKg] = useState(0);
  // ========== CORRECTION 1: State initial à null (pas { is_active: true }) ==========
  const [activeSubscription, setActiveSubscription] = useState(null);
  // =================================================================================
  const [pointsHistory, setPointsHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  // ===============================================================

  // États pour la photo de profil
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  const [uploadingProfile, setUploadingProfile] = useState(false);

  // État pour les messages
  const [message, setMessage] = useState({ text: '', type: '' });

  // ==================== FONCTIONS D'API POUR PHOTO DE PROFIL ====================

  const getAuthToken = () => {
    return localStorage.getItem('cm_token');
  };

  const fetchProfilePicture = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        console.log('Aucun token trouvé');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const userData = await response.json();

        if (userData.profile_picture) {
          let pictureUrl = userData.profile_picture;
          if (pictureUrl.startsWith('/static/')) {
            pictureUrl = `${API_BASE_URL}${pictureUrl}`;
          }
          setProfilePictureUrl(pictureUrl);
          localStorage.setItem('cm_user_profile_picture', pictureUrl);
        } else {
          setProfilePictureUrl('');
          localStorage.removeItem('cm_user_profile_picture');
        }

        if (userData.full_name !== userName) {
          setUserName(userData.full_name);
        }
        if (userData.role !== userRole) {
          setUserRole(userData.role);
        }

      } else if (response.status === 401) {
        console.log('Token expiré ou invalide');
      }
    } catch (error) {
      console.error('Erreur chargement photo de profil:', error);
      const cachedPic = localStorage.getItem('cm_user_profile_picture');
      if (cachedPic) {
        setProfilePictureUrl(cachedPic);
      }
    }
  };

  const uploadProfilePictureToAPI = async (file) => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Non authentifié. Veuillez vous reconnecter.');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/api/users/me/upload-profile-picture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });

      if (!response.ok) {
        let errorMsg = 'Erreur lors de l\'upload';
        try {
          const errorData = await response.json();
          errorMsg = errorData.detail || errorMsg;
        } catch (e) {
          errorMsg = `Erreur ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMsg);
      }

      const userData = await response.json();
      return userData.profile_picture;

    } catch (error) {
      console.error('Erreur upload API:', error);
      throw error;
    }
  };

  const deleteProfilePictureFromAPI = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Non authentifié');
      }

      const response = await fetch(`${API_BASE_URL}/api/users/me/profile-picture`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        let errorMsg = 'Erreur lors de la suppression';
        try {
          const errorData = await response.json();
          errorMsg = errorData.detail || errorMsg;
        } catch (e) {
          errorMsg = `Erreur ${response.status}`;
        }
        throw new Error(errorMsg);
      }

      return true;

    } catch (error) {
      console.error('Erreur suppression photo:', error);
      throw error;
    }
  };

  // ==================== NOUVELLES FONCTIONS API POUR POINTS ====================

  const fetchUserPointsData = async () => {
    try {
      const token = getAuthToken();
      if (!token) return null;

      const response = await fetch(`${API_BASE_URL}/api/users/me/points`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Mettre à jour localStorage
        localStorage.setItem('cm_user_points', data.points);
        localStorage.setItem('cm_user_subscription_active', data.subscription_active);
        localStorage.setItem('cm_user_eligible_lottery', data.eligible_lottery);
        
        return data;
      }
    } catch (error) {
      console.error('Erreur chargement points:', error);
    }
    return null;
  };

  // ========== CORRECTION 2: Gestion robuste de l'abonnement ==========
  const fetchUserSubscription = async () => {
    try {
      const token = getAuthToken();
      if (!token) return null;

      const response = await fetch(`${API_BASE_URL}/api/subscriptions/me/active`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setActiveSubscription(data);
        return data;
      } else {
        // ✅ 404 ou autre erreur = PAS D'ABONNEMENT
        console.log('Aucun abonnement actif ou endpoint non disponible');
        const noSubscription = { 
          is_active: false, 
          current_subscription: null,
          has_auto_renewal: false,
          days_until_expiry: null 
        };
        setActiveSubscription(noSubscription);
        return null;
      }
    } catch (error) {
      console.error('Erreur chargement abonnement:', error);
      // ✅ Erreur réseau = PAS D'ABONNEMENT
      const noSubscription = { 
        is_active: false, 
        current_subscription: null,
        has_auto_renewal: false,
        days_until_expiry: null 
      };
      setActiveSubscription(noSubscription);
      return null;
    }
  };
  // ===================================================================

  const fetchPointsHistory = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/points/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPointsHistory(data.history || []);
      }
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    }
  };

  // ==================== FONCTIONS EXISTANTES MODIFIÉES ====================

  const isUserAgent = () => {
    const normalizedRole = (userRole || '').toLowerCase();
    const agentRoles = ['ramasseur', 'superviseur', 'coordinateur', 'administrateur'];
    return agentRoles.includes(normalizedRole);
  };

  // Fonction mise à jour pour inclure les données de points
  useEffect(() => {
    const savedName = localStorage.getItem('cm_user_name');
    const savedRole = localStorage.getItem('cm_user_role');
    const savedId = localStorage.getItem('cm_user_id');
    const savedCommune = localStorage.getItem('cm_user_commune');
    const savedPoints = parseInt(localStorage.getItem('cm_user_points')) || 0;
    const savedMode = localStorage.getItem('cm_preferred_mode') || 'agent';

    setUserName(savedName || 'Utilisateur');
    setUserRole(savedRole || 'citoyen');
    setUserId(savedId || '');
    setUserCommune(savedCommune || '');
    setUserPoints(savedPoints);
    setUserLevel(calculateLevel(savedPoints));
    setCurrentMode(savedMode || 'agent');

    const savedProfilePic = localStorage.getItem('cm_user_profile_picture');
    if (savedProfilePic) {
      if (savedProfilePic.startsWith('http') || savedProfilePic.startsWith('/static/')) {
        setProfilePictureUrl(savedProfilePic);
      } else if (savedProfilePic.startsWith('data:image')) {
        setProfilePictureUrl(savedProfilePic);
      }
    }

    fetchProfilePicture();
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('cm_token');
      const savedPoints = parseInt(localStorage.getItem('cm_user_points')) || 0;
      const savedMode = localStorage.getItem('cm_preferred_mode') || 'agent';
      const isAgent = isUserAgent();
      const isCitizenMode = isAgent && savedMode === 'citizen';

      // ========== Récupérer les données de points ==========
      const pointsApiData = await fetchUserPointsData();
      if (pointsApiData) {
        setPointsData(pointsApiData);
        setUserPoints(pointsApiData.points);
        setUserLevel(calculateLevel(pointsApiData.points));
        setRewardsUnlocked(pointsApiData.rewards_unlocked || []);
        setNextReward(pointsApiData.next_reward);
        setEligibleForLottery(pointsApiData.eligible_lottery);
        setTotalWeightKg(pointsApiData.total_weight_kg || 0);
      }

      // ========== Récupérer l'abonnement ==========
      await fetchUserSubscription(); // ✅ Fonction corrigée
      // =============================================

      // 1. Récupérer les signalements de l'utilisateur depuis l'API
      let reports = [];
      let agentStats = {
        totalMissions: 0,
        completedMissions: 0,
        pendingMissions: 0
      };

      if (token) {
        if (isAgent && !isCitizenMode) {
          const response = await fetch(`${API_BASE_URL}/api/reports/`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (response.ok) {
            const allReports = await response.json();
            const currentUserId = localStorage.getItem('cm_user_id');
            const agentReports = allReports.filter(report =>
              report.collector_id?.toString() === currentUserId ||
              report.collector?.id?.toString() === currentUserId
            );

            agentStats = {
              totalMissions: agentReports.length,
              completedMissions: agentReports.filter(r => r.status === 'COMPLETED' || r.status === 'TERMINÉ').length,
              pendingMissions: agentReports.filter(r => r.status === 'IN_PROGRESS' || r.status === 'EN_COURS').length
            };
          }
        } else {
          const response = await fetch(`${API_BASE_URL}/api/reports/my-reports`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (response.ok) {
            reports = await response.json();
          } else if (response.status === 404) {
            const allResponse = await fetch(`${API_BASE_URL}/api/reports/`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });

            if (allResponse.ok) {
              const allData = await allResponse.json();
              const currentUserId = localStorage.getItem('cm_user_id');
              reports = allData.filter(report =>
                report.reporter_id?.toString() === currentUserId ||
                report.user_id?.toString() === currentUserId ||
                report.user?.id?.toString() === currentUserId
              );
            }
          }
        }
      }

      // 2. Calculer les statistiques selon le mode
      let stats;
      if (isAgent && !isCitizenMode) {
        stats = {
          totalReports: agentStats.totalMissions,
          completedReports: agentStats.completedMissions,
          pendingReports: agentStats.pendingMissions
        };
      } else {
        const completed = reports.filter(r => r.status === 'COMPLETED' || r.status === 'TERMINÉ').length;
        const pending = reports.filter(r => r.status === 'PENDING' || r.status === 'EN_ATTENTE').length;

        stats = {
          totalReports: reports.length,
          completedReports: completed,
          pendingReports: pending
        };
      }

      setUserStats(stats);

      // 3. Déterminer le type de profil à afficher
      const showCitizenProfile = !isAgent || isCitizenMode;

      // 4. Formater les données d'abonnement selon le mode
      const userDataFormatted = {
        plan: showCitizenProfile ? 'Citoyen Standard' : 'Agent Municipal Pro',
        status: 'active',
        since: getMemberSince(),
        points: userPoints,
        level: calculateLevel(userPoints),
        stats: stats,
        ...(isAgent && !isCitizenMode && {
          agentStats: agentStats
        })
      };

      setSubscription(userDataFormatted);

    } catch (error) {
      console.error('Erreur chargement données:', error);
      const defaultPoints = parseInt(localStorage.getItem('cm_user_points')) || 0;
      setUserPoints(defaultPoints);
      setUserLevel(calculateLevel(defaultPoints));

      const isAgent = isUserAgent();
      const isCitizenMode = isAgent && currentMode === 'citizen';
      const showCitizenProfile = !isAgent || isCitizenMode;

      const defaultData = {
        plan: showCitizenProfile ? 'Citoyen Standard' : 'Agent Municipal Pro',
        status: 'active',
        since: '2024',
        points: defaultPoints,
        level: calculateLevel(defaultPoints),
        stats: {
          totalReports: 0,
          completedReports: 0,
          pendingReports: 0
        }
      };

      setSubscription(defaultData);
    } finally {
      setLoading(false);
    }
  };

  const calculateLevel = (points) => {
    if (points < 500) return 'Débutant';
    if (points < 1500) return 'Engagé';
    if (points < 3000) return 'Actif';
    if (points < 5000) return 'Expert';
    return 'Élite';
  };

  const getMemberSince = () => {
    const savedDate = localStorage.getItem('cm_user_since');
    if (savedDate) {
      return new Date(savedDate).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
    return '2024';
  };

  const getRoleTitle = () => {
    const role = userRole.toLowerCase();
    switch(role) {
      case 'citoyen': return 'Citoyen';
      case 'ramasseur': return 'Agent de Ramassage';
      case 'superviseur': return 'Superviseur';
      case 'coordinateur': return 'Coordinateur';
      case 'administrateur': return 'Administrateur';
      default: return 'Utilisateur';
    }
  };

  const switchMode = (mode) => {
    if (!isUserAgent()) return;

    setCurrentMode(mode);
    localStorage.setItem('cm_preferred_mode', mode);

    fetchUserData();

    setMessage({
      text: `Mode ${mode === 'agent' ? 'Agent' : 'Citoyen'} activé. Statistiques mises à jour.`,
      type: 'success'
    });

    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const handleUpgradePremium = () => {
    const subscriptionSection = document.getElementById('subscription-section');
    if (subscriptionSection) {
      subscriptionSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const refreshData = () => {
    fetchUserData();
    fetchProfilePicture();
    if (userId) {
      fetchPointsHistory();
    }

    setMessage({
      text: 'Données actualisées avec succès',
      type: 'info'
    });

    setTimeout(() => setMessage({ text: '', type: '' }), 2000);
  };

  const calculateProgressPercentage = (points) => {
    if (points < 500) return (points / 500) * 100;
    if (points < 1500) return ((points - 500) / 1000) * 100;
    if (points < 3000) return ((points - 1500) / 1500) * 100;
    if (points < 5000) return ((points - 3000) / 2000) * 100;
    return 100;
  };

  const calculateNextLevelPoints = (currentPoints) => {
    if (currentPoints < 500) return 500;
    if (currentPoints < 1500) return 1500;
    if (currentPoints < 3000) return 3000;
    if (currentPoints < 5000) return 5000;
    return 10000;
  };

  // ========== NOUVELLES FONCTIONS ==========
  const handleProfilePictureSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({
        text: 'Veuillez sélectionner une image (JPG, PNG, GIF, WEBP)',
        type: 'error'
      });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({
        text: 'L\'image est trop volumineuse. Maximum 5MB.',
        type: 'error'
      });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      return;
    }

    setUploadingProfile(true);

    try {
      const localUrl = URL.createObjectURL(file);
      setProfilePictureUrl(localUrl);

      const serverPath = await uploadProfilePictureToAPI(file);

      let serverUrl;
      if (serverPath) {
        if (serverPath.startsWith('http')) {
          serverUrl = serverPath;
        } else {
          serverUrl = `${API_BASE_URL}${serverPath}`;
        }

        setProfilePictureUrl(serverUrl);
        localStorage.setItem('cm_user_profile_picture', serverUrl);
      }

      setMessage({
        text: 'Photo de profil mise à jour avec succès !',
        type: 'success'
      });

      setTimeout(() => setMessage({ text: '', type: '' }), 3000);

    } catch (error) {
      fetchProfilePicture();

      setMessage({
        text: error.message || 'Erreur lors de l\'upload de la photo',
        type: 'error'
      });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);

    } finally {
      setUploadingProfile(false);
    }
  };

  const handleDeleteProfilePicture = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer votre photo de profil ?')) {
      return;
    }

    setUploadingProfile(true);

    try {
      await deleteProfilePictureFromAPI();

      setProfilePictureUrl('');
      localStorage.removeItem('cm_user_profile_picture');

      setMessage({
        text: 'Photo de profil supprimée avec succès',
        type: 'success'
      });

      setTimeout(() => setMessage({ text: '', type: '' }), 3000);

    } catch (error) {
      setMessage({
        text: error.message || 'Erreur lors de la suppression',
        type: 'error'
      });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);

    } finally {
      setUploadingProfile(false);
    }
  };

  const toggleHistory = () => {
    if (!showHistory && userId) {
      fetchPointsHistory();
    }
    setShowHistory(!showHistory);
  };

  const isAgent = isUserAgent();
  const isCitizenMode = isAgent && currentMode === 'citizen';
  const showCitizenProfile = !isAgent || isCitizenMode;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-golden-brown-50 to-golden-brown-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-golden-brown-600 border-t-transparent rounded-full animate-spin mx-auto border-2 border-golden-brown-700"></div>
          <p className="mt-4 text-warm-gray-600 font-medium">Chargement de votre profil...</p>
          <p className="text-sm text-warm-gray-500 mt-2">Récupération des données de l'API</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative py-16 bg-gradient-to-br from-golden-brown-50 via-amber-50/30 to-golden-brown-200/20">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-golden-brown-500/20 to-amber-600/20 text-golden-brown-800 border border-golden-brown-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_2px_6px_rgba(193,154,107,0.15)]">
                  👤 MON PROFIL
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold text-warm-gray-900 mb-4">
                  Votre espace personnel
                </h1>
                <p className="text-lg text-warm-gray-600 max-w-2xl">
                  Gérez votre profil, suivez votre engagement et accédez à toutes vos fonctionnalités
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <div className="relative">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse border border-emerald-600"></div>
                    <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping"></div>
                  </div>
                  <span className="text-sm text-emerald-700 font-medium">
                    Données connectées à l'API Clean Mboka
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <Link
                    to="/dashboard"
                    className="px-8 py-4 rounded-2xl bg-gradient-to-br from-golden-brown-600 to-amber-600 text-white font-bold shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 flex items-center justify-center gap-3 border border-golden-brown-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_12px_rgba(193,154,107,0.25)] group"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)]">
                      <span className="text-xl font-bold text-golden-brown-700">📊</span>
                    </div>
                    <span>Tableau de Bord</span>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transform group-hover:translate-x-2 transition-all duration-300 border border-white/70">
                      <span className="text-lg font-bold text-amber-600 animate-pulse">→</span>
                    </div>
                  </Link>

                  <button
                    onClick={refreshData}
                    className="px-8 py-4 rounded-2xl bg-gradient-to-br from-white to-warm-gray-100 text-warm-gray-700 font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex items-center justify-center gap-3 border border-golden-brown-400/30 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_3px_10px_rgba(0,0,0,0.06)] group"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-golden-brown-100 to-golden-brown-200 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]">
                      <span className="text-xl font-bold text-golden-brown-700 group-hover:rotate-180 transition-transform">🔄</span>
                    </div>
                    <span>Actualiser</span>
                  </button>
                </div>

                {isAgent && (
                  <div className="text-center">
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border border-golden-brown-400/40 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),0_2px_6px_rgba(193,154,107,0.15)] ${
                      currentMode === 'agent'
                        ? 'bg-gradient-to-br from-white to-golden-brown-100 text-golden-brown-700'
                        : 'bg-gradient-to-br from-white to-emerald-100 text-emerald-700'
                    }`}>
                      {currentMode === 'agent' ? '👷‍♂️ Mode Agent' : '👤 Mode Citoyen'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {message.text && (
              <div className={`mb-6 p-4 rounded-2xl text-center font-semibold border ${
                message.type === "success"
                  ? "border-emerald-300/40 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_2px_8px_rgba(16,185,129,0.15)] bg-gradient-to-r from-emerald-100/80 to-emerald-200/50 text-emerald-700"
                  : message.type === "error"
                  ? "border-red-300/40 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_2px_8px_rgba(239,68,68,0.15)] bg-gradient-to-r from-red-100/80 to-red-200/50 text-red-700"
                  : "border-amber-300/40 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_2px_8px_rgba(245,158,11,0.15)] bg-gradient-to-r from-amber-100/80 to-amber-200/50 text-amber-700"
              }`}>
                {message.text}
              </div>
            )}

            {/* Profile Card */}
            <div className="bg-gradient-to-br from-white to-warm-gray-50/30 rounded-3xl p-8 border border-golden-brown-400/30 shadow-[inset_0_1px_4px_rgba(193,154,107,0.15),0_6px_24px_rgba(0,0,0,0.08)]">
              <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
                {/* Avatar avec upload et suppression */}
                <div className="relative">
                  <div className="w-40 h-40 rounded-full bg-gradient-to-br from-golden-brown-600 to-amber-600 p-1 shadow-lg border border-golden-brown-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_12px_rgba(193,154,107,0.25)]">
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-white to-warm-gray-100 p-2 relative group border border-white/80 shadow-[inset_0_1px_3px_rgba(255,255,255,0.5)]">
                      {profilePictureUrl ? (
                        <div className="w-full h-full rounded-full overflow-hidden border border-golden-brown-400/30">
                          <img
                            src={profilePictureUrl}
                            alt="Photo de profil"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              setProfilePictureUrl('');
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-golden-brown-100 to-amber-100 flex items-center justify-center border border-golden-brown-400/30">
                          <div className="text-5xl font-bold text-golden-brown-700">
                            {userName.charAt(0).toUpperCase()}
                          </div>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <label className="cursor-pointer p-3 rounded-full hover:bg-white/20 transition-colors border border-white/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]">
                          {uploadingProfile ? (
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <span className="text-white text-xl">📷</span>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleProfilePictureSelect}
                            disabled={uploadingProfile}
                          />
                        </label>

                        {profilePictureUrl && !uploadingProfile && (
                          <button
                            onClick={handleDeleteProfilePicture}
                            className="cursor-pointer p-3 rounded-full hover:bg-red-500/30 transition-colors border border-white/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]"
                            title="Supprimer la photo"
                          >
                            <span className="text-white text-xl">🗑️</span>
                          </button>
                        )}
                      </div>

                      {uploadingProfile && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                          <div className="text-center">
                            <div className="w-10 h-10 border-3 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                            <p className="text-white text-xs font-medium">Chargement...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="absolute -top-2 -right-2 px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-golden-brown-600 to-amber-700 text-white shadow-lg border border-amber-600 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_2px_8px_rgba(193,154,107,0.25)]">
                    {getRoleTitle()}
                  </div>

                  {uploadingProfile && (
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg border border-blue-600">
                      Upload...
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1">
                  <div className="mb-8">
                    <h2 className="text-3xl lg:text-4xl font-bold text-warm-gray-900 mb-2">{userName}</h2>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2 px-4 py-2 rounded-full text-emerald-600 bg-gradient-to-r from-emerald-50/50 to-emerald-100/30 border border-emerald-400/40 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_2px_8px_rgba(16,185,129,0.1)]">
                        <div className="relative">
                          <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse border border-emerald-600"></div>
                          <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping"></div>
                        </div>
                        <span className="font-medium">Session Active</span>
                      </div>
                      <div className="px-3 py-1.5 rounded-full text-sm text-warm-gray-600 bg-gradient-to-br from-white to-warm-gray-100 border border-warm-gray-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]">
                        ID: {userId || 'Non spécifié'}
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-white to-golden-brown-100/30 rounded-xl p-4 border border-golden-brown-400/25 shadow-[inset_0_1px_2px_rgba(193,154,107,0.1),0_2px_8px_rgba(0,0,0,0.04)]">
                      <div className="text-sm text-golden-brown-600 font-medium mb-1">📍 Commune</div>
                      <div className="text-lg font-semibold text-warm-gray-900">{userCommune || 'Non spécifiée'}</div>
                    </div>

                    <div className="bg-gradient-to-br from-white to-warm-gray-100 rounded-xl p-4 border border-warm-gray-400/25 shadow-[inset_0_1px_2px_rgba(120,113,108,0.1),0_2px_8px_rgba(0,0,0,0.04)]">
                      <div className="text-sm text-warm-gray-600 font-medium mb-1">🏆 Points</div>
                      <div className="text-lg font-semibold text-warm-gray-900">{userPoints.toLocaleString()} pts</div>
                      <div className="text-xs text-warm-gray-500 mt-1">Niveau {userLevel}</div>
                    </div>

                    <div className="bg-gradient-to-br from-white to-warm-gray-100 rounded-xl p-4 border border-warm-gray-400/25 shadow-[inset_0_1px_2px_rgba(120,113,108,0.1),0_2px_8px_rgba(0,0,0,0.04)]">
                      <div className="text-sm text-warm-gray-600 font-medium mb-1">📅 Membre depuis</div>
                      <div className="text-lg font-semibold text-warm-gray-900">{getMemberSince()}</div>
                    </div>

                    <div className="bg-gradient-to-br from-white to-warm-gray-100 rounded-xl p-4 border border-warm-gray-400/25 shadow-[inset_0_1px_2px_rgba(120,113,108,0.1),0_2px_8px_rgba(0,0,0,0.04)]">
                      <div className="text-sm text-warm-gray-600 font-medium mb-1">📋 Profil actuel</div>
                      <div className="text-lg font-semibold text-warm-gray-900">
                        {showCitizenProfile ? 'Citoyen' : 'Agent'}
                      </div>
                      <div className="text-xs text-warm-gray-500 mt-1">
                        {showCitizenProfile ? 'Mode signalement' : 'Mode gestion'}
                      </div>
                    </div>
                  </div>

                  {isAgent && (
                    <div className="mt-8 p-4 bg-gradient-to-r from-golden-brown-50/50 to-golden-brown-100/30 rounded-xl border border-golden-brown-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_1px_6px_rgba(0,0,0,0.04)]">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-center sm:text-left">
                          <p className="font-semibold text-golden-brown-800">Changer de mode</p>
                          <p className="text-sm text-golden-brown-600">Basculer entre les interfaces</p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => switchMode('agent')}
                            className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 border border-golden-brown-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)] ${
                              currentMode === 'agent'
                                ? 'bg-gradient-to-br from-golden-brown-600 to-amber-600 text-white shadow-lg border-golden-brown-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_12px_rgba(193,154,107,0.2)]'
                                : 'bg-gradient-to-br from-white to-warm-gray-100 text-warm-gray-700 hover:bg-gradient-to-br hover:from-golden-brown-100 hover:to-golden-brown-200'
                            }`}
                          >
                            <span className="text-lg">👷‍♂️</span>
                            <span>Agent</span>
                          </button>
                          <button
                            onClick={() => switchMode('citizen')}
                            className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 border border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.4)] ${
                              currentMode === 'citizen'
                                ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-lg border-emerald-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_12px_rgba(16,185,129,0.2)]'
                                : 'bg-gradient-to-br from-white to-warm-gray-100 text-warm-gray-700 hover:bg-gradient-to-br hover:from-emerald-100 hover:to-emerald-200'
                            }`}
                          >
                            <span className="text-lg">👤</span>
                            <span>Citoyen</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 text-emerald-800 border border-emerald-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_2px_6px_rgba(16,185,129,0.15)]">
                📈 VOS STATISTIQUES {showCitizenProfile ? 'CITOYENNES' : 'AGENT'}
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-warm-gray-900 mb-4">
                {showCitizenProfile ? 'Votre impact citoyen' : 'Votre performance agent'}
              </h2>
              <p className="text-lg text-warm-gray-600 max-w-2xl mx-auto">
                {showCitizenProfile
                  ? 'Données de vos signalements et contributions'
                  : 'Statistiques de vos missions et interventions'}
              </p>
            </div>

            {showCitizenProfile ? (
              // STATISTIQUES CITOYEN (AVEC NOUVELLE CARTE POIDS)
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-golden-brown-600 to-amber-700 rounded-2xl p-8 text-white text-center border border-amber-600/50 shadow-[inset_0_2px_8px_rgba(193,154,107,0.3),0_8px_32px_rgba(193,154,107,0.25)]">
                  <div className="text-5xl font-bold mb-2">{userStats.totalReports || 0}</div>
                  <div className="text-lg font-semibold mb-2">Signalements</div>
                  <div className="text-golden-brown-200">Contributions totales</div>
                  <div className="text-sm text-golden-brown-300 mt-2 border-t border-amber-500/30 pt-2">
                    {userStats.pendingReports || 0} en attente
                  </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-8 text-white text-center border border-emerald-600/50 shadow-[inset_0_2px_8px_rgba(16,185,129,0.3),0_8px_32px_rgba(16,185,129,0.25)]">
                  <div className="text-5xl font-bold mb-2">{userStats.completedReports || 0}</div>
                  <div className="text-lg font-semibold mb-2">Problèmes résolus</div>
                  <div className="text-emerald-200">Signalements traités</div>
                  <div className="text-sm text-emerald-300 mt-2 border-t border-emerald-500/30 pt-2">
                    {userStats.totalReports > 0
                      ? `${Math.round((userStats.completedReports / userStats.totalReports) * 100)}% de succès`
                      : 'Aucun signalement'}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl p-8 text-white text-center border border-purple-600/50 shadow-[inset_0_2px_8px_rgba(168,85,247,0.3),0_8px_32px_rgba(168,85,247,0.25)]">
                  <div className="text-5xl font-bold mb-2">{userPoints.toLocaleString()}</div>
                  <div className="text-lg font-semibold mb-2">Points citoyens</div>
                  <div className="text-purple-200">Éco-citoyens cumulés</div>
                  <div className="text-sm text-purple-300 mt-2 border-t border-purple-500/30 pt-2">
                    Niveau {userLevel}
                  </div>
                </div>

                {/* ========== NOUVELLE CARTE POIDS DÉCHETS ========== */}
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 text-white text-center border border-blue-600/50 shadow-[inset_0_2px_8px_rgba(59,130,246,0.3),0_8px_32px_rgba(59,130,246,0.25)]">
                  <div className="text-5xl font-bold mb-2">
                    {totalWeightKg > 1000 
                      ? `${(totalWeightKg / 1000).toFixed(1)}t` 
                      : `${totalWeightKg} kg`}
                  </div>
                  <div className="text-lg font-semibold mb-2">Déchets collectés</div>
                  <div className="text-blue-200">Poids total vérifié</div>
                  <div className="text-sm text-blue-300 mt-2 border-t border-blue-500/30 pt-2">
                    {totalWeightKg > 0 
                      ? `Soit ${(totalWeightKg / 15).toFixed(0)} brouettes` 
                      : 'Aucune pesée'}
                  </div>
                </div>
                {/* ================================================= */}
              </div>
            ) : (
              // STATISTIQUES AGENT (inchangées)
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-golden-brown-600 to-amber-700 rounded-2xl p-8 text-white text-center border border-amber-600/50 shadow-[inset_0_2px_8px_rgba(193,154,107,0.3),0_8px_32px_rgba(193,154,107,0.25)]">
                  <div className="text-5xl font-bold mb-2">{userStats.totalReports || 0}</div>
                  <div className="text-lg font-semibold mb-2">Missions</div>
                  <div className="text-golden-brown-200">Signalements assignés</div>
                  <div className="text-sm text-golden-brown-300 mt-2 border-t border-amber-500/30 pt-2">
                    {userStats.pendingReports || 0} en cours
                  </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-8 text-white text-center border border-emerald-600/50 shadow-[inset_0_2px_8px_rgba(16,185,129,0.3),0_8px_32px_rgba(16,185,129,0.25)]">
                  <div className="text-5xl font-bold mb-2">{userStats.completedReports || 0}</div>
                  <div className="text-lg font-semibold mb-2">Missions terminées</div>
                  <div className="text-emerald-200">Problèmes résolus</div>
                  <div className="text-sm text-emerald-300 mt-2 border-t border-emerald-500/30 pt-2">
                    {userStats.totalReports > 0
                      ? `${Math.round((userStats.completedReports / userStats.totalReports) * 100)}% de succès`
                      : 'Aucune mission'}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-2xl p-8 text-white text-center border border-amber-600/50 shadow-[inset_0_2px_8px_rgba(245,158,11,0.3),0_8px_32px_rgba(245,158,11,0.25)]">
                  <div className="text-5xl font-bold mb-2">{userPoints.toLocaleString()}</div>
                  <div className="text-lg font-semibold mb-2">Points performance</div>
                  <div className="text-amber-200">Contributions cumulées</div>
                  <div className="text-sm text-amber-300 mt-2 border-t border-amber-500/30 pt-2">
                    Niveau {userLevel}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 p-4 bg-gradient-to-br from-white to-golden-brown-100/30 rounded-xl border border-golden-brown-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_1px_6px_rgba(0,0,0,0.04)]">
              <p className="text-golden-brown-700 text-sm">
                <span className="font-semibold">📊 Source :</span> API Clean Mboka •
                {showCitizenProfile ? ' Signalements' : ' Missions'} : {userStats.totalReports || 0} •
                Résolus : {userStats.completedReports || 0} •
                Points : {userPoints} •
                Poids : {totalWeightKg > 1000 ? `${(totalWeightKg / 1000).toFixed(1)}t` : `${totalWeightKg} kg`}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========== SECTION TIRAGE AU SORT ET RÉCOMPENSES ========== */}
      {showCitizenProfile && (
        <section className="py-16 bg-gradient-to-br from-purple-50/30 via-purple-100/20 to-indigo-50/30">
          <div className="container mx-auto px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="bg-gradient-to-br from-white to-purple-50/30 rounded-2xl p-8 border border-purple-400/30 shadow-[inset_0_1px_4px_rgba(168,85,247,0.15),0_6px_24px_rgba(0,0,0,0.08)]">
                
                {/* Header avec badge éligibilité */}
                <div className="flex flex-col md:flex-row items-center justify-between mb-8">
                  <div>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-purple-500/20 to-purple-600/20 text-purple-800 border border-purple-400/30">
                      🎲 TIRAGE AU SORT ANNUEL
                    </div>
                    <h3 className="text-2xl font-bold text-warm-gray-900 mt-4">
                      Gagnez des lots exceptionnels
                    </h3>
                    <p className="text-warm-gray-600">
                      Plus vous accumulez de points, plus vous avez de chances de gagner !
                    </p>
                  </div>
                  
                  <div className={`mt-4 md:mt-0 px-6 py-4 rounded-xl text-center ${
                    eligibleForLottery
                      ? 'bg-gradient-to-br from-emerald-100 to-emerald-200 border-emerald-400/40 text-emerald-800'
                      : 'bg-gradient-to-br from-amber-100 to-amber-200 border-amber-400/40 text-amber-800'
                  } border shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]`}>
                    <div className="text-3xl mb-1">{eligibleForLottery ? '🎉' : '🎯'}</div>
                    <div className="font-bold">
                      {eligibleForLottery 
                        ? 'Éligible au tirage' 
                        : `${nextReward?.points_manquants || 1000} pts manquants`}
                    </div>
                    <div className="text-xs mt-1">
                      {eligibleForLottery 
                        ? 'Vous participez cette année !' 
                        : 'Atteignez le premier seuil pour participer'}
                    </div>
                  </div>
                </div>

                {/* Grille des récompenses */}
                <div className="mb-8">
                  <h4 className="font-semibold text-warm-gray-900 mb-4 flex items-center gap-2">
                    <span>🏆</span> Lots à gagner
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                      { seuil: 1000, cadeau: 'Kit scolaire', emoji: '📚', color: 'emerald' },
                      { seuil: 2000, cadeau: 'Sac de riz 25kg', emoji: '🍚', color: 'amber' },
                      { seuil: 3500, cadeau: 'Kit nettoyage + Congélateur', emoji: '❄️', color: 'blue' },
                      { seuil: 5000, cadeau: 'Moto', emoji: '🏍️', color: 'purple' },
                      { seuil: 7500, cadeau: 'Véhicule de collecte', emoji: '🚛', color: 'golden-brown' }
                    ].map((lot, idx) => {
                      const isUnlocked = rewardsUnlocked.some(r => r.seuil === lot.seuil);
                      const isNext = nextReward?.seuil === lot.seuil;
                      
                      return (
                        <div 
                          key={idx}
                          className={`
                            relative p-4 rounded-xl text-center border transition-all duration-300
                            ${isUnlocked 
                              ? `bg-gradient-to-br from-${lot.color}-100 to-${lot.color}-200 border-${lot.color}-400/40 shadow-md` 
                              : isNext
                              ? 'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-400/40 border-2 animate-pulse'
                              : 'bg-gradient-to-br from-white to-warm-gray-50 border-warm-gray-400/30 opacity-70'
                            }
                          `}
                        >
                          {isUnlocked && (
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs border border-white shadow-lg">
                              ✓
                            </div>
                          )}
                          <div className="text-3xl mb-2">{lot.emoji}</div>
                          <div className="text-sm font-bold text-warm-gray-900">{lot.cadeau}</div>
                          <div className="text-xs text-warm-gray-600 mt-1">{lot.seuil} pts</div>
                          {isNext && (
                            <div className="mt-2 text-xs font-bold text-amber-700 bg-amber-200/50 px-2 py-1 rounded-full">
                              Prochain objectif
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Barre de progression vers le prochain lot */}
                {nextReward && (
                  <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl border border-amber-400/30">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-warm-gray-700">
                        Prochain lot : <span className="font-bold text-amber-700">{nextReward.cadeau}</span>
                      </span>
                      <span className="text-sm font-bold text-amber-700">
                        {nextReward.points_manquants} pts restants
                      </span>
                    </div>
                    <div className="h-3 bg-gradient-to-br from-amber-100 to-amber-200 rounded-full overflow-hidden border border-amber-400/30">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-1000"
                        style={{ 
                          width: `${Math.min(100, (userPoints / nextReward.seuil) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-warm-gray-600 mt-2 text-center">
                      {eligibleForLottery 
                        ? '✅ Vous êtes déjà éligible ! Continuez pour gagner plus de lots.' 
                        : `Plus que ${nextReward.points_manquants} points pour être éligible au tirage au sort`}
                    </p>
                  </div>
                )}

                {/* Bouton historique des points */}
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={toggleHistory}
                    className="px-6 py-3 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 text-purple-800 font-medium text-sm border border-purple-400/40 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)] hover:shadow-lg transition-all duration-300 flex items-center gap-2"
                  >
                    <span>{showHistory ? '📋' : '📜'}</span>
                    {showHistory ? 'Masquer l\'historique' : 'Voir l\'historique des points'}
                  </button>
                </div>

                {/* Historique des points */}
                {showHistory && (
                  <div className="mt-6 p-4 bg-white rounded-xl border border-purple-400/30 max-h-64 overflow-y-auto">
                    <h5 className="font-bold text-warm-gray-900 mb-3 flex items-center gap-2">
                      <span>📅</span> Derniers gains de points
                    </h5>
                    {pointsHistory.length > 0 ? (
                      <div className="space-y-2">
                        {pointsHistory.slice(0, 10).map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center p-2 bg-purple-50/50 rounded-lg text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-purple-600">
                                {item.type === 'subscription' ? '📆' : '🗑️'}
                              </span>
                              <div>
                                <span className="font-medium text-warm-gray-900">
                                  {item.type === 'subscription' ? 'Abonnement mensuel' : `Signalement #${item.report_id}`}
                                </span>
                                <span className="text-xs text-warm-gray-500 ml-2">
                                  {new Date(item.date).toLocaleDateString('fr-FR')}
                                </span>
                              </div>
                            </div>
                            <span className="font-bold text-emerald-600">+{item.points} pts</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-warm-gray-500 py-4">
                        Aucun historique de points pour le moment.
                        Signalez des déchets et faites-les peser pour gagner des points !
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-6 text-center">
                  <button className="text-sm text-purple-600 hover:text-purple-700 underline underline-offset-2 transition-colors">
                    📋 Voir le règlement complet du tirage au sort
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
      {/* ========== FIN SECTION TIRAGE AU SORT ========== */}

      {/* Rewards Section - Progression et points */}
      <section className="py-16 bg-gradient-to-br from-amber-50/30 via-amber-100/20 to-orange-50/30">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-white to-warm-gray-50/30 rounded-2xl p-8 border border-amber-400/30 shadow-[inset_0_1px_4px_rgba(193,154,107,0.15),0_6px_24px_rgba(0,0,0,0.08)]">
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-800 border border-amber-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_2px_6px_rgba(245,158,11,0.15)]">
                  🏆 VOTRE PROGRESSION
                </div>
                <div className="text-center mb-6">
                  <div className="text-5xl font-bold text-warm-gray-900 mb-2">{userPoints.toLocaleString()}</div>
                  <div className="text-lg text-warm-gray-600">Points cumulés</div>
                  <div className="text-sm text-amber-600 mt-2">
                    Niveau actuel : <span className="font-bold">{userLevel}</span>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="h-3 bg-gradient-to-br from-amber-100 to-amber-200 rounded-full overflow-hidden border border-amber-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-1000 shadow-[inset_0_1px_3px rgba(255,255,255,0.3)]"
                      style={{ width: `${calculateProgressPercentage(userPoints)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm text-warm-gray-600 mt-2">
                    <span>Niveau {userLevel}</span>
                    <span>Prochain : {calculateNextLevelPoints(userPoints).toLocaleString()} pts</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-warm-gray-900">🎯 Progression des niveaux</h4>
                  {[
                    { points: 500, level: 'Débutant', current: userLevel === 'Débutant' },
                    { points: 1500, level: 'Engagé', current: userLevel === 'Engagé' },
                    { points: 3000, level: 'Actif', current: userLevel === 'Actif' },
                    { points: 5000, level: 'Expert', current: userLevel === 'Expert' },
                    { points: 10000, level: 'Élite', current: userLevel === 'Élite' }
                  ].map((goal, idx) => (
                    <div key={idx} className={`p-4 rounded-xl border shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)] ${
                      goal.current
                        ? 'bg-gradient-to-br from-emerald-50/50 to-emerald-100/30 border border-emerald-400/40'
                        : 'bg-gradient-to-br from-white/50 to-warm-gray-50/30 border border-amber-400/30'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center border shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)] ${
                            goal.current
                              ? 'bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-700 border-emerald-400/40'
                              : 'bg-gradient-to-br from-amber-100 to-amber-200 text-amber-700 border-amber-400/40'
                          }`}>
                            {goal.current ? '⭐' : (idx + 1)}
                          </div>
                          <div>
                            <div className="font-semibold text-warm-gray-900">Niveau {goal.level}</div>
                            <div className="text-sm text-warm-gray-500">{goal.points.toLocaleString()} points requis</div>
                          </div>
                        </div>
                        <div className={`px-4 py-2 rounded-full text-sm font-bold border shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)] ${
                          goal.current
                            ? 'bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-800 border-emerald-400/40'
                            : 'bg-gradient-to-br from-golden-brown-100 to-golden-brown-200 text-golden-brown-800 border-golden-brown-400/40'
                        }`}>
                          {goal.current ? 'Actuel' : `${Math.max(0, goal.points - userPoints)} pts restants`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-gradient-to-br from-white/50 to-amber-100/30 rounded-xl mb-4 border border-amber-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]">
                <p className="text-sm text-warm-gray-700">
                  <span className="font-semibold">💡 Comment gagner des points :</span><br/>
                  • {showCitizenProfile ? 'Signalement avec description détaillée' : 'Mission complétée'} : jusqu'à 30 points<br/>
                  • Poids des déchets : 2 points par kg<br/>
                  • Abonnement mensuel actif : +10 points/mois<br/>
                  • Confirmation rapide : +20 points bonus
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex-1 py-4 rounded-2xl bg-gradient-to-br from-golden-brown-600 to-amber-600 text-white font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 flex items-center justify-center gap-3 border border-golden-brown-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_12px_rgba(193,154,107,0.25)] group"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)]">
                    <span className="text-xl font-bold text-golden-brown-700">📊</span>
                  </div>
                  <span>Tableau de bord</span>
                </button>
                <button
                  onClick={refreshData}
                  className="px-6 py-4 rounded-2xl bg-gradient-to-br from-white to-warm-gray-100 text-warm-gray-700 font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_3px_10px_rgba(0,0,0,0.06)]"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-golden-brown-100 to-golden-brown-200 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]">
                    <span className="text-xl font-bold text-golden-brown-700">🔄</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== SECTION ABONNEMENT PREMIUM - CORRIGÉE AVEC CHARGEMENT ========== */}
      <section id="subscription-section" className="py-16 bg-gradient-to-br from-golden-brown-800 to-amber-900">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            
            {/* ========== CORRECTION 3: AFFICHAGE CONDITIONNEL PENDANT CHARGEMENT ========== */}
            {activeSubscription === null ? (
              <div className="text-center text-white py-12">
                <div className="inline-block w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-amber-200">Chargement de votre abonnement...</p>
              </div>
            ) : (
              <>
                <div className="text-center mb-12">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-100 border border-amber-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_2px_6px_rgba(245,158,11,0.15)]">
                    💎 {activeSubscription?.is_active ? 'ABONNEMENT ACTIF' : 'PASSER À PREMIUM'}
                  </div>
                  <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                    {activeSubscription?.is_active ? 'Merci pour votre soutien !' : 'Accédez à toutes les fonctionnalités'}
                  </h2>
                  <p className="text-lg text-amber-200 max-w-2xl mx-auto">
                    {activeSubscription?.is_active 
                      ? 'Votre abonnement Premium est actif. Vous bénéficiez de tous les avantages.'
                      : 'Passez à Premium pour débloquer des fonctionnalités avancées et soutenir le service'}
                  </p>
                </div>

                {/* Carte de tarification avec statut abonnement */}
                <div className="max-w-md mx-auto">
                  <div className="relative bg-gradient-to-br from-white to-warm-gray-50 p-8 rounded-2xl border border-amber-500/50 shadow-[inset_0_1px_4px rgba(255,255,255,0.3),0_8px_32px_rgba(193,154,107,0.3)]">
                    
                    {/* Badge RECOMMANDÉ ou ACTIF */}
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className={`text-white text-sm font-bold px-4 py-2 rounded-full border shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_4px_12px_rgba(245,158,11,0.25)] ${
                        activeSubscription?.is_active
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 border-emerald-400'
                          : 'bg-gradient-to-r from-amber-500 to-orange-600 border-amber-400'
                      }`}>
                        {activeSubscription?.is_active ? '✓ ABONNEMENT ACTIF' : 'ABONNEMENT RECOMMANDÉ'}
                      </span>
                    </div>

                    <h3 className="text-2xl font-bold text-warm-gray-900 mb-2">Premium Clean Mboka</h3>
                    <p className="text-warm-gray-600 mb-6">Accès complet à toutes les fonctionnalités avancées</p>

                    {activeSubscription?.is_active ? (
                      // Affichage pour abonné
                      <div className="mb-6">
                        <div className="flex items-baseline justify-center">
                          <span className="text-3xl font-bold text-emerald-600">✓ Actif</span>
                        </div>
                        {/* ========== CORRECTION 4: DATE DYNAMIQUE ========== */}
                        <div className="text-sm text-warm-gray-500 mt-1 text-center">
                          {activeSubscription?.current_subscription?.end_date 
                            ? `Valable jusqu'au ${new Date(activeSubscription.current_subscription.end_date).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}`
                            : 'Abonnement actif'}
                          {activeSubscription?.days_until_expiry && activeSubscription.days_until_expiry < 5 && (
                            <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-bold">
                              Expire dans {activeSubscription.days_until_expiry} jour{activeSubscription.days_until_expiry > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        {/* ================================================ */}
                      </div>
                    ) : (
                      // Affichage pour non-abonné
                      <>
                        <div className="mb-6">
                          <div className="flex items-baseline">
                            <span className="text-5xl font-bold text-golden-brown-700">2 250</span>
                            <span className="text-lg text-warm-gray-600 ml-2">FC/mois</span>
                          </div>
                          <div className="text-sm text-warm-gray-500 mt-1">
                            Soit environ 1 USD • Renouvellement mensuel
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setMessage({
                              text: "Sélectionnez votre mode de paiement ci-dessous",
                              type: "info"
                            });

                            const paymentSection = document.getElementById('payment-section');
                            if (paymentSection) {
                              paymentSection.scrollIntoView({ behavior: 'smooth' });
                            }
                          }}
                          className="w-full py-5 rounded-2xl bg-gradient-to-br from-amber-600 to-orange-600 text-white font-bold shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 flex items-center justify-center gap-3 border border-amber-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_12px_rgba(245,158,11,0.25)] group"
                        >
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px_rgba(255,255,255,0.5)]">
                            <span className="text-2xl font-bold text-amber-700">💎</span>
                          </div>
                          <span>S'abonner maintenant - 2 250 FC</span>
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transform group-hover:translate-x-2 transition-all duration-300 border border-white/70">
                            <span className="text-lg font-bold text-amber-600 animate-pulse">→</span>
                          </div>
                        </button>
                      </>
                    )}

                    <p className="text-xs text-warm-gray-500 mt-4 text-center">
                      {activeSubscription?.is_active 
                        ? 'Annulation à tout moment depuis votre profil'
                        : 'Annulation à tout moment • Paiement sécurisé'}
                    </p>
                  </div>
                </div>

                {/* Section des moyens de paiement - visible uniquement pour non-abonnés */}
                {!activeSubscription?.is_active && (
                  <div id="payment-section" className="mt-12 bg-white/10 backdrop-blur-sm p-8 rounded-2xl border border-amber-400/30 shadow-[inset_0_1px_4px_rgba(255,255,255,0.2),0_8px_32px_rgba(0,0,0,0.1)]">
                    <h3 className="text-2xl font-bold text-white mb-6 text-center">Moyens de Paiement Locaux</h3>
                    <p className="text-amber-200 text-center mb-8">
                      Paiement 100% sécurisé via les solutions locales
                    </p>

                    <div className="flex flex-wrap justify-center items-center gap-8">
                      {/* M-Pesa */}
                      <div className="bg-gradient-to-br from-white to-warm-gray-50 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-emerald-400/40">
                        <div className="w-24 h-24 flex items-center justify-center">
                          <img
                            src="/data/images/mpesa-logo.jpg"
                            alt="M-Pesa Logo"
                            title="M-Pesa"
                            className="h-16 w-auto object-contain"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 50'%3E%3Crect width='100' height='50' fill='%2300A859' rx='8'/%3E%3Ctext x='50' y='30' font-family='Arial' font-size='18' fill='white' text-anchor='middle' font-weight='bold'%3EM-PESA%3C/text%3E%3C/svg%3E";
                            }}
                          />
                        </div>
                        <p className="text-center text-sm font-bold text-emerald-700 mt-2">M-Pesa</p>
                      </div>

                      {/* Orange Money */}
                      <div className="bg-gradient-to-br from-white to-warm-gray-50 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-orange-400/40">
                        <div className="w-24 h-24 flex items-center justify-center">
                          <img
                            src="/data/images/orange-money-logo.png"
                            alt="Orange Money Logo"
                            title="Orange Money"
                            className="h-16 w-auto object-contain"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 50'%3E%3Crect width='100' height='50' fill='%23FF6600' rx='8'/%3E%3Ctext x='50' y='30' font-family='Arial' font-size='14' fill='white' text-anchor='middle' font-weight='bold'%3EOrange Money%3C/text%3E%3C/svg%3E";
                            }}
                          />
                        </div>
                        <p className="text-center text-sm font-bold text-orange-700 mt-2">Orange Money</p>
                      </div>

                      {/* Airtel Money */}
                      <div className="bg-gradient-to-br from-white to-warm-gray-50 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-red-400/40">
                        <div className="w-24 h-24 flex items-center justify-center">
                          <img
                            src="/data/images/airtel-money-logo.jpg"
                            alt="Airtel Money Logo"
                            title="Airtel Money"
                            className="h-16 w-auto object-contain"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 50'%3E%3Crect width='100' height='50' fill='%23E11A2B' rx='8'/%3E%3Ctext x='50' y='30' font-family='Arial' font-size='14' fill='white' text-anchor='middle' font-weight='bold'%3EAirtel Money%3C/text%3E%3C/svg%3E";
                            }}
                          />
                        </div>
                        <p className="text-center text-sm font-bold text-red-700 mt-2">Airtel Money</p>
                      </div>
                    </div>

                    <div className="mt-8 flex flex-col items-center justify-center">
                      <div className="flex items-center mb-2">
                        <svg className="h-6 w-6 text-emerald-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm text-amber-100 font-semibold">Paiement 100% sécurisé</p>
                      </div>
                      <p className="text-xs text-amber-200 text-center">
                        Toutes les transactions sont cryptées et protégées
                      </p>
                    </div>

                    <div className="mt-6 p-4 bg-white/5 rounded-xl border border-amber-400/20">
                      <h4 className="font-bold text-amber-100 mb-3 text-center">📱 Comment payer ?</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-amber-300 font-bold mb-1">1. Choisir l'offre</div>
                          <p className="text-amber-200 text-xs">Cliquez sur "S'abonner maintenant"</p>
                        </div>
                        <div className="text-center">
                          <div className="text-amber-300 font-bold mb-1">2. Sélectionner l'opérateur</div>
                          <p className="text-amber-200 text-xs">Choisissez M-Pesa, Orange Money ou Airtel Money</p>
                        </div>
                        <div className="text-center">
                          <div className="text-amber-300 font-bold mb-1">3. Compléter le paiement</div>
                          <p className="text-amber-200 text-xs">Suivez les instructions USSD/SMS reçues</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 rounded-xl border border-emerald-400/30">
                      <p className="text-sm text-emerald-100 text-center">
                        <span className="font-bold">🎯 Avantage Premium :</span>
                        En vous abonnant, vous contribuez directement à améliorer les services
                        de propreté urbaine dans votre commune !
                      </p>
                    </div>
                  </div>
                )}

                {/* FAQ abonnement */}
                <div className="mt-12 bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-amber-400/20">
                  <h3 className="text-2xl font-bold text-white mb-6 text-center">Questions Fréquentes</h3>

                  <div className="space-y-4">
                    <div className="bg-white/10 p-4 rounded-xl border border-white/10">
                      <h4 className="font-bold text-amber-100 mb-2">🤔 Comment fonctionne l'abonnement ?</h4>
                      <p className="text-amber-200 text-sm">
                        L'abonnement est mensuel (2 250 FC). Il se renouvelle automatiquement chaque mois.
                        Vous pouvez annuler à tout moment depuis votre profil.
                      </p>
                    </div>

                    <div className="bg-white/10 p-4 rounded-xl border border-white/10">
                      <h4 className="font-bold text-amber-100 mb-2">💳 Quels sont les modes de paiement ?</h4>
                      <p className="text-amber-200 text-sm">
                        Nous acceptons M-Pesa, Orange Money et Airtel Money. Le paiement se fait via
                        des codes USSD/SMS sécurisés.
                      </p>
                    </div>

                    <div className="bg-white/10 p-4 rounded-xl border border-white/10">
                      <h4 className="font-bold text-amber-100 mb-2">🔄 Puis-je annuler mon abonnement ?</h4>
                      <p className="text-amber-200 text-sm">
                        Oui, vous pouvez annuler à tout moment. Vous gardez l'accès premium jusqu'à
                        la fin de la période payée.
                      </p>
                    </div>

                    <div className="bg-white/10 p-4 rounded-xl border border-white/10">
                      <h4 className="font-bold text-amber-100 mb-2">🎁 Que se passe-t-il si je suis agent municipal ?</h4>
                      <p className="text-amber-200 text-sm">
                        Les agents municipaux bénéficient de l'accès Premium gratuitement grâce à
                        leur statut. Contactez votre administrateur pour plus d'informations.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
            {/* ================================================================ */}
            
          </div>
        </div>
      </section>
      {/* ========== FIN SECTION ABONNEMENT ========== */}

      {/* Footer */}
      <footer className="bg-warm-gray-900 text-white py-12 border-t border-golden-brown-800">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center">
              <p className="text-white/70 text-lg mb-4">
                Votre engagement fait la différence pour Kinshasa
              </p>
              <p className="text-white/50 text-sm">
                © {new Date().getFullYear()} Clean Mboka - Programme Municipal de Salubrité Urbaine
              </p>
              <p className="text-white/40 text-xs mt-2">
                Hôtel de Ville de Kinshasa • Avenue des Aviateurs, Gombe
              </p>
              <div className="mt-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-golden-brown-900/30 to-golden-brown-800/30 border border-golden-brown-700/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]">
                  <div className="relative">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse border border-emerald-600"></div>
                    <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping"></div>
                  </div>
                  <span className="text-golden-brown-300 text-xs">Connecté à l'API • Données réelles</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Moi;
