// pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import {Link, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from "../api";
import SimpleCommuneMap from '../components/SimpleCommuneMap';

function Dashboard() {
  const navigate = useNavigate();

  // --- GESTION DE SESSION ---
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('cm_token') ? true : false;
  });

  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userId, setUserId] = useState('');
  const [userCommune, setUserCommune] = useState('');
  const [userPoints, setUserPoints] = useState(0);

  // --- VARIABLES GLOBALES DASHBOARD ---
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [description, setDescription] = useState("");
  const [token, setToken] = useState(localStorage.getItem('cm_token') || "");
  const [message, setMessage] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);

  // --- VARIABLES POUR TOUS LES UTILISATEURS ---
  const [missions, setMissions] = useState([]);
  const [myReports, setMyReports] = useState([]);
  const [missionsLoading, setMissionsLoading] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [selectedMission, setSelectedMission] = useState(null);
  const [activeTab, setActiveTab] = useState('missions');

  // --- NOUVELLES VARIABLES POUR LA CARTE ---
  const [selectedQuartierDetails, setSelectedQuartierDetails] = useState(null);
  const [showMap, setShowMap] = useState(false);

  // --- VARIABLES LOGIN ---
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [manualToken, setManualToken] = useState("");

  // --- VARIABLES GPS MANUEL ---
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");

  // --- NOUVELLES VARIABLES POUR LES CITOYENS ---
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  // --- NOUVELLE VARIABLE POUR LE MODE ---
  const [currentMode, setCurrentMode] = useState(() => {
    return localStorage.getItem('cm_preferred_mode') || 'agent';
  });

  // --- VARIABLE POUR LA PHOTO DE PROFIL ---
  const [profilePictureUrl, setProfilePictureUrl] = useState('');

  // --- NOUVELLES VARIABLES POUR LE SYSTÈME PHOTO-CONFIRMATION ---
  const [cleanupPhoto, setCleanupPhoto] = useState(null);
  const [cleanupPhotoFile, setCleanupPhotoFile] = useState(null); // NOUVEAU: Stocker le fichier original
  const [cleanupNotes, setCleanupNotes] = useState("");
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [missionToComplete, setMissionToComplete] = useState(null);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [reportToDispute, setReportToDispute] = useState(null);

// --- VÉRIFICATION DES PERMISSIONS ADMIN ---
const isAdminUser = () => {
  const currentRole = userRole || localStorage.getItem('cm_user_role') || '';
  const normalizedRole = currentRole.toLowerCase();
  return normalizedRole === 'administrateur' || normalizedRole === 'admin';
};
// Détection Coordinateur
const isCoordinatorUser = () => {
  const currentRole = userRole || localStorage.getItem('cm_user_role') || '';
  const normalizedRole = currentRole.toLowerCase();
  return normalizedRole === 'coordinateur' || normalizedRole === 'coordinator';
};
// Détection Superviseur
const isSupervisorUser = () => {
  const currentRole = userRole || localStorage.getItem('cm_user_role') || '';
  const normalizedRole = currentRole.toLowerCase();
  return normalizedRole === 'superviseur' || normalizedRole === 'supervisor';
};
  // --- Fonction pour déterminer si l'utilisateur est un agent par rôle ---
  const isUserAgentByRole = () => {
    const currentRole = userRole || localStorage.getItem('cm_user_role') || '';
    const normalizedRole = currentRole.toLowerCase();
    const agentRoles = ['ramasseur', 'superviseur', 'coordinateur', 'administrateur'];
    return agentRoles.includes(normalizedRole);
  };

  // --- API LOGIN ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=password&username=${encodeURIComponent(loginPhone)}&password=${encodeURIComponent(loginPassword)}&scope=&client_id=string&client_secret=********`
      });

      const data = await response.json();

      if (response.ok) {
        // Stocker avec les deux noms pour compatibilité
        localStorage.setItem('access_token', data.access_token); // Nom standard
        localStorage.setItem('cm_token', data.access_token);      // Votre nom actuel
        setToken(data.access_token);
        setMessage({ text: "Connexion réussie. Chargement...", type: "success" });

        await fetchUserInfo(data.access_token);

        setTimeout(() => {
          setIsLoggedIn(true);
          setMessage({ text: "", type: "" });
        }, 1000);
      } else {
        setMessage({ text: "Erreur d'authentification", type: "error" });
      }
    } catch (error) {
      setMessage({ text: "Erreur de connexion au serveur", type: "error" });
    } finally {
      setLoading(false);
    }
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
      let points = 0;
      let profile_picture = '';

      // Extraction des données
      if (userData.role) {
        role = userData.role;
        name = userData.full_name || userData.name || userData.username || 'Utilisateur';
        id = userData.id || userData.user_id || '';
        commune = userData.commune || '';
        points = userData.points || 0;
        profile_picture = userData.profile_picture || '';
      } else if (userData.user) {
        role = userData.user.role || '';
        name = userData.user.full_name || userData.user.name || 'Utilisateur';
        id = userData.user.id || '';
        commune = userData.user.commune || '';
        points = userData.user.points || 0;
        profile_picture = userData.user.profile_picture || '';
      } else {
        role = userData.role || userData.Role || '';
        name = userData.full_name || userData.Full_Name || userData.name || 'Utilisateur';
        id = userData.id || userData.Id || '';
        commune = userData.commune || '';
        points = userData.points || 0;
        profile_picture = userData.profile_picture || '';
      }

      // === CORRECTION ULTRA-SIMPLE POUR LA PHOTO DE PROFIL ===
      let fullProfilePictureUrl = '';
      
      if (profile_picture) {
        // Nettoyer les doubles slashes
        let cleanPath = profile_picture.replace(/\/\//g, '/');
        
        // Si c'est déjà une URL complète
        if (cleanPath.startsWith('http')) {
          fullProfilePictureUrl = cleanPath;
        }
        // Si ça commence par /static/profile_pictures/
        else if (cleanPath.includes('/static/profile_pictures/')) {
          fullProfilePictureUrl = `${API_BASE_URL}${cleanPath}`;
        }
        // Si ça commence par static/profile_pictures/ (sans slash devant)
        else if (cleanPath.includes('static/profile_pictures/')) {
          fullProfilePictureUrl = `${API_BASE_URL}/${cleanPath}`;
        }
        // Si c'est juste le nom du fichier
        else {
          fullProfilePictureUrl = `${API_BASE_URL}/static/profile_pictures/${cleanPath}`;
        }
        
        // DERNIER NETTOYAGE : enlever les doubles slashes dans l'URL finale
        fullProfilePictureUrl = fullProfilePictureUrl.replace(/([^:]\/)\/+/g, '$1');
      }

      console.log('✅ Photo profil finale:', fullProfilePictureUrl);

      // Mise à jour des states
      setUserRole(role);
      setUserName(name);
      setUserId(id);
      setUserCommune(commune);
      setUserPoints(points);
      setProfilePictureUrl(fullProfilePictureUrl);

      // Sauvegarde localStorage
      localStorage.setItem('cm_user_role', role);
      localStorage.setItem('cm_user_name', name);
      localStorage.setItem('cm_user_id', id);
      localStorage.setItem('cm_user_commune', commune);
      localStorage.setItem('cm_user_points', points.toString());
      localStorage.setItem('cm_user_profile_picture', fullProfilePictureUrl);

      // Mode agent/citoyen
      const normalizedRole = role.toLowerCase();
      const agentRoles = ['ramasseur', 'superviseur', 'coordinateur', 'administrateur'];

      if (agentRoles.includes(normalizedRole)) {
        setCurrentMode('agent');
        localStorage.setItem('cm_preferred_mode', 'agent');
        fetchMissions(userToken);
        setActiveTab('missions');
      } else {
        setCurrentMode('citizen');
        localStorage.setItem('cm_preferred_mode', 'citizen');
        fetchMyReports(userToken);
        setActiveTab('signalement');
      }
    }
  } catch (error) {
    console.error("Erreur récupération infos utilisateur:", error);
  }
};

  // --- CHARGER LES MISSIONS POUR COLLECTEURS ---
  const fetchMissions = async (userToken) => {
    if (!userToken) return;

    setMissionsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        setMissions(data);
      }
    } catch (error) {
      console.error("Erreur chargement missions:", error);
    } finally {
      setMissionsLoading(false);
    }
  };

  // --- CHARGER L'HISTORIQUE DES MISSIONS ---
  const fetchHistory = async (userToken) => {
    if (!userToken) return;

    setMissionsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/history?days=30`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        setMissions(data);
      } else {
        fetchMissions(userToken);
      }
    } catch (error) {
      console.error("Erreur chargement historique:", error);
      fetchMissions(userToken);
    } finally {
      setMissionsLoading(false);
    }
  };

  // --- CHARGER LES SIGNALEMENTS DU CITOYEN ---
  const fetchMyReports = async (userToken) => {
    if (!userToken) return;

    setReportsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/my-reports`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        setMyReports(data);
      } else if (response.status === 404) {
        const allResponse = await fetch(`${API_BASE_URL}/api/reports/`, {
          headers: { 'Authorization': `Bearer ${userToken}` }
        });

        if (allResponse.ok) {
          const allData = await allResponse.json();
          setMyReports(allData);
        }
      }
    } catch (error) {
      console.error("Erreur chargement mes signalements:", error);
    } finally {
      setReportsLoading(false);
    }
  };

  // --- FONCTIONS POUR LES CITOYENS ---
  const handleDeleteReport = async (reportId) => {
    if (!token) {
      setMessage({ text: "Session expirée. Veuillez vous reconnecter.", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}/citizen`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({
          text: data.message || "Signalement supprimé avec succès",
          type: "success"
        });
        fetchMyReports(token);
      } else {
        const errorData = await response.json();
        setMessage({ text: errorData.detail || "Erreur lors de la suppression", type: "error" });
      }
    } catch (error) {
      setMessage({ text: "Erreur réseau", type: "error" });
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
    }
  };

  const handleConfirmCollection = async (reportId) => {
    if (!token) {
      setMessage({ text: "Session expirée. Veuillez vous reconnecter.", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}/confirm-collection`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const messageText = (isAgent && currentMode === 'citizen')
          ? `${data.message} ! Signalement confirmé en tant que citoyen.`
          : `${data.message} ! Votre contribution compte.`;

        setMessage({
          text: messageText,
          type: "success"
        });

        fetchMyReports(token);
      } else {
        const errorData = await response.json();
        setMessage({ text: errorData.detail || "Erreur de confirmation", type: "error" });
      }
    } catch (error) {
      setMessage({ text: "Erreur réseau", type: "error" });
    } finally {
      setLoading(false);
      setShowConfirmModal(false);
    }
  };

  const checkCanConfirm = async (reportId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}/can-confirm`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        return data.can_confirm;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  // --- PRENDRE UNE MISSION ---
  const handleTakeMission = async (missionId) => {
    if (!token) {
      setMessage({ text: "Session expirée. Veuillez vous reconnecter.", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/${missionId}`, {
        method: "PUT",
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: "IN_PROGRESS",
          collector_id: parseInt(userId) || 0
        })
      });

      if (response.ok) {
        setMessage({ text: "Mission acceptée avec succès !", type: "success" });

        if (activeTab === 'missions') {
          fetchMissions(token);
        } else if (activeTab === 'history') {
          fetchHistory(token);
        }

        setTimeout(() => setMessage({text: "", type: ""}), 3000);
      } else {
        const errorData = await response.json();
        setMessage({ text: "Erreur lors de l'acceptation", type: "error" });
      }
    } catch (error) {
      setMessage({ text: "Erreur réseau", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // --- TERMINER UNE MISSION ---
  const handleCompleteMission = async (missionId) => {
    // Vérifier que missionId est valide
    const id = parseInt(missionId);
    if (isNaN(id) || id <= 0) {
      setMessage({ text: "ID de mission invalide", type: "error" });
      return;
    }
    
    console.log('Mission à compléter:', id); // Debug
    setMissionToComplete(id);
    setShowCleanupModal(true);
  };

  // --- NOUVELLE FONCTION : SOUMETTRE PHOTO DE NETTOYAGE ---
  const handleSubmitCleanupPhoto = async () => {
    if (!cleanupPhoto || !missionToComplete) {
      setMessage({ text: "Veuillez prendre une photo de preuve", type: "error" });
      return;
    }

    if (!token) {
      setMessage({ text: "Session expirée. Veuillez vous reconnecter.", type: "error" });
      return;
    }

    setLoading(true);
    try {
      // CORRECTION: Utiliser FormData au lieu de JSON
      const formData = new FormData();
      
      // Si on a le fichier original, l'utiliser
      if (cleanupPhotoFile) {
        formData.append('photo', cleanupPhotoFile);
      } else {
        // Sinon, convertir DataURL en Blob
        const response = await fetch(cleanupPhoto);
        const blob = await response.blob();
        formData.append('photo', blob, 'cleanup-photo.jpg');
      }
      
      if (cleanupNotes) {
        formData.append('notes', cleanupNotes);
      }
      
      // Vérifier que missionToComplete est un nombre valide
      const reportId = parseInt(missionToComplete);
      if (isNaN(reportId) || reportId <= 0) {
        setMessage({ text: "ID de mission invalide", type: "error" });
        return;
      }
      
      // Envoyer la requête avec FormData
      const apiResponse = await fetch(`${API_BASE_URL}/api/reports/${reportId}/submit-cleanup-photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // NE PAS mettre 'Content-Type' pour FormData
        },
        body: formData
      });

      if (apiResponse.ok) {
        const data = await apiResponse.json();
        setMessage({ 
          text: "✅ Photo soumise! En attente de confirmation citoyenne", 
          type: "success" 
        });
        setShowCleanupModal(false);
        setCleanupPhoto(null);
        setCleanupPhotoFile(null);
        setCleanupNotes("");
        
        // Recharger les données
        if (activeTab === 'missions') {
          fetchMissions(token);
        } else if (activeTab === 'history') {
          fetchHistory(token);
        }
        
        setTimeout(() => setMessage({text: "", type: ""}), 5000);
      } else if (apiResponse.status === 401) {
        setMessage({ 
          text: "Session expirée. Veuillez vous reconnecter.", 
          type: "error" 
        });
        handleLogout();
      } else {
        const errorData = await apiResponse.json().catch(() => ({}));
        setMessage({ 
          text: errorData.detail || `Erreur ${apiResponse.status} lors de la soumission`, 
          type: "error" 
        });
      }
    } catch (error) {
      console.error("Erreur détaillée:", error);
      setMessage({ 
        text: "Erreur réseau lors de la soumission. Vérifiez la connexion.", 
        type: "error" 
      });
    } finally {
      setLoading(false);
    }
  };

  // --- NOUVELLE FONCTION : CONFIRMER/REFUSER COLLECTE (CITOYEN) ---
  const handleConfirmCleanup = async (reportId, confirmed, reason = "") => {
    if (!token) {
      setMessage({ text: "Session expirée. Veuillez vous reconnecter.", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}/confirm-cleanup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          confirmed: confirmed,
          dispute_reason: confirmed ? null : reason
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({ 
          text: confirmed 
            ? "✅ Collecte confirmée! +100 points" 
            : "⚠️ Collecte refusée. Un superviseur va examiner la situation.", 
          type: confirmed ? "success" : "warning"
        });
        
        // Recharger les données
        fetchMyReports(token);
        setShowDisputeModal(false);
        setDisputeReason("");
        
        setTimeout(() => setMessage({text: "", type: ""}), 5000);
      } else {
        const errorData = await response.json();
        setMessage({ text: errorData.detail || "Erreur lors de la confirmation", type: "error" });
      }
    } catch (error) {
      setMessage({ text: "Erreur lors de la confirmation", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // --- API TOKEN DIRECT ---
  const handleTokenAccess = async () => {
    if (!manualToken.trim()) {
      setMessage({ text: "Veuillez saisir un jeton", type: "error" });
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/me`, {
        headers: { 'Authorization': `Bearer ${manualToken}` }
      });

      if (response.ok) {
        localStorage.setItem('cm_token', manualToken);
        setToken(manualToken);
        await fetchUserInfo(manualToken);
        setIsLoggedIn(true);
      } else {
        setMessage({ text: "Token invalide ou expiré", type: "error" });
      }
    } catch {
      setMessage({ text: "Erreur de vérification", type: "error" });
    }
  };

  // --- DASHBOARD LOGIC ---
  const getPosition = () => {
    if (navigator.geolocation) {
      setMessage({ text: "Acquisition satellite...", type: "info" });
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLat(position.coords.latitude);
          setLng(position.coords.longitude);
          setMessage({ text: "Position verrouillée.", type: "success" });
        },
        (error) => {
          let errMsg = "Erreur GPS.";
          if (error.code === error.PERMISSION_DENIED) errMsg = "Permission refusée.";
          if (error.code === error.POSITION_UNAVAILABLE) errMsg = "GPS indisponible.";
          if (error.code === error.TIMEOUT) errMsg = "Timeout.";

          setMessage({ text: errMsg + " (Utilisez le mode manuel)", type: "error" });
        }
      );
    } else {
      setMessage({ text: "GPS absent.", type: "error" });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token.trim()) {
      setMessage({ text: "Session expirée. Veuillez vous reconnecter.", type: "error" });
      setIsLoggedIn(false);
      return;
    }

    setLoading(true);

    const finalLat = lat !== null ? lat : parseFloat(manualLat);
    const finalLng = lng !== null ? lng : parseFloat(manualLng);

    if (isNaN(finalLat) || isNaN(finalLng)) {
      setMessage({ text: "Coordonnées invalides. Exemple: -4.44, 15.26", type: "error" });
      setLoading(false);
      return;
    }

    if (!selectedFile) {
      setMessage({ text: "Photo requise.", type: "error" });
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("photo", selectedFile);
    formData.append("latitude", finalLat.toString());
    formData.append("longitude", finalLng.toString());
    formData.append("description", description);

    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token.trim()}`
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ text: "✅ Signalement transmis avec succès !", type: "success" });
        setDescription("");
        setSelectedFile(null);
        setManualLat("");
        setManualLng("");
        setLat(null);
        setLng(null);

        if (!shouldShowAgentInterface) {
          fetchMyReports(token);
          setActiveTab('myreports');
        }

        setTimeout(() => setMessage({text: "", type: ""}), 4000);
      } else {
        setMessage({
          text: "❌ ÉCHEC : " + (data.detail || data.message || "Erreur inconnue"),
          type: "error"
        });
      }
    } catch (error) {
      setMessage({
        text: "❌ Erreur réseau : " + error.message,
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setMessage({ text: "Veuillez sélectionner une image", type: "error" });
        return;
      }
      setSelectedFile(file);
    }
  };

  // --- GESTION DE LA PHOTO DE NETTOYAGE ---
  const handleCleanupPhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validation
    if (!file.type.startsWith('image/')) {
      setMessage({ text: "Veuillez sélectionner une image (JPG, PNG, WebP)", type: "error" });
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ text: "La photo ne doit pas dépasser 5MB", type: "error" });
      return;
    }
    
    // Créer une URL pour prévisualisation
    const objectUrl = URL.createObjectURL(file);
    setCleanupPhoto(objectUrl);
    setCleanupPhotoFile(file); // Stocker le fichier original
  };

  const handleLogout = () => {
    localStorage.removeItem('cm_token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('cm_user_role');
    localStorage.removeItem('cm_user_name');
    localStorage.removeItem('cm_user_id');
    localStorage.removeItem('cm_user_commune');
    localStorage.removeItem('cm_user_points');
    localStorage.removeItem('cm_preferred_mode');
    localStorage.removeItem('cm_user_profile_picture');
    setIsLoggedIn(false);
    setToken("");
    setUserRole("");
    setUserName("");
    setUserId("");
    setUserCommune("");
    setUserPoints(0);
    setProfilePictureUrl(''); // NOUVEAU : réinitialiser la photo de profil
    setCurrentMode('agent');
    setLat(null);
    setLng(null);
    setMissions([]);
    setMyReports([]);
    setMessage({ text: "Déconnexion réussie.", type: "info" });
    navigate('/home');
  };

  // --- DÉTERMINER LE TYPE D'UTILISATEUR ---
  const getUserType = () => {
    const currentRole = userRole || localStorage.getItem('cm_user_role') || '';
    const normalizedRole = currentRole.toLowerCase();

    const agentRoles = ['ramasseur', 'superviseur', 'coordinateur', 'administrateur'];

    if (agentRoles.includes(normalizedRole)) {
      return 'agent';
    } else {
      return 'citizen';
    }
  };

  const userType = getUserType();
  const isCitizen = userType === 'citizen';
  const isAgent = userType === 'agent';

  // Nouvelle logique pour l'affichage de l'interface
  const shouldShowAgentInterface = isAgent && currentMode === 'agent';
// Utilisation des nouvelles fonctions de détection
const userIsCoordinator = isCoordinatorUser();
const userIsAdmin = isAdminUser();

  const getRoleTitle = () => {
    const currentRole = userRole || localStorage.getItem('cm_user_role') || '';
    const normalizedRole = currentRole.toLowerCase();

    switch(normalizedRole) {
      case 'citoyen': return 'Citoyen';
      case 'ramasseur': return 'Ramasseur';
      case 'superviseur': return 'Superviseur';
      case 'coordinateur': return 'Coordinateur';
      case 'administrateur': return 'Administrateur';
      default:
        if (missions.length > 0) return 'Agent Municipal';
        return 'Utilisateur';
    }
  };

  // Fonction pour basculer le mode
  const switchMode = (mode) => {
    // Si l'utilisateur n'est pas un agent, ne pas permettre le changement
    if (!isAgent) return;

    setCurrentMode(mode);
    localStorage.setItem('cm_preferred_mode', mode);

    if (mode === 'citizen') {
      setActiveTab('signalement');
      setMessage({
        text: "Vous êtes maintenant en mode citoyen. Vous pouvez effectuer des signalements.",
        type: "info"
      });
      fetchMyReports(token);
    } else {
      setActiveTab('missions');
      setMessage({
        text: "Vous êtes maintenant en mode agent. Vous pouvez gérer les missions.",
        type: "info"
      });
      fetchMissions(token);
    }

    setTimeout(() => setMessage({text: "", type: ""}), 3000);
  };

  useEffect(() => {
    if (!isLoggedIn) return;

    if (isLoggedIn && !token) {
      setIsLoggedIn(false);
      return;
    }

    if (isLoggedIn && token) {
      const savedRole = localStorage.getItem('cm_user_role');
      const savedName = localStorage.getItem('cm_user_name');
      const savedId = localStorage.getItem('cm_user_id');
      const savedCommune = localStorage.getItem('cm_user_commune');
      const savedPoints = localStorage.getItem('cm_user_points');
      const savedMode = localStorage.getItem('cm_preferred_mode');
      const savedProfilePic = localStorage.getItem('cm_user_profile_picture');

      if (savedRole && savedName) {
        setUserRole(savedRole);
        setUserName(savedName);
        setUserId(savedId || '');
        setUserCommune(savedCommune || '');
        setUserPoints(parseInt(savedPoints) || 0);

        // Charger la photo de profil si elle existe
        if (savedProfilePic) {
          setProfilePictureUrl(savedProfilePic);
        }

        // Déterminez si c'est un agent par rôle
        const normalizedRole = savedRole.toLowerCase();
        const agentRoles = ['ramasseur', 'superviseur', 'coordinateur', 'administrateur'];
        const isAgentByRole = agentRoles.includes(normalizedRole);

        if (savedMode) {
          // Si c'est un agent, utilise le mode sauvegardé
          // Si c'est un citoyen, force le mode citizen
          if (isAgentByRole) {
            setCurrentMode(savedMode);
          } else {
            setCurrentMode('citizen');
            localStorage.setItem('cm_preferred_mode', 'citizen');
          }
        } else {
          // Mode par défaut
          if (isAgentByRole) {
            setCurrentMode('agent');
            localStorage.setItem('cm_preferred_mode', 'agent');
          } else {
            setCurrentMode('citizen');
            localStorage.setItem('cm_preferred_mode', 'citizen');
          }
        }

        // Charger les données selon le mode
        if (isAgentByRole && savedMode === 'agent') {
          fetchMissions(token);
          setActiveTab('missions');
        } else {
          fetchMyReports(token);
          setActiveTab(isAgentByRole && savedMode === 'citizen' ? 'signalement' : 'myreports');
        }
      } else {
        fetchUserInfo(token);
      }
    }
  }, [isLoggedIn, token]);

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
      case 'ASSIGNED': return 'ASSIGNÉ';
      case 'IN_PROGRESS': return 'EN COURS';
      case 'AWAITING_CONFIRMATION': return '⏳ EN ATTENTE CONFIRMATION';
      case 'DISPUTED': return '⚠️ EN LITIGE';
      case 'COMPLETED': return 'TERMINÉ';
      default: return status || 'INCONNU';
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'PENDING': return 'bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-800 border border-amber-300/40 shadow-[inset_0_1px_2px_rgba(245,158,11,0.2)]';
      case 'ASSIGNED': return 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-800 border border-blue-300/40';
      case 'IN_PROGRESS': return 'bg-gradient-to-r from-golden-brown-500/20 to-golden-brown-600/20 text-golden-brown-800 border border-golden-brown-300/40 shadow-[inset_0_1px_2px_rgba(193,154,107,0.2)]';
      case 'AWAITING_CONFIRMATION': return 'bg-gradient-to-r from-purple-500/20 to-purple-600/20 text-purple-800 border border-purple-300/40 shadow-[inset_0_1px_2px_rgba(168,85,247,0.2)]';
      case 'DISPUTED': return 'bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-800 border border-red-300/40 shadow-[inset_0_1px_2px_rgba(239,68,68,0.2)]';
      case 'COMPLETED': return 'bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 text-emerald-800 border border-emerald-300/40 shadow-[inset_0_1px_2px_rgba(16,185,129,0.2)]';
      default: return 'bg-gradient-to-r from-warm-gray-500/20 to-warm-gray-600/20 text-warm-gray-800 border border-warm-gray-300/40 shadow-[inset_0_1px_2px_rgba(120,113,108,0.1)]';
    }
  };

  // Fonction pour transformer les signalements pour la carte
  const transformReportsForMap = (reports) => {
    if (!reports || !Array.isArray(reports)) return [];

    return reports.map(report => ({
      id: report.id,
      latitude: report.latitude,
      longitude: report.longitude,
      status: report.status,
      description: report.description || '',
      image_url: report.image_url || '',
      created_at: report.created_at,
      reporter_name: report.reporter_full_name || report.user?.full_name || report.user_name || 'Anonyme',
      address: report.address_description || '',
      commune: report.reporter_commune || report.user?.commune || userCommune || 'Inconnue',
      reporter_phone: report.reporter_phone || report.user?.phone || '',
      reporter_commune: report.reporter_commune || report.user?.commune || '',
      collector_name: report.collector_full_name || '',
      user_name: report.user?.full_name || report.reporter_full_name || 'Anonyme',
      cleanup_photo_url: report.cleanup_photo_url || null,
      citizen_confirmed: report.citizen_confirmed || false
    }));
  };

  // Fonction pour gérer le clic sur un quartier
  const handleQuartierClick = (quartierDetails) => {
    setSelectedQuartierDetails(quartierDetails);
    console.log("Quartier sélectionné:", quartierDetails);
  };  // === STYLE AMÉLIORÉ AVEC ÉLÉMENTS VISUELS RICHES ===
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-golden-brown-50 via-golden-brown-100/30 to-golden-brown-200/20 flex items-center justify-center p-6 font-sans text-warm-gray-800 relative overflow-hidden">
        {/* Arrière-plan décoratif */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-1/3 h-1/3 bg-gradient-to-br from-golden-brown-200/20 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-1/3 h-1/3 bg-gradient-to-br from-amber-200/20 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1/2 h-1/2 bg-gradient-to-br from-amber-100/10 to-transparent rounded-full blur-3xl"></div>

          {/* Pattern subtil */}
          <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(circle_at_2px_2px,rgba(193,154,107,0.4)_1px,transparent_1px)] bg-[length:60px_60px]"></div>
        </div>

        <div className="w-full max-w-4xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-10 z-20">
          {/* Section gauche - Présentation */}
          <div className="flex-1 max-w-lg">
            <div className="bg-gradient-to-br from-white to-warm-gray-50/30 rounded-3xl p-8 lg:p-10 relative overflow-hidden border border-golden-brown-300/30 shadow-[inset_0_1px_3px_rgba(193,154,107,0.2),0_4px_12px_rgba(0,0,0,0.05)]">
              {/* Effet de profondeur */}
              <div className="absolute inset-0 bg-gradient-to-br from-golden-brown-600/5 via-transparent to-amber-600/5"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-golden-brown-600/10 to-transparent rounded-full -translate-y-16 translate-x-16"></div>

              <div className="relative z-10">
                {/* Description */}
                <div className="space-y-6 mb-10">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center shadow-lg border border-golden-brown-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_12px_rgba(193,154,107,0.25)]">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)]">
                        <span className="text-2xl font-bold text-golden-brown-700">👷</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-warm-gray-800 mb-2">Pour les agents municipaux</h3>
                      <p className="text-warm-gray-600">Gérez les missions de collecte, visualisez la carte interactive et suivez les interventions.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center shadow-lg border border-emerald-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_12px_rgba(16,185,129,0.25)]">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)]">
                        <span className="text-2xl font-bold text-emerald-700">👤</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-warm-gray-800 mb-2">Pour les citoyens</h3>
                      <p className="text-warm-gray-600">Signalez les dépôts sauvages, gagnez des points et suivez vos contributions.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center shadow-lg border border-amber-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_12px_rgba(245,158,11,0.25)]">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)]">
                        <span className="text-2xl font-bold text-amber-700">🎯</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-warm-gray-800 mb-2">Mode flexible</h3>
                      <p className="text-warm-gray-600">Les agents peuvent basculer en mode citoyen pour effectuer des signalements.</p>
                    </div>
                  </div>
                </div>

                {/* Chiffres clés */}
                <div className="bg-gradient-to-br from-white to-golden-brown-100/30 rounded-2xl p-6 border border-golden-brown-400/30 shadow-[inset_0_1px_3px_rgba(193,154,107,0.15),0_3px_10px_rgba(0,0,0,0.05)]">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-golden-brown-700">2,540+</p>
                      <p className="text-sm text-golden-brown-600 font-medium">Signalements traités</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-emerald-600">350+</p>
                      <p className="text-sm text-emerald-600 font-medium">Agents actifs</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section droite - Formulaire de connexion */}
          <div className="flex-1 max-w-md w-full">
            <div className="bg-gradient-to-br from-white to-warm-gray-50/30 rounded-3xl p-8 lg:p-10 shadow-2xl relative overflow-hidden border border-golden-brown-300/30 shadow-[inset_0_1px_4px_rgba(193,154,107,0.2),0_8px_24px_rgba(0,0,0,0.08)]">
              {/* Effet de profondeur */}
              <div className="absolute inset-0 bg-gradient-to-br from-warm-gray-600/5 via-transparent to-golden-brown-600/5"></div>
              <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-warm-gray-600/10 to-transparent rounded-full -translate-y-16 -translate-x-16"></div>

              <div className="relative z-10">
                <div className="flex items-center justify-center mb-8">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center shadow-lg border border-golden-brown-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_6px_20px_rgba(193,154,107,0.25)]">
                    <div className="w-18 h-18 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px_rgba(255,255,255,0.5)]">
                      <span className="text-3xl font-bold text-golden-brown-700">🔑</span>
                    </div>
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-warm-gray-800 mb-2 text-center">Connexion au Portail</h2>
                <p className="text-warm-gray-600 text-center mb-8">Accédez à votre tableau de bord</p>

                {message.text && (
                  <div className={`mb-6 p-4 rounded-2xl text-center font-semibold border border-emerald-300/40 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_2px_8px_rgba(16,185,129,0.15)] ${
                    message.type === "success"
                      ? "bg-gradient-to-r from-emerald-100/80 to-emerald-200/50 text-emerald-700"
                      : message.type === "error"
                      ? "bg-gradient-to-r from-red-100/80 to-red-200/50 text-red-700 border-red-300/40 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_2px_8px_rgba(239,68,68,0.15)]"
                      : "bg-gradient-to-r from-amber-100/80 to-amber-200/50 text-amber-700 border-amber-300/40 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_2px_8px_rgba(245,158,11,0.15)]"
                  }`}>
                    {message.text}
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                  {/* Téléphone */}
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-golden-brown-600 to-amber-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity"></div>
                    <div className="relative">
                      <label className="block text-sm font-bold text-warm-gray-700 mb-2">Numéro de téléphone</label>
                      <div className="flex items-center">
                        <div className="w-14 h-14 rounded-l-2xl bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center border border-golden-brown-700/50 border-r-0 shadow-[inset_0_1px_3px_rgba(255,255,255,0.3)]">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]">
                            <span className="text-lg font-bold text-golden-brown-700">📱</span>
                          </div>
                        </div>
                        <input
                          type="tel"
                          className="input-golden w-full p-4 placeholder-warm-gray-400 rounded-r-2xl border border-golden-brown-300/30 border-l-0 shadow-[inset_0_1px_2px_rgba(193,154,107,0.15)] bg-white/80"
                          placeholder="Ex: +243 81 234 5678"
                          value={loginPhone}
                          onChange={(e) => setLoginPhone(e.target.value)}
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Mot de passe */}
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-golden-brown-600 to-amber-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity"></div>
                    <div className="relative">
                      <label className="block text-sm font-bold text-warm-gray-700 mb-2">Mot de passe</label>
                      <div className="flex items-center">
                        <div className="w-14 h-14 rounded-l-2xl bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center border border-golden-brown-700/50 border-r-0 shadow-[inset_0_1px_3px_rgba(255,255,255,0.3)]">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]">
                            <span className="text-lg font-bold text-golden-brown-700">🔒</span>
                          </div>
                        </div>
                        <input
                          type="password"
                          className="input-golden w-full p-4 placeholder-warm-gray-400 rounded-r-2xl border border-golden-brown-300/30 border-l-0 shadow-[inset_0_1px_2px_rgba(193,154,107,0.15)] bg-white/80"
                          placeholder="Votre mot de passe"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bouton de connexion */}
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-5 rounded-2xl font-bold text-lg transition-all duration-500 flex items-center justify-center gap-3 relative overflow-hidden group border border-golden-brown-600/50 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_12px_rgba(193,154,107,0.25)] ${
                      loading
                        ? 'bg-gradient-to-r from-warm-gray-500 to-warm-gray-600 text-white cursor-not-allowed border-warm-gray-500/40'
                        : 'bg-gradient-to-br from-golden-brown-600 to-amber-600 text-white hover:shadow-3xl hover:-translate-y-2'
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-golden-brown-700 to-amber-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center relative z-10 border border-white/70 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)]">
                      <span className="text-xl font-bold text-golden-brown-700">
                        {loading ? '' : '🔑'}
                      </span>
                    </div>
                    {loading ? (
                      <>
                        <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin relative z-10"></div>
                        <span className="animate-pulse relative z-10">CONNEXION...</span>
                      </>
                    ) : (
                      <>
                        <span className="relative z-10">SE CONNECTER</span>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center relative z-10 border border-white/70">
                          <span className="text-lg font-bold text-amber-600 animate-pulse">
                            ⚡
                          </span>
                        </div>
                      </>
                    )}
                  </button>
                </form>

                {/* Séparateur */}
                <div className="my-8 flex items-center">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-golden-brown-400/30 to-transparent"></div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-golden-brown-600/20 to-amber-600/20 flex items-center justify-center mx-4 border border-golden-brown-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]">
                    <span className="text-sm font-bold text-golden-brown-600">OU</span>
                  </div>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-golden-brown-400/30 to-transparent"></div>
                </div>

                {/* Accès par token */}
                <div className="space-y-4">
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-golden-brown-600 to-amber-600 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity"></div>
                    <div className="relative">
                      <label className="block text-sm font-bold text-warm-gray-700 mb-2">Accès direct par token</label>
                      <div className="flex gap-2">
                        <div className="flex-1 flex items-center">
                          <div className="w-12 h-12 rounded-l-2xl bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center border border-golden-brown-700/50 border-r-0 shadow-[inset_0_1px_3px_rgba(255,255,255,0.3)]">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]">
                              <span className="text-lg font-bold text-golden-brown-700">🔑</span>
                            </div>
                          </div>
                          <input
                            type="text"
                            className="input-golden flex-1 p-3 text-sm rounded-r-2xl border border-golden-brown-300/30 border-l-0 shadow-[inset_0_1px_2px_rgba(193,154,107,0.15)] bg-white/80"
                            placeholder="Collez votre token d'accès"
                            value={manualToken}
                            onChange={(e) => setManualToken(e.target.value)}
                            disabled={loading}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleTokenAccess}
                          disabled={loading || !manualToken.trim()}
                          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-golden-brown-600 to-amber-600 text-white font-bold hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex items-center justify-center border border-golden-brown-700/50 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_2px_8px_rgba(193,154,107,0.2)]"
                        >
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)]">
                            <span className="text-lg font-bold text-golden-brown-700">→</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* NOUVEAU : Lien vers l'inscription */}
                  <div className="text-center pt-4 border-t border-golden-brown-400/30">
                    <p className="text-sm text-warm-gray-600 mb-3">
                      Pas encore de compte ?
                    </p>
                    <Link
                      to="/register"
                      className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white font-semibold rounded-2xl hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-emerald-500/25 border border-emerald-700/50 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_2px_8px_rgba(16,185,129,0.2)]"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)]">
                        <span className="text-lg font-bold text-emerald-700">📝</span>
                      </div>
                      <span>Créer un compte</span>
                    </Link>
                    <p className="text-xs text-warm-gray-500 mt-3">
                      Inscription en 2 minutes • Commencez à gagner des points
                    </p>
                  </div>

                  {/* Informations */}
                  <div className="p-4 bg-gradient-to-r from-golden-brown-50/50 to-golden-brown-100/30 rounded-xl border border-golden-brown-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_1px_6px_rgba(0,0,0,0.04)]">
                    <p className="text-sm text-warm-gray-600 text-center">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-golden-brown-600/20 to-amber-600/20 flex items-center justify-center mx-auto mb-2 border border-golden-brown-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]">
                        <span className="text-sm font-bold text-golden-brown-600">💡</span>
                      </div>
                      Service municipal de propreté urbaine - Hôtel de Ville de Kinshasa
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }  else {
    // === DASHBOARD STYLÉ ===
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

        {/* SIDEBAR STYLÉ */}
        <div className="w-full md:w-80 lg:w-96 bg-gradient-to-b from-white via-white to-golden-brown-50/30 p-8 flex flex-col justify-between shadow-xl z-20 h-auto md:h-full relative overflow-hidden border-r border-golden-brown-300/30 shadow-[inset_-1px_0_3px_rgba(193,154,107,0.15)]">
          {/* Effet de profondeur */}
          <div className="absolute inset-0 bg-gradient-to-br from-golden-brown-600/5 via-transparent to-amber-600/5"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-golden-brown-600/10 to-transparent rounded-full -translate-y-16 translate-x-16"></div>

          <div className="relative z-10">
            {/* Carte utilisateur stylée */}
            <div className="bg-gradient-to-br from-white to-warm-gray-50/30 rounded-3xl p-8 relative overflow-hidden border border-golden-brown-300/30 shadow-[inset_0_1px_4px_rgba(193,154,107,0.2),0_6px_20px_rgba(0,0,0,0.08)]">
              {/* Effet décoratif */}
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-golden-brown-600/10 to-transparent rounded-full -translate-y-6 translate-x-6"></div>

              <div className="flex items-center gap-6 mb-8">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-golden-brown-600 to-amber-600 shadow-lg flex items-center justify-center border border-golden-brown-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_6px_20px_rgba(193,154,107,0.25)]">
                    <div className="w-22 h-22 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center overflow-hidden border border-white/80 shadow-[inset_0_1px_3px_rgba(255,255,255,0.5)]">
                      {/* Photo de profil ou initiales */}
                      {profilePictureUrl ? (
                        <img
                          src={profilePictureUrl}
                          alt="Photo de profil"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error('Erreur de chargement photo:', profilePictureUrl);
                            e.target.style.display = 'none';
                          }}
                          loading="lazy"
                        />
                      ) : null}
                      
                      {/* Fallback - seulement si pas de photo ou erreur de chargement */}
                      {!profilePictureUrl && (
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-golden-brown-100 to-amber-100 flex items-center justify-center">
                          <span className="text-3xl font-bold text-golden-brown-700">
                            {userName?.charAt(0).toUpperCase() || '👤'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="font-bold text-warm-gray-800 text-xl truncate">{userName || 'Utilisateur'}</h2>
                  <div className="flex items-center gap-3 mt-3">
                    <div className="px-4 py-2 rounded-full text-sm font-bold border border-golden-brown-400/40 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),0_2px_6px_rgba(193,154,107,0.15)] bg-gradient-to-br from-white to-golden-brown-100 text-golden-brown-700">
                      {getRoleTitle()}
                    </div>
                    {userCommune && (
                      <div className="px-3 py-1.5 bg-gradient-to-br from-white to-warm-gray-100 rounded-full text-xs font-medium text-warm-gray-600 border border-warm-gray-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]">
                        {userCommune}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Informations utilisateur */}
              <div className="space-y-5">
                {/* Boutons de mode - UNIQUEMENT POUR LES AGENTS */}
                {isAgent && (
                  <div className="bg-gradient-to-r from-golden-brown-50/50 to-golden-brown-100/30 rounded-2xl p-4 border border-golden-brown-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_1px_6px_rgba(0,0,0,0.04)]">
                    <div className="flex gap-3">
                      <button
                        onClick={() => switchMode('agent')}
                        className={`flex-1 py-4 rounded-xl text-sm font-medium transition-all duration-300 flex flex-col items-center justify-center gap-3 ${
                          currentMode === 'agent'
                            ? 'bg-gradient-to-br from-golden-brown-600 to-golden-brown-700 text-white shadow-lg border border-golden-brown-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_12px_rgba(193,154,107,0.2)]'
                            : 'bg-gradient-to-br from-white to-warm-gray-100 text-warm-gray-700 hover:bg-gradient-to-br hover:from-golden-brown-100 hover:to-golden-brown-200 border border-golden-brown-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_1px_6px_rgba(0,0,0,0.04)]'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${
                          currentMode === 'agent'
                            ? 'border-white/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)] bg-gradient-to-br from-white to-warm-gray-100'
                            : 'border-golden-brown-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)] bg-gradient-to-br from-golden-brown-100 to-golden-brown-200'
                        }`}>
                          <span className={`text-2xl font-bold ${
                            currentMode === 'agent'
                              ? 'text-golden-brown-700'
                              : 'text-warm-gray-700'
                          }`}>
                            👷
                          </span>
                        </div>
                        <span className="font-bold">Agent</span>
                      </button>

                      <button
                        onClick={() => switchMode('citizen')}
                        className={`flex-1 py-4 rounded-xl text-sm font-medium transition-all duration-300 flex flex-col items-center justify-center gap-3 ${
                          currentMode === 'citizen'
                            ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-lg border border-emerald-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_12px_rgba(16,185,129,0.2)]'
                            : 'bg-gradient-to-br from-white to-warm-gray-100 text-warm-gray-700 hover:bg-gradient-to-br hover:from-emerald-100 hover:to-emerald-200 border border-emerald-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_1px_6px_rgba(0,0,0,0.04)]'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${
                          currentMode === 'citizen'
                            ? 'border-white/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)] bg-gradient-to-br from-white to-warm-gray-100'
                            : 'border-emerald-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)] bg-gradient-to-br from-emerald-100 to-emerald-200'
                        }`}>
                          <span className={`text-2xl font-bold ${
                            currentMode === 'citizen'
                              ? 'text-emerald-700'
                              : 'text-warm-gray-700'
                          }`}>
                            👤
                          </span>
                        </div>
                        <span className="font-bold">Citoyen</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Statut de session */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50/50 to-emerald-100/30 rounded-2xl border border-emerald-400/40 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_2px_8px_rgba(16,185,129,0.1)]">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-4 h-4 bg-emerald-500 rounded-full animate-pulse border border-emerald-600"></div>
                      <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping"></div>
                    </div>
                    <span className="font-medium text-emerald-700">Session Active</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-full text-xs text-emerald-600 bg-white/50 border border-emerald-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]">
                    {userId ? `ID: ${userId}` : 'Connecté'}
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation stylée */}
            <div className="my-10">
              <h3 className="text-xs font-bold text-warm-gray-500 uppercase tracking-widest mb-6 flex items-center gap-3">
                <div className="w-10 h-1.5 bg-gradient-to-r from-golden-brown-600 to-amber-600 rounded-full"></div>
                Navigation Principale
              </h3>

              <div className="space-y-3">
                {shouldShowAgentInterface ? (
                  <>
                    <button
                      onClick={() => {
                        setActiveTab('missions');
                        fetchMissions(token);
                      }}
                      className={`w-full flex items-center gap-5 p-5 rounded-2xl transition-all duration-300 group border border-golden-brown-400/30 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_3px_10px_rgba(0,0,0,0.06)] ${
                        activeTab === 'missions'
                          ? 'bg-gradient-to-br from-golden-brown-600 to-amber-600 text-white shadow-2xl border-golden-brown-700/60 shadow-[inset_0_2px_5px_rgba(255,255,255,0.4),0_6px_24px_rgba(193,154,107,0.3)] transform scale-[1.02]'
                          : 'bg-gradient-to-br from-white to-warm-gray-100 hover:bg-gradient-to-br hover:from-golden-brown-100 hover:to-golden-brown-200 hover:shadow-xl'
                      }`}
                    >
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center border ${
                        activeTab === 'missions'
                          ? 'border-white/50 shadow-[inset_0_1px_3px_rgba(255,255,255,0.5)] bg-gradient-to-br from-white to-warm-gray-100'
                          : 'border-golden-brown-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)] bg-gradient-to-br from-golden-brown-100 to-golden-brown-200'
                      }`}>
                        <span className={`text-2xl font-bold ${
                          activeTab === 'missions' ? 'text-golden-brown-700' : 'text-warm-gray-700'
                        }`}>
                          📋
                        </span>
                      </div>
                      <div className="text-left flex-1">
                        <span className={`font-bold block transition-all duration-300 ${
                          activeTab === 'missions' ? 'text-white' : 'text-warm-gray-800 group-hover:text-golden-brown-700'
                        }`}>
                          Missions de Collecte
                        </span>
                        <span className={`text-xs transition-all duration-300 ${
                          activeTab === 'missions' ? 'text-amber-200' : 'text-warm-gray-600 group-hover:text-warm-gray-700'
                        }`}>
                          Signalements en attente
                        </span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('history');
                        fetchHistory(token);
                      }}
                      className={`w-full flex items-center gap-5 p-5 rounded-2xl transition-all duration-300 group border border-golden-brown-400/30 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_3px_10px_rgba(0,0,0,0.06)] ${
                        activeTab === 'history'
                          ? 'bg-gradient-to-br from-golden-brown-600 to-amber-600 text-white shadow-2xl border-golden-brown-700/60 shadow-[inset_0_2px_5px_rgba(255,255,255,0.4),0_6px_24px_rgba(193,154,107,0.3)] transform scale-[1.02]'
                          : 'bg-gradient-to-br from-white to-warm-gray-100 hover:bg-gradient-to-br hover:from-golden-brown-100 hover:to-golden-brown-200 hover:shadow-xl'
                      }`}
                    >
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center border ${
                        activeTab === 'history'
                          ? 'border-white/50 shadow-[inset_0_1px_3px_rgba(255,255,255,0.5)] bg-gradient-to-br from-white to-warm-gray-100'
                          : 'border-golden-brown-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)] bg-gradient-to-br from-golden-brown-100 to-golden-brown-200'
                      }`}>
                        <span className={`text-2xl font-bold ${
                          activeTab === 'history' ? 'text-golden-brown-700' : 'text-warm-gray-700'
                        }`}>
                          📊
                        </span>
                      </div>
                      <div className="text-left flex-1">
                        <span className={`font-bold block transition-all duration-300 ${
                          activeTab === 'history' ? 'text-white' : 'text-warm-gray-800 group-hover:text-golden-brown-700'
                        }`}>
                          Historique Complet
                        </span>
                        <span className={`text-xs transition-all duration-300 ${
                          activeTab === 'history' ? 'text-amber-200' : 'text-warm-gray-600 group-hover:text-warm-gray-700'
                        }`}>
                          30 derniers jours
                        </span>
                      </div>
                    </button>

                    {/* Bouton pour la carte */}
                    <button
                      onClick={() => {
                        setActiveTab('map');
                        setShowMap(true);
                      }}
                      className={`w-full flex items-center gap-5 p-5 rounded-2xl transition-all duration-300 group border border-golden-brown-400/30 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_3px_10px_rgba(0,0,0,0.06)] ${
                        activeTab === 'map'
                          ? 'bg-gradient-to-br from-golden-brown-600 to-amber-600 text-white shadow-2xl border-golden-brown-700/60 shadow-[inset_0_2px_5px_rgba(255,255,255,0.4),0_6px_24px_rgba(193,154,107,0.3)] transform scale-[1.02]'
                          : 'bg-gradient-to-br from-white to-warm-gray-100 hover:bg-gradient-to-br hover:from-golden-brown-100 hover:to-golden-brown-200 hover:shadow-xl'
                      }`}
                    >
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center border ${
                        activeTab === 'map'
                          ? 'border-white/50 shadow-[inset_0_1px_3px_rgba(255,255,255,0.5)] bg-gradient-to-br from-white to-warm-gray-100'
                          : 'border-golden-brown-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)] bg-gradient-to-br from-golden-brown-100 to-golden-brown-200'
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
                          Visualiser les signalements
                        </span>
                      </div>
                    </button>
{/* Bouton Admin pour les administrateurs */}
{isAdminUser() && (
  <button
    onClick={() => navigate('/admin')}
    className="w-full flex items-center gap-5 p-5 rounded-2xl transition-all duration-300 group border border-golden-brown-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)] bg-gradient-to-br from-white to-warm-gray-100 hover:bg-gradient-to-br hover:from-golden-brown-100 hover:to-golden-brown-200 hover:shadow-xl"
  >
    <div className="w-14 h-14 rounded-full flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.4)] bg-gradient-to-br from-golden-brown-100 to-golden-brown-200">
      <span className="text-2xl font-bold text-golden-brown-700">👑</span>
    </div>
    <div className="text-left flex-1">
      <span className="font-bold block transition-all duration-300 text-warm-gray-800 group-hover:text-golden-brown-700">
        Panel Administrateur
      </span>
      <span className="text-xs transition-all duration-300 text-warm-gray-600 group-hover:text-warm-gray-700">
        Gestion complète
      </span>
    </div>
  </button>
)}
    {/* Pour les Coordinateurs */}
    {isCoordinatorUser() && !isAdminUser() && (
      <Link
        to="/admin"
        className="w-full flex items-center gap-5 p-5 rounded-2xl transition-all duration-300 group border border-blue-400/30 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_3px_10px_rgba(0,0,0,0.06)] bg-gradient-to-br from-white to-warm-gray-100 hover:bg-gradient-to-br hover:from-blue-100 hover:to-blue-200 hover:shadow-xl hover:-translate-y-1"
      >
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center border border-blue-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]">
          <span className="text-2xl font-bold text-blue-700">🎯</span>
        </div>
        <div className="text-left flex-1">
          <span className="font-bold block text-warm-gray-800 group-hover:text-blue-700">
            Panel Coordinateur
          </span>
          <span className="text-xs text-warm-gray-600 group-hover:text-warm-gray-700">
            Gestion de {userCommune || 'votre commune'}
          </span>
        </div>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transform group-hover:translate-x-2 transition-all duration-300 border border-white/70">
          <span className="text-lg font-bold text-blue-600">→</span>
        </div>
      </Link>
    )}
 {/* Bouton Supervisor pour les superviseurs */}
{(isSupervisorUser() || isAdminUser() || isCoordinatorUser()) && (
  <Link
    to="/supervisor"
    className="w-full flex items-center gap-5 p-5 rounded-2xl transition-all duration-300 group border border-blue-400/30 shadow-[inset_0_1px_3px rgba(255,255,255,0.4),0_3px_10px rgba(0,0,0,0.06)] bg-gradient-to-br from-white to-warm-gray-100 hover:bg-gradient-to-br hover:from-blue-100 hover:to-blue-200 hover:shadow-xl hover:-translate-y-1"
  >
    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center border border-blue-400/30 shadow-[inset_0_1px_2px rgba(255,255,255,0.4)]">
      <span className="text-2xl font-bold text-blue-700">👨‍💼</span>
    </div>
    <div className="text-left flex-1">
      <span className="font-bold block text-warm-gray-800 group-hover:text-blue-700">
        Panel Superviseur
      </span>
      <span className="text-xs text-warm-gray-600 group-hover:text-warm-gray-700">
        Gestion des ramasseurs de {userCommune || 'votre commune'}
      </span>
    </div>
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transform group-hover:translate-x-2 transition-all duration-300 border border-white/70">
      <span className="text-lg font-bold text-blue-600">→</span>
    </div>
  </Link>
)}
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setActiveTab('signalement')}
                      className={`w-full flex items-center gap-5 p-5 rounded-2xl transition-all duration-300 group border border-golden-brown-400/30 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_3px_10px_rgba(0,0,0,0.06)] ${
                        activeTab === 'signalement'
                          ? 'bg-gradient-to-br from-golden-brown-600 to-amber-600 text-white shadow-2xl border-golden-brown-700/60 shadow-[inset_0_2px_5px_rgba(255,255,255,0.4),0_6px_24px_rgba(193,154,107,0.3)] transform scale-[1.02]'
                          : 'bg-gradient-to-br from-white to-warm-gray-100 hover:bg-gradient-to-br hover:from-golden-brown-100 hover:to-golden-brown-200 hover:shadow-xl'
                      }`}
                    >
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center border ${
                        activeTab === 'signalement'
                          ? 'border-white/50 shadow-[inset_0_1px_3px_rgba(255,255,255,0.5)] bg-gradient-to-br from-white to-warm-gray-100'
                          : 'border-golden-brown-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)] bg-gradient-to-br from-golden-brown-100 to-golden-brown-200'
                      }`}>
                        <span className={`text-2xl font-bold ${
                          activeTab === 'signalement' ? 'text-golden-brown-700' : 'text-warm-gray-700'
                        }`}>
                          📍
                        </span>
                      </div>
                      <div className="text-left flex-1">
                        <span className={`font-bold block transition-all duration-300 ${
                          activeTab === 'signalement' ? 'text-white' : 'text-warm-gray-800 group-hover:text-golden-brown-700'
                        }`}>
                          Nouveau Signalement
                        </span>
                        <span className={`text-xs transition-all duration-300 ${
                          activeTab === 'signalement' ? 'text-amber-200' : 'text-warm-gray-600 group-hover:text-warm-gray-700'
                        }`}>
                          Signaler un problème
                        </span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('myreports');
                        fetchMyReports(token);
                      }}
                      className={`w-full flex items-center gap-5 p-5 rounded-2xl transition-all duration-300 group border border-golden-brown-400/30 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_3px_10px_rgba(0,0,0,0.06)] ${
                        activeTab === 'myreports'
                          ? 'bg-gradient-to-br from-golden-brown-600 to-amber-600 text-white shadow-2xl border-golden-brown-700/60 shadow-[inset_0_2px_5px_rgba(255,255,255,0.4),0_6px_24px_rgba(193,154,107,0.3)] transform scale-[1.02]'
                          : 'bg-gradient-to-br from-white to-warm-gray-100 hover:bg-gradient-to-br hover:from-golden-brown-100 hover:to-golden-brown-200 hover:shadow-xl'
                      }`}
                    >
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center border ${
                        activeTab === 'myreports'
                          ? 'border-white/50 shadow-[inset_0_1px_3px_rgba(255,255,255,0.5)] bg-gradient-to-br from-white to-warm-gray-100'
                          : 'border-golden-brown-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)] bg-gradient-to-br from-golden-brown-100 to-golden-brown-200'
                      }`}>
                        <span className={`text-2xl font-bold ${
                          activeTab === 'myreports' ? 'text-golden-brown-700' : 'text-warm-gray-700'
                        }`}>
                          📊
                        </span>
                      </div>
                      <div className="text-left flex-1">
                        <span className={`font-bold block transitionall duration-300 ${
                          activeTab === 'myreports' ? 'text-white' : 'text-warm-gray-800 group-hover:text-golden-brown-700'
                        }`}>
                          Mes Signalements
                        </span>
                        <span className={`text-xs transition-all duration-300 ${
                          activeTab === 'myreports' ? 'text-amber-200' : 'text-warm-gray-600 group-hover:text-warm-gray-700'
                        }`}>
                          Historique et suivi
                        </span>
                      </div>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Statistiques rapides */}
            <div className="bg-gradient-to-br from-white to-warm-gray-50/30 rounded-2xl p-6 border border-warm-gray-400/25 shadow-[inset_0_1px_3px_rgba(120,113,108,0.1),0_3px_10px_rgba(0,0,0,0.05)]">
              <h4 className="text-sm font-bold text-warm-gray-600 mb-4 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-golden-brown-600/20 to-amber-600/20 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]">
                  <span className="text-xs font-bold text-golden-brown-600">📈</span>
                </div>
                Aperçu Rapide
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-white to-golden-brown-100/30 rounded-xl p-4 border border-golden-brown-400/25 shadow-[inset_0_1px_2px_rgba(193,154,107,0.1),0_2px_8px_rgba(0,0,0,0.04)]">
                  <p className="text-xs text-golden-brown-600 font-medium">Total</p>
                  <p className="text-xl font-bold text-golden-brown-700">
                    {shouldShowAgentInterface ? missions.length : myReports.length}
                  </p>
                </div>
                <div className={`rounded-xl p-4 border ${
                  shouldShowAgentInterface
                    ? 'border-amber-400/30 shadow-[inset_0_1px_2px_rgba(245,158,11,0.1),0_2px_8px_rgba(245,158,11,0.08)] bg-gradient-to-br from-white to-amber-100/30'
                    : 'border-emerald-400/30 shadow-[inset_0_1px_2px_rgba(16,185,129,0.1),0_2px_8px_rgba(16,185,129,0.08)] bg-gradient-to-br from-white to-emerald-100/30'
                }`}>
                  <p className="text-xs font-medium">
                    {shouldShowAgentInterface ? 'En attente' : 'En cours'}
                  </p>
                  <p className={`text-xl font-bold ${
                    shouldShowAgentInterface ? 'text-amber-600' : 'text-emerald-600'
                  }`}>
                    {shouldShowAgentInterface
                      ? missions.filter(m => m.status === 'PENDING' || m.status === 'AWAITING_CONFIRMATION').length
                      : myReports.filter(m => m.status === 'IN_PROGRESS' || m.status === 'AWAITING_CONFIRMATION').length
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Déconnexion stylée */}
          <div className="relative z-10 pt-8 border-t border-golden-brown-400/30">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-5 p-5 rounded-2xl bg-gradient-to-br from-white to-warm-gray-100 border border-warm-gray-400/30 text-warm-gray-700 hover:bg-gradient-to-br hover:from-red-100 hover:to-red-200/50 hover:border-red-400/40 hover:text-red-700 font-semibold transition-all duration-300 group shadow-sm hover:shadow-xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_2px_8px_rgba(0,0,0,0.04)]"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-warm-gray-100 to-warm-gray-200 flex items-center justify-center group-hover:bg-gradient-to-br group-hover:from-red-100 group-hover:to-red-200 transition-all duration-300 border border-warm-gray-400/30 group-hover:border-red-400/40 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]">
                <span className="text-2xl font-bold group-hover:text-red-600 transition-colors duration-300">🚪</span>
              </div>
              <span className="flex-1 text-left font-bold">Déconnexion</span>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transform group-hover:translate-x-1 transition-all duration-300 border border-white/70">
                <span className="text-lg font-bold text-red-600">→</span>
              </div>
            </button>

            <div className="mt-8 text-center">
              <div className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-golden-brown-400/30 to-transparent mb-4"></div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-golden-brown-600/20 to-amber-600/20 flex items-center justify-center mx-auto mb-3 border border-golden-brown-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]">
                <span className="text-sm font-bold text-golden-brown-600">©</span>
              </div>
              <p className="text-xs text-warm-gray-500 font-medium">
                Clean Mboka v2.0 • Kinshasa 2024
              </p>
              <p className="text-xs text-warm-gray-500 mt-1">
                Service Municipal de Propreté Urbaine
              </p>
            </div>
          </div>
        </div>        {/* CONTENU PRINCIPAL STYLÉ */}
        <div className="flex-1 p-6 md:p-8 lg:p-10 overflow-y-auto h-full relative">
          {/* Header avec design moderne */}
          <div className="mb-10">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
              <div className="relative">
                {/* Élément décoratif */}
                <div className="absolute -inset-4 bg-gradient-to-r from-golden-brown-600/5 to-amber-600/5 rounded-3xl blur-xl"></div>
                <div className="relative">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center shadow-lg border border-golden-brown-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_12px_rgba(193,154,107,0.25)]">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px_rgba(255,255,255,0.5)]">
                        <span className="text-2xl font-bold text-golden-brown-700">
                          {shouldShowAgentInterface
                            ? (activeTab === 'missions' ? '🛠️' :
                               activeTab === 'history' ? '📈' :
                               '🗺️')
                            : (activeTab === 'signalement' ? '📍' : '📋')
                          }
                        </span>
                      </div>
                    </div>
                    <div>
                      <h2 className="text-3xl lg:text-4xl font-bold text-warm-gray-800">
                        {shouldShowAgentInterface
                          ? (activeTab === 'missions' ? 'Missions de Collecte' :
                             activeTab === 'history' ? 'Historique des Signalements' :
                             'Carte Interactive')
                          : (activeTab === 'signalement' ? 'Nouveau Signalement' : 'Mes Signalements')
                        }
                      </h2>
                      <div className="w-24 h-1.5 bg-gradient-to-r from-golden-brown-600 to-amber-600 rounded-full mt-2"></div>
                    </div>
                  </div>
                  <p className="text-warm-gray-600 text-lg mt-4 pl-20">
                    {shouldShowAgentInterface
                      ? (activeTab === 'map'
                        ? `Visualisez les signalements dans la commune ${userCommune || 'votre secteur'}`
                        : `Gérez les signalements dans la commune ${userCommune || 'votre secteur'}`)
                      : (activeTab === 'signalement'
                        ? 'Contribuez à rendre Kinshasa plus propre'
                        : 'Suivez vos contributions citoyennes')
                    }
                  </p>
                  {/* Indicateur de mode - UNIQUEMENT POUR LES AGENTS */}
                  {isAgent && (
                    <div className="flex items-center gap-3 mt-3 pl-20">
                      <div className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-3 border ${
                        currentMode === 'agent'
                          ? 'border-golden-brown-400/40 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),0_2px_6px_rgba(193,154,107,0.15)] bg-gradient-to-br from-white to-golden-brown-100 text-golden-brown-700'
                          : 'border-emerald-400/40 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),0_2px_6px_rgba(16,185,129,0.15)] bg-gradient-to-br from-white to-emerald-100 text-emerald-700'
                      }`}>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-golden-brown-600/20 to-amber-600/20 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]">
                          <span className="text-sm font-bold">{currentMode === 'agent' ? '👷' : '👤'}</span>
                        </div>
                        <span>Mode {currentMode === 'agent' ? 'Agent' : 'Citoyen'}</span>
                      </div>
                      <span className="text-xs text-warm-gray-500">
                        (Vous pouvez basculer entre les modes depuis le menu)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Message feedback avec animation */}
              {message.text && (
                <div className={`px-8 py-6 rounded-3xl text-base font-semibold flex items-center gap-5 shadow-2xl border border-emerald-300/40 shadow-[inset_0_1px_4px_rgba(255,255,255,0.4),0_6px_24px_rgba(16,185,129,0.15)] ${
                  message.type === "success"
                    ? "bg-gradient-to-r from-emerald-50/80 to-emerald-100/50 text-emerald-800"
                    : message.type === "error"
                    ? "bg-gradient-to-r from-red-50/80 to-red-100/50 text-red-800 border-red-300/40 shadow-[inset_0_1px_4px_rgba(255,255,255,0.4),0_6px_24px_rgba(239,68,68,0.15)]"
                    : "bg-gradient-to-r from-amber-50/80 to-amber-100/50 text-amber-800 border-amber-300/40 shadow-[inset_0_1px_4px_rgba(255,255,255,0.4),0_6px_24px_rgba(245,158,11,0.15)]"
                }`}>
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center border ${
                    message.type === "success" ? "border-emerald-600/50 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_12px_rgba(16,185,129,0.2)] bg-gradient-to-br from-emerald-600 to-emerald-700" :
                    message.type === "error" ? "border-red-600/50 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_12px_rgba(239,68,68,0.2)] bg-gradient-to-br from-red-600 to-red-700" :
                    "border-amber-600/50 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_12px_rgba(245,158,11,0.2)] bg-gradient-to-br from-amber-600 to-amber-700"
                  }`}>
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px_rgba(255,255,255,0.5)]">
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

            {/* Bouton de géolocalisation pour les citoyens */}
            {!shouldShowAgentInterface && activeTab === 'signalement' && (
              <div className="mb-10 pl-20">
                <button
                  type="button"
                  onClick={getPosition}
                  disabled={loading}
                  className={`px-10 py-5 rounded-2xl font-bold text-lg transition-all duration-300 flex items-center gap-4 border border-golden-brown-600/50 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_12px_rgba(193,154,107,0.25)] ${
                    lat && lng
                      ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-2xl border-emerald-700/60'
                      : 'bg-gradient-to-br from-golden-brown-600 to-amber-600 text-white hover:shadow-3xl hover:-translate-y-2'
                  }`}
                >
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/70 shadow-[inset_0_1px_3px_rgba(255,255,255,0.5)]">
                    <span className="text-2xl font-bold">
                      {lat && lng ? '✅' : '🛰️'}
                    </span>
                  </div>
                  <span>
                    {lat && lng ? 'POSITION VERROUILLÉE' : 'ACTIVER LA GÉOLOCALISATION'}
                  </span>
                  {!lat && !lng && (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/70">
                      <span className="text-lg font-bold text-amber-600 animate-pulse">✨</span>
                    </div>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* MODALES STYLÉES */}
          {showDeleteModal && selectedReport && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-gradient-to-br from-white to-warm-gray-50/30 rounded-3xl p-10 max-w-md w-full mx-auto shadow-2xl border border-red-400/40 shadow-[inset_0_2px_5px_rgba(255,255,255,0.3),0_8px_30px_rgba(239,68,68,0.2)]">
                <div className="flex items-center gap-5 mb-8">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-lg border border-red-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_6px_20px_rgba(239,68,68,0.25)]">
                    <div className="w-18 h-18 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px_rgba(255,255,255,0.5)]">
                      <span className="text-3xl font-bold text-red-700">🗑️</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-warm-gray-800">Confirmer la suppression</h3>
                    <p className="text-sm text-warm-gray-600">Action définitive</p>
                  </div>
                </div>
                <p className="text-warm-gray-700 mb-8 text-lg">
                  Voulez-vous vraiment supprimer le signalement <span className="font-bold text-red-600">#{selectedReport.id}</span> ? Cette action ne peut pas être annulée.
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => handleDeleteReport(selectedReport.id)}
                    className="flex-1 py-5 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 text-white font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 flex items-center justify-center gap-3 border border-red-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_12px_rgba(239,68,68,0.25)]"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)]">
                      <span className="text-xl font-bold text-red-700">🗑️</span>
                    </div>
                    <span>Supprimer</span>
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 py-5 rounded-2xl bg-gradient-to-br from-white to-warm-gray-100 text-warm-gray-700 font-bold text-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 flex items-center justify-center gap-3 border border-golden-brown-400/30 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_3px_10px_rgba(0,0,0,0.06)]"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-golden-brown-100 to-golden-brown-200 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]">
                      <span className="text-xl font-bold text-golden-brown-700">✕</span>
                    </div>
                    <span>Annuler</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {showConfirmModal && selectedReport && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-gradient-to-br from-white to-warm-gray-50/30 rounded-3xl p-10 max-w-md w-full mx-auto shadow-2xl border border-emerald-400/40 shadow-[inset_0_2px_5px_rgba(255,255,255,0.3),0_8px_30px_rgba(16,185,129,0.2)]">
                <div className="text-center mb-8">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center mx-auto mb-6 shadow-lg border border-emerald-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_6px_20px_rgba(16,185,129,0.25)]">
                    <div className="w-22 h-22 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px_rgba(255,255,255,0.5)]">
                      <span className="text-4xl font-bold text-emerald-700">✅</span>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-warm-gray-800 mb-3">Confirmer la collecte</h3>
                  <p className="text-warm-gray-700 text-lg">
                    Les déchets du signalement <span className="font-bold text-emerald-600">#{selectedReport.id}</span> ont-ils été ramassés ?
                  </p>
                  {/* Section points retirée pour les citoyens */}
                  {(isAgent && currentMode === 'citizen') && (
                    <div className="mt-6 p-6 bg-gradient-to-br from-amber-50/50 to-amber-100/30 rounded-2xl border border-amber-400/40 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_2px_8px_rgba(245,158,11,0.1)]">
                      <span className="font-bold text-amber-700 text-xl flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)]">
                          <span className="text-lg font-bold text-amber-600">👷</span>
                        </div>
                        Agent en mode citoyen
                      </span>
                      <p className="text-sm text-amber-600 mt-2">Confirmation enregistrée</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => handleConfirmCollection(selectedReport.id)}
                    className="flex-1 py-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 flex items-center justify-center gap-3 border border-emerald-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_12px_rgba(16,185,129,0.25)]"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)]">
                      <span className="text-xl font-bold text-emerald-700">✅</span>
                    </div>
                    <span>Oui, confirmé</span>
                  </button>
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="flex-1 py-5 rounded-2xl bg-gradient-to-br from-white to-warm-gray-100 text-warm-gray-700 font-bold text-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 flex items-center justify-center gap-3 border border-golden-brown-400/30 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_3px_10px_rgba(0,0,0,0.06)]"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-golden-brown-100 to-golden-brown-200 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]">
                      <span className="text-xl font-bold text-golden-brown-700">✕</span>
                    </div>
                    <span>Annuler</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODALE DE SOUMISSION PHOTO POUR RAMASSEUR */}
          {showCleanupModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-gradient-to-br from-white to-warm-gray-50/30 rounded-3xl p-10 max-w-md w-full mx-auto shadow-2xl border border-purple-400/40 shadow-[inset_0_2px_5px_rgba(255,255,255,0.3),0_8px_30px_rgba(168,85,247,0.2)]">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-5">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center shadow-lg border border-purple-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_6px_20px_rgba(168,85,247,0.25)]">
                      <div className="w-18 h-18 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px_rgba(255,255,255,0.5)]">
                        <span className="text-3xl font-bold text-purple-700">📸</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-warm-gray-800">Preuve de ramassage</h3>
                      <p className="text-sm text-warm-gray-600">Prenez une photo après le nettoyage</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCleanupModal(false)}
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center hover:bg-gradient-to-br hover:from-red-100 hover:to-red-200 transition-all duration-300 border border-golden-brown-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]"
                  >
                    <span className="text-xl font-bold text-warm-gray-700 hover:text-red-600 transition-colors">✕</span>
                  </button>
                </div>

                {/* CORRECTION: Input file caché pour la photo */}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  id="cleanup-photo-file"
                  className="hidden"
                  onChange={handleCleanupPhotoChange}
                  disabled={loading}
                />

                {/* Zone upload photo - MODIFIÉ: Utiliser label for */}
                <div className="mb-8">
                  <label
                    htmlFor="cleanup-photo-file"
                    className={`block w-full border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 relative overflow-hidden group shadow-[inset_0_2px_8px_rgba(168,85,247,0.1)] ${
                      cleanupPhoto
                        ? 'border-emerald-500/70 bg-gradient-to-br from-emerald-50/50 to-emerald-100/30 shadow-inner'
                        : 'border-purple-300/50 hover:border-purple-400/70 hover:bg-gradient-to-br hover:from-purple-50/50 hover:to-purple-100/30'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className={`relative z-10 mb-8 transition-transform duration-300 ${cleanupPhoto ? 'scale-110' : ''}`}>
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center mx-auto shadow-lg border border-purple-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_12px_rgba(168,85,247,0.25)]">
                        <div className="w-22 h-22 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px_rgba(255,255,255,0.5)]">
                          <span className="text-5xl font-bold text-purple-700">
                            {cleanupPhoto ? '✅' : '📷'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="relative z-10 text-2xl font-bold text-warm-gray-800 mb-3">
                      {cleanupPhoto ? 'PHOTO ENREGISTRÉE' : 'AJOUTER UNE PHOTO'}
                    </p>
                    <p className="relative z-10 text-warm-gray-600">
                      {cleanupPhoto ? 'Cliquez pour changer de photo' : 'Cliquez pour prendre une photo'}
                    </p>
                    {!cleanupPhoto && (
                      <p className="relative z-10 text-sm text-warm-gray-500 mt-4">
                        Formats acceptés : JPG, PNG, WEBP • Taille max : 5MB
                      </p>
                    )}
                  </label>
                </div>

                {/* Notes optionnelles */}
                <div className="mb-8">
                  <label className="block text-sm font-bold text-warm-gray-700 mb-4">Notes (optionnel)</label>
                  <textarea 
                    value={cleanupNotes}
                    onChange={(e) => setCleanupNotes(e.target.value)}
                    placeholder="Détails sur le ramassage..."
                    className="w-full bg-gradient-to-br from-white to-warm-gray-50 border border-warm-gray-400/30 rounded-2xl p-6 text-gray-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]"
                    rows="3"
                  />
                </div>

                {/* Boutons d'action */}
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowCleanupModal(false)}
                    className="flex-1 py-5 rounded-2xl bg-gradient-to-br from-white to-warm-gray-100 text-warm-gray-700 font-bold hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex items-center justify-center gap-3 border border-golden-brown-400/30 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_3px_10px_rgba(0,0,0,0.06)]"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-golden-brown-100 to-golden-brown-200 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]">
                      <span className="text-xl font-bold text-golden-brown-700">✕</span>
                    </div>
                    <span>Annuler</span>
                  </button>
                  <button
                    onClick={handleSubmitCleanupPhoto}
                    disabled={!cleanupPhoto || loading}
                    className="flex-1 py-5 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-700 text-white font-bold shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 flex items-center justify-center gap-3 border border-purple-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_12px_rgba(168,85,247,0.25)] disabled:opacity-50"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)]">
                      <span className="text-xl font-bold text-purple-700">📤</span>
                    </div>
                    <span>Soumettre</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODALE DE REFUS POUR CITOYEN */}
          {showDisputeModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-gradient-to-br from-white to-warm-gray-50/30 rounded-3xl p-10 max-w-md w-full mx-auto shadow-2xl border border-red-400/40 shadow-[inset_0_2px_5px_rgba(255,255,255,0.3),0_8px_30px_rgba(239,68,68,0.2)]">
                <div className="text-center mb-8">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center mx-auto mb-6 shadow-lg border border-red-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_6px_20px_rgba(239,68,68,0.25)]">
                    <div className="w-22 h-22 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px_rgba(255,255,255,0.5)]">
                      <span className="text-4xl font-bold text-red-700">⚠️</span>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-warm-gray-800 mb-3">Refuser la collecte</h3>
                  <p className="text-warm-gray-700 text-lg">
                    Veuillez expliquer pourquoi vous refusez cette collecte
                  </p>
                </div>

                <div className="mb-8">
                  <textarea
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    placeholder="Ex: Les déchets n'ont pas été entièrement ramassés, la zone est toujours sale, mauvais travail..."
                    className="w-full bg-gradient-to-br from-white to-warm-gray-50 border border-red-400/30 rounded-2xl p-6 text-gray-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]"
                    rows="4"
                    minLength="10"
                  />
                  <p className="text-sm text-gray-500 mt-2">Minimum 10 caractères requis</p>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setShowDisputeModal(false);
                      setDisputeReason("");
                    }}
                    className="flex-1 py-5 rounded-2xl bg-gradient-to-br from-white to-warm-gray-100 text-warm-gray-700 font-bold hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex items-center justify-center gap-3 border border-golden-brown-400/30 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_3px_10px_rgba(0,0,0,0.06)]"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-golden-brown-100 to-golden-brown-200 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]">
                      <span className="text-xl font-bold text-golden-brown-700">✕</span>
                    </div>
                    <span>Annuler</span>
                  </button>
                  <button
                    onClick={() => handleConfirmCleanup(reportToDispute, false, disputeReason)}
                    disabled={!disputeReason || disputeReason.length < 10 || loading}
                    className="flex-1 py-5 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 text-white font-bold shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 flex items-center justify-center gap-3 border border-red-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_12px_rgba(239,68,68,0.25)] disabled:opacity-50"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)]">
                      <span className="text-xl font-bold text-red-700">⚠️</span>
                    </div>
                    <span>Refuser</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CONTENU SELON RÔLE ET ONGLET */}
          {shouldShowAgentInterface ? (
            // === INTERFACE AGENT STYLÉE ===
            <div className="w-full mx-auto">
              {activeTab === 'map' ? (
                // === CARTE INTERACTIVE ===
                <div>
                  <div className="bg-gradient-to-br from-white to-warm-gray-50/30 rounded-3xl p-10 mb-8 border border-golden-brown-400/30 shadow-[inset_0_1px_4px_rgba(193,154,107,0.15),0_6px_24px_rgba(0,0,0,0.08)]">
                    <div className="flex items-center justify-between mb-10">
                      <div className="flex items-center gap-5">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center shadow-lg border border-golden-brown-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_6px_20px_rgba(193,154,107,0.25)]">
                          <div className="w-18 h-18 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px_rgba(255,255,255,0.5)]">
                            <span className="text-3xl font-bold text-golden-brown-700">🗺️</span>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-warm-gray-800">
                            Carte Interactive - {userCommune}
                          </h3>
                          <p className="text-warm-gray-600">
                            Visualisez les signalements sur la carte
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            if (activeTab === 'missions') {
                              fetchMissions(token);
                            } else if (activeTab === 'history') {
                              fetchHistory(token);
                            }
                          }}
                          className="px-6 py-4 rounded-2xl bg-gradient-to-br from-white to-warm-gray-100 text-warm-gray-700 font-bold hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex items-center gap-3 border border-golden-brown-400/30 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_3px_10px_rgba(0,0,0,0.06)]"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-golden-brown-100 to-golden-brown-200 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]">
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
                      onQuartierClick={handleQuartierClick}
                      reports={transformReportsForMap(missions)}
                      token={token}
                      API_BASE_URL={API_BASE_URL}
                      onTakeMission={handleTakeMission}
                      onCompleteMission={handleCompleteMission}
                      loading={loading}
                      isAgent={true}
                    />

                    {/* Instructions */}
                    <div className="mt-8 p-6 bg-gradient-to-br from-white to-golden-brown-100/30 rounded-2xl border border-golden-brown-400/30 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_3px_10px_rgba(0,0,0,0.06)]">
                      <h4 className="font-bold text-golden-brown-800 mb-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-golden-brown-600/20 to-amber-600/20 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]">
                          <span className="text-sm font-bold text-golden-brown-600">🎯</span>
                        </div>
                        Comment utiliser la carte :
                      </h4>
                      <ul className="text-sm text-warm-gray-700 space-y-2">
                        <li className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full border border-red-600 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]"></div>
                          <span><span className="font-bold text-red-600">Points rouges</span> : Signalements en attente</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full border border-blue-600 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]"></div>
                          <span><span className="font-bold text-blue-600">Points bleus</span> : Signalements en cours</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-emerald-500 rounded-full border border-emerald-600 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]"></div>
                          <span><span className="font-bold text-emerald-600">Points verts</span> : Signalements terminés</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-purple-500 rounded-full border border-purple-600 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]"></div>
                          <span><span className="font-bold text-purple-600">Points violets</span> : En attente de confirmation</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-orange-500 rounded-full border border-orange-600 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]"></div>
                          <span><span className="font-bold">Cercles colorés</span> : Quartiers (taille = nombre de signalements)</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-indigo-500 rounded-full border border-indigo-600 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]"></div>
                          <span><span className="font-bold">Cliquez sur un quartier</span> pour voir les statistiques</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Détails du quartier sélectionné */}
                  {selectedQuartierDetails && (
                    <div className="bg-gradient-to-br from-white to-warm-gray-50/30 rounded-3xl p-10 mt-8 border border-golden-brown-400/30 shadow-[inset_0_1px_4px_rgba(193,154,107,0.15),0_6px_24px_rgba(0,0,0,0.08)]">
                      <div className="flex justify-between items-start mb-8">
                        <div>
                          <div className="flex items-center gap-4 mb-3">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center border border-golden-brown-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_12px_rgba(193,154,107,0.25)]">
                              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px_rgba(255,255,255,0.5)]">
                                <span className="text-2xl font-bold text-golden-brown-700">📍</span>
                              </div>
                            </div>
                            <div>
                              <h3 className="text-2xl font-bold text-warm-gray-800">
                                {selectedQuartierDetails.quartier.name}
                              </h3>
                              <p className="text-warm-gray-600">
                                Commune: {selectedQuartierDetails.quartier.commune}
                              </p>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedQuartierDetails(null)}
                          className="w-12 h-12 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center hover:bg-gradient-to-br hover:from-red-100 hover:to-red-200 transition-all duration-300 border border-golden-brown-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]"
                        >
                          <span className="text-xl font-bold text-warm-gray-700 hover:text-red-600 transition-colors">✕</span>
                        </button>
                      </div>

                      {/* Statistiques du quartier */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
                        <div className="bg-gradient-to-br from-white to-golden-brown-100/30 rounded-2xl p-8 text-center border border-golden-brown-400/30 shadow-[inset_0_1px_4px_rgba(193,154,107,0.1),0_4px_16px_rgba(0,0,0,0.06)]">
                          <p className="text-xs font-bold text-golden-brown-600 uppercase tracking-wider">TOTAL</p>
                          <p className="text-5xl font-bold text-golden-brown-700 mt-2">{selectedQuartierDetails.stats.total}</p>
                        </div>
                        <div className="bg-gradient-to-br from-white to-amber-100/30 rounded-2xl p-8 text-center border border-amber-400/30 shadow-[inset_0_1px_4px_rgba(245,158,11,0.1),0_4px_16px_rgba(245,158,11,0.06)]">
                          <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">EN ATTENTE</p>
                          <p className="text-5xl font-bold text-amber-600 mt-2">{selectedQuartierDetails.stats.pending}</p>
                        </div>
                        <div className="bg-gradient-to-br from-white to-golden-brown-100/30 rounded-2xl p-8 text-center border border-golden-brown-400/30 shadow-[inset_0_1px_4px_rgba(193,154,107,0.1),0_4px_16px_rgba(0,0,0,0.06)]">
                          <p className="text-xs font-bold text-golden-brown-700 uppercase tracking-wider">EN COURS</p>
                          <p className="text-5xl font-bold text-golden-brown-700 mt-2">{selectedQuartierDetails.stats.in_progress}</p>
                        </div>
                        <div className="bg-gradient-to-br from-white to-emerald-100/30 rounded-2xl p-8 text-center border border-emerald-400/30 shadow-[inset_0_1px_4px_rgba(16,185,129,0.1),0_4px_16px_rgba(16,185,129,0.06)]">
                          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">TERMINÉS</p>
                          <p className="text-5xl font-bold text-emerald-600 mt-2">{selectedQuartierDetails.stats.completed}</p>
                        </div>
                      </div>

                      {/* Liste des signalements du quartier */}
                      <div>
                        <h4 className="text-xl font-bold text-warm-gray-800 mb-6 flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-golden-brown-600/20 to-amber-600/20 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]">
                            <span className="text-lg font-bold text-golden-brown-600">📋</span>
                          </div>
                          Signalements récents
                        </h4>
                        {selectedQuartierDetails.reports && selectedQuartierDetails.reports.length > 0 ? (
                          <div className="space-y-4 max-h-96 overflow-y-auto">
                            {selectedQuartierDetails.reports.slice(0, 10).map((report) => (
                              <div key={report.id} className="bg-gradient-to-br from-white to-warm-gray-50/30 border border-warm-gray-400/25 shadow-[inset_0_1px_3px_rgba(120,113,108,0.1),0_3px_10px_rgba(0,0,0,0.05)] rounded-2xl p-8 hover:shadow-xl transition-shadow">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="flex items-center gap-3 mb-4">
                                      <span className={`px-4 py-2 rounded-xl text-sm font-bold ${getStatusColor(report.status)}`}>
                                        {getStatusText(report.status)}
                                      </span>
                                      <span className="text-sm text-warm-gray-500 px-3 py-1.5 rounded-lg bg-gradient-to-br from-white to-warm-gray-100 border border-warm-gray-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]">
                                        {formatDate(report.created_at)}
                                      </span>
                                    </div>
                                    <p className="font-bold text-warm-gray-800 text-lg">Signalement #{report.id}</p>
                                    {report.description && (
                                      <p className="text-warm-gray-600 mt-3">{report.description.substring(0, 150)}...</p>
                                    )}
                                  </div>
                                  {report.status === 'PENDING' && (
                                    <button
                                      onClick={() => handleTakeMission(report.id)}
                                      className="px-6 py-3 rounded-xl bg-gradient-to-br from-golden-brown-600 to-amber-600 text-white font-bold hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex items-center gap-2 border border-golden-brown-700/60 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_2px_8px_rgba(193,154,107,0.2)]"
                                    >
                                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)]">
                                        <span className="text-lg font-bold text-golden-brown-700">✅</span>
                                      </div>
                                      <span>Prendre en charge</span>
                                    </button>
                                  )}
                                </div>
                                <div className="flex items-center justify-between mt-6 pt-6 border-t border-warm-gray-300/30">
                                  <div className="text-sm text-warm-gray-500">
                                    Signalé par: {report.user_name || 'Anonyme'}
                                  </div>
                                  <div className="text-sm text-warm-gray-500">
                                    {report.collector_name ? `Collecteur: ${report.collector_name}` : 'Non assigné'}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center mx-auto mb-6 border border-warm-gray-400/30 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4)]">
                              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-warm-gray-100 to-warm-gray-200 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]">
                                <span className="text-4xl font-bold text-warm-gray-400">📭</span>
                              </div>
                            </div>
                            <p className="text-warm-gray-600 text-lg">Aucun signalement dans ce quartier</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // === INTERFACE AGENT NORMALE (missions/historique) ===
                <div>
                  {/* Liste des missions avec design moderne */}
                  <div className="bg-gradient-to-br from-white to-warm-gray-50/30 rounded-3xl overflow-hidden border border-golden-brown-400/30 shadow-[inset_0_1px_4px_rgba(193,154,107,0.15),0_6px_24px_rgba(0,0,0,0.08)]">
                    <div className="p-10 border-b border-warm-gray-300/30 bg-gradient-to-r from-golden-brown-600/10 to-transparent">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div>
                          <h3 className="text-2xl font-bold text-warm-gray-800 mb-3 flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center border border-golden-brown-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_12px_rgba(193,154,107,0.25)]">
                              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px_rgba(255,255,255,0.5)]">
                                <span className="text-2xl font-bold text-golden-brown-700">
                                  {activeTab === 'missions' ? '🛠️' : '📈'}
                                </span>
                              </div>
                            </div>
                            <div>
                              <span>{activeTab === 'missions' ? 'Signalements à traiter' : 'Historique des signalements'}</span>
                              <p className="text-warm-gray-600 text-lg font-normal mt-2">
                                {activeTab === 'missions'
                                  ? 'Prenez en charge les signalements en attente de traitement'
                                  : 'Consultez l\'historique des 30 derniers jours'
                                }
                              </p>
                            </div>
                          </h3>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => activeTab === 'missions' ? fetchMissions(token) : fetchHistory(token)}
                            className="px-8 py-4 rounded-2xl bg-gradient-to-br from-white to-warm-gray-100 text-warm-gray-700 font-bold hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex items-center gap-3 border border-golden-brown-400/30 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_3px_10px_rgba(0,0,0,0.06)]"
                          >
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-golden-brown-100 to-golden-brown-200 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]">
                              <span className="text-lg font-bold text-golden-brown-700">🔄</span>
                            </div>
                            <span>Actualiser</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {missionsLoading ? (
                      <div className="p-16 text-center">
                        <div className="inline-block w-24 h-24 border border-warm-gray-400/30 border-t-golden-brown-600 rounded-full animate-spin"></div>
                        <p className="mt-6 text-warm-gray-600 text-lg">Chargement des signalements...</p>
                        <p className="text-sm text-warm-gray-500 mt-2">Veuillez patienter</p>
                      </div>
                    ) : missions.filter(m => activeTab === 'missions' ? m.status !== 'COMPLETED' : true).length === 0 ? (
                      <div className="p-16 text-center">
                        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center mx-auto mb-6 shadow-lg border border-golden-brown-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_6px_20px_rgba(193,154,107,0.25)]">
                          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px_rgba(255,255,255,0.5)]">
                            <span className="text-5xl font-bold text-golden-brown-700">
                              {activeTab === 'missions' ? '🎉' : '📊'}
                            </span>
                          </div>
                        </div>
                        <h3 className="text-2xl font-bold text-warm-gray-700 mb-3">
                          {activeTab === 'missions' ? 'Aucune mission en cours' : 'Aucun signalement'}
                        </h3>
                        <p className="text-warm-gray-600 text-lg mb-8 max-w-md mx-auto">
                          {activeTab === 'missions'
                            ? 'Tous les signalements ont été traités dans votre secteur. Kinshasa est propre !'
                            : 'Aucun signalement n\'a été enregistré dans les 30 derniers jours.'
                          }
                        </p>
                        {activeTab === 'missions' && (
                          <button
                            onClick={() => {
                              setActiveTab('history');
                              fetchHistory(token);
                            }}
                            className="px-10 py-5 rounded-2xl bg-gradient-to-br from-golden-brown-600 to-amber-600 text-white font-bold hover:shadow-xl transition-all duration-300 hover:-translate-y-2 flex items-center gap-3 border border-golden-brown-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_12px_rgba(193,154,107,0.25)]"
                          >
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)]">
                              <span className="text-xl font-bold text-golden-brown-700">📊</span>
                            </div>
                            <span>Consulter l'historique</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="divide-y divide-warm-gray-300/30">
                        {missions
                          .filter(m => activeTab === 'missions' ? m.status !== 'COMPLETED' : true)
                          .map((mission) => (
                          <div key={mission.id} className="p-10 hover:bg-gradient-to-r hover:from-golden-brown-50/30 hover:to-transparent transition-all duration-300">
                            <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-10">
                              <div className="flex-1">
                                <div className="flex items-center gap-4 mb-8">
                                  <span className={`px-5 py-2.5 rounded-xl text-sm font-bold ${getStatusColor(mission.status)}`}>
                                    {getStatusText(mission.status)}
                                  </span>
                                  <span className="text-sm text-warm-gray-500 px-4 py-2 rounded-xl bg-gradient-to-br from-white to-warm-gray-100 border border-warm-gray-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]">
                                    {formatDate(mission.created_at)}
                                  </span>
                                </div>

                                <div className="mb-8">
                                  <h4 className="text-2xl font-bold text-warm-gray-800 mb-4">Signalement #{mission.id}</h4>
                                  {mission.description && (
                                    <p className="text-warm-gray-600 text-lg mb-6 leading-relaxed">{mission.description}</p>
                                  )}
                                </div>

                                {/* Affichage du statut de confirmation */}
                                {mission.status === 'AWAITING_CONFIRMATION' && (
                                  <div className="mb-8 p-6 bg-gradient-to-r from-purple-500/10 to-purple-600/10 rounded-2xl border border-purple-400/30">
                                    <div className="flex items-center gap-4">
                                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center border border-purple-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)]">
                                          <span className="text-2xl font-bold text-purple-700">⏳</span>
                                        </div>
                                      </div>
                                      <div>
                                        <p className="font-bold text-purple-700 text-lg">En attente de confirmation citoyenne</p>
                                        <p className="text-purple-600 text-sm">
                                          Photo soumise le {formatDate(mission.cleanup_photo_submitted_at)}
                                        </p>
                                        {mission.confirmation_deadline && (
                                          <p className="text-purple-500 text-xs mt-1">
                                            Confirmation automatique dans {Math.floor((new Date(mission.confirmation_deadline) - new Date()) / (1000 * 60 * 60))}h
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {mission.status === 'DISPUTED' && (
                                  <div className="mb-8 p-6 bg-gradient-to-r from-red-500/10 to-red-600/10 rounded-2xl border border-red-400/30">
                                    <div className="flex items-center gap-4">
                                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center border border-red-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)]">
                                          <span className="text-2xl font-bold text-red-700">⚠️</span>
                                        </div>
                                      </div>
                                      <div>
                                        <p className="font-bold text-red-700 text-lg">En litige - Refusé par le citoyen</p>
                                        <p className="text-red-600 text-sm">
                                          Raison: {mission.dispute_reason || "Non spécifiée"}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                                  <div className="bg-gradient-to-br from-white to-golden-brown-100/30 rounded-2xl p-8 border border-golden-brown-400/30 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_3px_10px_rgba(0,0,0,0.06)]">
                                    <p className="text-xs font-bold text-golden-brown-600 uppercase tracking-wider mb-4">📍 Localisation</p>
                                    <p className="font-mono text-lg text-warm-gray-800 font-medium">
                                      {mission.latitude?.toFixed(6) || 'N/A'}, {mission.longitude?.toFixed(6) || 'N/A'}
                                    </p>
                                    <p className="text-sm text-warm-gray-600 mt-3">{mission.address_description || 'Adresse non spécifiée'}</p>
                                  </div>

                                  <div className="bg-gradient-to-br from-white to-warm-gray-100/30 rounded-2xl p-8 border border-warm-gray-400/30 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_3px_10px_rgba(0,0,0,0.06)]">
                                    <p className="text-xs font-bold text-warm-gray-600 uppercase tracking-wider mb-4">👤 Signalé par</p>
                                    <p className="font-bold text-warm-gray-800 text-xl">{mission.reporter_full_name || mission.user?.full_name || 'Anonyme'}</p>
                                    <p className="text-warm-gray-600">{mission.reporter_phone || mission.user?.phone || 'Tél. non disponible'}</p>
                                    <p className="text-sm text-warm-gray-500 mt-2">{mission.reporter_commune || mission.user?.commune || 'Commune inconnue'}</p>
                                  </div>
                                </div>

                                {/* Photo du signalement avec design amélioré */}
                                {mission.image_url && (
                                  <div className="mt-8">
                                    <p className="text-xs font-bold text-warm-gray-600 uppercase tracking-wider mb-6">📸 Photo du signalement</p>
                                    <div className="flex flex-col lg:flex-row gap-10">
                                      <div className="relative w-full lg:w-80 h-80 rounded-2xl overflow-hidden border border-warm-gray-400/30 shadow-xl shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
                                        <img
                                          src={`${API_BASE_URL}${mission.image_url}`}
                                          alt="Photo du signalement"
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjE5MiIgaGVpZ2h0PSIxOTIiIGZpbGw9IiNFM0UzRTMiLz48cGF0aCBkPSJNMTIwIDg0QzEyMCA5Ny4yNTQ4IDEwOS4yNTUgMTA4IDk2IDEwOEM4Mi43NDUyIDEwOCA3MiA5Ny4yNTQ4IDcyIDg0QzcyIDcwLjc0NTIgODIuNzQ1MiA2MCA5NiA2MEMxMDkuMjU1IDYwIDEyMCA3MC43NDUyIDEyMCA4NFoiIGZpbGw9IiNCQ0JDQkMiLz48cGF0aCBkPSJNMTQ0IDE0MEg0OEMzOS4xNjM0IDE0MCAzMiAxMzIuODM3IDMyIDEyNFY5NkMzMiA4Ny4xNjM0IDM5LjE2MzQgODAgNDggODBIMTQ0QzE1Mi44MzcgODAgMTYwIDg3LjE2MzQgMTYwIDk2VjEyNEMxNjAgMTMyLjgzNyAxNTIuODM3IDE0MCAxNDQgMTQwWiIgZmlsbD0iI0JDQkNCQyIvPjwvc3ZnPg==';
                                          }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                                        <a
                                          href={`${API_BASE_URL}${mission.image_url}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="absolute bottom-6 right-6 px-6 py-3 rounded-xl bg-gradient-to-br from-golden-brown-600 to-amber-600 text-white font-bold hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex items-center gap-2 border border-golden-brown-700/60 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_2px_8px_rgba(193,154,107,0.2)]"
                                        >
                                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)]">
                                            <span className="text-lg font-bold text-golden-brown-700">🔍</span>
                                          </div>
                                          <span>Agrandir</span>
                                        </a>
                                      </div>
                                      <div className="flex-1">
                                        <div className="bg-gradient-to-br from-white to-warm-gray-100/30 rounded-2xl p-8 border border-warm-gray-400/30 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_3px_10px_rgba(0,0,0,0.06)]">
                                          <p className="text-xs font-bold text-warm-gray-600 uppercase tracking-wider mb-4">🎯 Coordonnées GPS</p>
                                          <div className="font-mono text-lg text-warm-gray-800 space-y-3 bg-gradient-to-br from-white to-warm-gray-100 p-6 rounded-xl border border-warm-gray-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]">
                                            <p><span className="text-golden-brown-600">Latitude:</span> {mission.latitude?.toFixed(6)}</p>
                                            <p><span className="text-golden-brown-600">Longitude:</span> {mission.longitude?.toFixed(6)}</p>
                                          </div>
                                          {mission.latitude && mission.longitude && (
                                            <a
                                              href={`https://maps.google.com/?q=${mission.latitude},${mission.longitude}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-4 mt-6 px-8 py-4 rounded-2xl bg-gradient-to-br from-white to-warm-gray-100 text-warm-gray-700 font-bold hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-golden-brown-400/30 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_3px_10px_rgba(0,0,0,0.06)]"
                                            >
                                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-golden-brown-100 to-golden-brown-200 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]">
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

                              {/* Actions avec design moderne */}
                              <div className="flex flex-col gap-5 min-w-[320px]">
                                {mission.status === 'PENDING' && (
                                  <button
                                    onClick={() => handleTakeMission(mission.id)}
                                    disabled={loading}
                                    className="px-10 py-5 rounded-2xl bg-gradient-to-br from-golden-brown-600 to-amber-600 text-white font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 flex items-center justify-center gap-4 group border border-golden-brown-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_12px_rgba(193,154,107,0.25)]"
                                  >
                                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px_rgba(255,255,255,0.5)]">
                                      <span className="text-2xl font-bold text-golden-brown-700">✅</span>
                                    </div>
                                    <span>Prendre en charge</span>
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transform group-hover:translate-x-2 transition-all duration-300 border border-white/70">
                                      <span className="text-lg font-bold text-amber-600 animate-pulse">🚀</span>
                                    </div>
                                  </button>
                                )}

                                {mission.status === 'IN_PROGRESS' && (
                                  <button
                                    onClick={() => handleCompleteMission(mission.id)}
                                    disabled={loading}
                                    className="px-10 py-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 flex items-center justify-center gap-4 group border border-emerald-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_12px_rgba(16,185,129,0.25)]"
                                  >
                                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px_rgba(255,255,255,0.5)]">
                                      <span className="text-2xl font-bold text-emerald-700">📸</span>
                                    </div>
                                    <span>Soumettre la preuve</span>
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transform group-hover:translate-x-2 transition-all duration-300 border border-white/70">
                                      <span className="text-lg font-bold text-emerald-600 animate-pulse">🎯</span>
                                    </div>
                                  </button>
                                )}

                                {mission.status === 'AWAITING_CONFIRMATION' && (
                                  <div className="px-10 py-5 rounded-2xl bg-gradient-to-br from-purple-100/50 to-purple-200/30 border border-purple-400/40 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_3px_10px_rgba(168,85,247,0.1)] text-purple-800 font-bold text-lg text-center shadow-lg">
                                    <div className="flex items-center justify-center gap-4">
                                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)]">
                                        <span className="text-2xl font-bold text-purple-700">⏳</span>
                                      </div>
                                      <div>
                                        <span>En attente de confirmation</span>
                                        <p className="text-sm text-purple-600 mt-1">Photo soumise, attente citoyen</p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {mission.status === 'DISPUTED' && (
                                  <div className="px-10 py-5 rounded-2xl bg-gradient-to-br from-red-100/50 to-red-200/30 border border-red-400/40 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_3px_10px_rgba(239,68,68,0.1)] text-red-800 font-bold text-lg text-center shadow-lg">
                                    <div className="flex items-center justify-center gap-4">
                                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)]">
                                        <span className="text-2xl font-bold text-red-700">⚠️</span>
                                      </div>
                                      <div>
                                        <span>En litige</span>
                                        <p className="text-sm text-red-600 mt-1">Refusé par le citoyen</p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {mission.status === 'COMPLETED' && (
                                  <div className="px-10 py-5 rounded-2xl bg-gradient-to-br from-emerald-100/50 to-emerald-200/30 border border-emerald-400/40 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_3px_10px_rgba(16,185,129,0.1)] text-emerald-800 font-bold text-lg text-center shadow-lg">
                                    <div className="flex items-center justify-center gap-4">
                                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)]">
                                        <span className="text-2xl font-bold text-emerald-700">🏆</span>
                                      </div>
                                      <span>Mission accomplie</span>
                                    </div>
                                  </div>
                                )}

                                {mission.latitude && mission.longitude && (
                                  <a
                                    href={`https://maps.google.com/?q=${mission.latitude},${mission.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-10 py-5 rounded-2xl bg-gradient-to-br from-white to-warm-gray-100 text-warm-gray-700 font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex items-center justify-center gap-4 group border border-golden-brown-400/30 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_3px_10px_rgba(0,0,0,0.06)]"
                                  >
                                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-golden-brown-100 to-golden-brown-200 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]">
                                      <span className="text-2xl font-bold text-golden-brown-700">🗺️  </span>
                                    </div>
                                    <span>Voir sur carte</span>
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transform group-hover:translate-x-2 transition-all duration-300 border border-white/70">
                                      <span className="text-lg font-bold text-golden-brown-600 animate-pulse">📍</span>
                                    </div>
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
              )}
            </div>
          ) : (
            // === INTERFACE CITOYEN STYLÉE ===
            <div className="w-full mx-auto">
              {activeTab === 'signalement' ? (
                // FORMULAIRE DE SIGNALEMENT AVEC DESIGN MODIFIÉ
                <div className="max-w-6xl mx-auto">

                  {/* Formulaire en deux colonnes avec design moderne */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12">
                    {/* Photo avec design enrichi */}
                    <div className="bg-gradient-to-br from-white to-warm-gray-50/30 p-10 relative overflow-hidden border border-golden-brown-400/30 shadow-[inset_0_1px_4px_rgba(193,154,107,0.15),0_6px_24px_rgba(0,0,0,0.08)] rounded-3xl">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-golden-brown-600/10 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
                      <div className="relative z-10">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          id="photo-upload"
                          onChange={handleFileChange}
                          disabled={loading}
                        />
                        <label
                          htmlFor="photo-upload"
                          className={`block w-full border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-300 relative overflow-hidden group shadow-[inset_0_2px_8px_rgba(193,154,107,0.1)] ${
                            selectedFile
                              ? 'border-emerald-500/70 bg-gradient-to-br from-emerald-50/50 to-emerald-100/30 shadow-inner'
                              : 'border-golden-brown-300/50 hover:border-golden-brown-400/70 hover:bg-gradient-to-br hover:from-golden-brown-50/50 hover:to-golden-brown-100/30'
                          } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-golden-brown-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          <div className={`relative z-10 mb-8 transition-transform duration-300 ${selectedFile ? 'scale-110' : ''}`}>
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center mx-auto shadow-lg border border-golden-brown-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_12px_rgba(193,154,107,0.25)]">
                              <div className="w-22 h-22 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px_rgba(255,255,255,0.5)]">
                                <span className="text-5xl font-bold text-golden-brown-700">
                                  {selectedFile ? '✅' : '📷'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <p className="relative z-10 text-2xl font-bold text-warm-gray-800 mb-3">
                            {selectedFile ? 'PHOTO ENREGISTRÉE' : 'AJOUTER UNE PHOTO'}
                          </p>
                          <p className="relative z-10 text-warm-gray-600">
                            {selectedFile ? selectedFile.name : 'Cliquez pour sélectionner une image'}
                          </p>
                          {selectedFile && (
                            <p className="relative z-10 text-sm text-warm-gray-500 mt-4">
                              Taille : {(selectedFile.size / 1024).toFixed(2)} KB • Format : {selectedFile.type.split('/')[1]}
                            </p>
                          )}
                          {!selectedFile && (
                            <p className="relative z-10 text-sm text-warm-gray-500 mt-4">
                              Formats acceptés : JPG, PNG, WEBP • Taille max : 5MB
                            </p>
                          )}
                        </label>
                      </div>
                    </div>

                    {/* Nature des déchets avec design enrichi */}
                    <div className="bg-gradient-to-br from-white to-warm-gray-50/30 p-10 relative overflow-hidden border border-golden-brown-400/30 shadow-[inset_0_1px_4px_rgba(193,154,107,0.15),0_6px_24px_rgba(0,0,0,0.08)] rounded-3xl">
                      <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-red-600/10 to-transparent rounded-full -translate-y-16 -translate-x-16"></div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-5 mb-10">
                          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-lg border border-red-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_12px_rgba(239,68,68,0.25)]">
                            <div className="w-18 h-18 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px_rgba(255,255,255,0.5)]">
                              <span className="text-3xl font-bold text-red-700">🗑️</span>
                            </div>
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold text-warm-gray-800 mb-3">Nature des déchets</h3>
                            <p className="text-warm-gray-600">Décrivez le type de déchets observés</p>
                          </div>
                        </div>
                        <textarea
                          className="input-golden w-full h-80 rounded-2xl p-8 resize-none bg-white/90 text-lg placeholder-warm-gray-400 border border-golden-brown-300/30 shadow-[inset_0_2px_6px_rgba(193,154,107,0.1)]"
                          placeholder="Décrivez le type de déchets (plastiques, déchets ménagers, gravats, etc.), la quantité estimée et tout danger potentiel"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          disabled={loading}
                        ></textarea>
                        <div className="mt-6 p-6 bg-gradient-to-br from-white to-golden-brown-100/30 rounded-2xl border border-golden-brown-400/30 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_3px_10px_rgba(0,0,0,0.06)]">
                          <p className="text-sm text-warm-gray-600">
                            <span className="font-bold text-golden-brown-600">Exemple :</span> "Déchets plastiques mélangés à des déchets ménagers, environ 2 mètres cubes, risque d'incendie, odeurs nauséabondes"
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Localisation manuelle avant le bouton de soumission */}
                  <div className="mb-12">
                    <div className="bg-gradient-to-br from-white to-warm-gray-50/30 rounded-3xl overflow-hidden border border-golden-brown-400/30 shadow-[inset_0_1px_4px_rgba(193,154,107,0.15),0_6px_24px_rgba(0,0,0,0.08)]">
                      <div className="p-10 bg-gradient-to-r from-amber-600/10 to-transparent">
                        <div className="flex items-center gap-5 mb-8">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center border border-amber-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_12px_rgba(245,158,11,0.25)]">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px_rgba(255,255,255,0.5)]">
                              <span className="text-2xl font-bold text-amber-700">🎯</span>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-xl font-bold text-warm-gray-800 mb-2">📍 Localisation manuelle (optionnel)</h4>
                            <p className="text-warm-gray-600">Si la géolocalisation ne fonctionne pas</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-golden-brown-600 to-amber-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity"></div>
                            <div className="relative">
                              <label className="block text-sm font-bold text-golden-brown-700 mb-4">Latitude</label>
                              <div className="flex items-center">
                                <div className="w-16 h-16 rounded-l-2xl bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center border border-golden-brown-700/50 border-r-0 shadow-[inset_0_1px_3px_rgba(255,255,255,0.3)]">
                                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]">
                                    <span className="text-lg font-bold text-golden-brown-700">📍</span>
                                  </div>
                                </div>
                                <input
                                  type="number"
                                  step="0.000001"
                                  className="input-golden w-full p-6 text-lg placeholder-warm-gray-400 rounded-r-2xl border border-golden-brown-300/30 border-l-0 shadow-[inset_0_1px_2px_rgba(193,154,107,0.15)] bg-white/80"
                                  placeholder="Ex: -4.441931"
                                  value={manualLat}
                                  onChange={(e) => setManualLat(e.target.value)}
                                  disabled={loading}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-golden-brown-600 to-amber-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity"></div>
                            <div className="relative">
                              <label className="block text-sm font-bold text-golden-brown-700 mb-4">Longitude</label>
                              <div className="flex items-center">
                                <div className="w-16 h-16 rounded-l-2xl bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center border border-golden-brown-700/50 border-r-0 shadow-[inset_0_1px_3px_rgba(255,255,255,0.3)]">
                                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]">
                                    <span className="text-lg font-bold text-golden-brown-700">📍</span>
                                  </div>
                                </div>
                                <input
                                  type="number"
                                  step="0.000001"
                                  className="input-golden w-full p-6 text-lg placeholder-warm-gray-400 rounded-r-2xl border border-golden-brown-300/30 border-l-0 shadow-[inset_0_1px_2px_rgba(193,154,107,0.15)] bg-white/80"
                                  placeholder="Ex: 15.266293"
                                  value={manualLng}
                                  onChange={(e) => setManualLng(e.target.value)}
                                  disabled={loading}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-warm-gray-500 mt-6 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-golden-brown-600/20 to-amber-600/20 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]">
                            <span className="text-sm font-bold text-golden-brown-600">💡</span>
                          </div>
                          Les coordonnées GPS permettent une intervention plus rapide et précise
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bouton de soumission avec design spectaculaire */}
                  <div className="bg-gradient-to-br from-white to-warm-gray-50/30 rounded-3xl border border-warm-gray-400/30 shadow-[inset_0_1px_4px_rgba(120,113,108,0.1),0_8px_32px_rgba(0,0,0,0.1)] p-12 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-golden-brown-600/5 via-amber-600/5 to-red-600/5"></div>
                    <div className="relative z-10">

                      {/* CONTENEUR POUR LIMITER LA LARGEUR DU BOUTON */}
                      <div className="max-w-md mx-auto">
                        <button
                          onClick={handleSubmit}
                          disabled={loading}
                          className={`w-full py-6 rounded-2xl font-bold text-lg transition-all duration-500 flex items-center justify-center gap-4 relative overflow-hidden group border border-golden-brown-700/60 shadow-[inset_0_3px_8px_rgba(255,255,255,0.4),0_8px_32px_rgba(193,154,107,0.35)] ${
                            loading
                              ? 'bg-gradient-to-r from-warm-gray-500 to-warm-gray-600 text-white cursor-not-allowed border-warm-gray-500/40'
                              : 'bg-gradient-to-br from-golden-brown-600 to-amber-600 text-white hover:shadow-3xl hover:-translate-y-2'
                          }`}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-golden-brown-700 to-amber-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center relative z-10 border border-white/70 shadow-[inset_0_1px_3px_rgba(255,255,255,0.5)]">
                            <span className="text-3xl font-bold text-golden-brown-700">
                              {loading ? '' : '📤'}
                            </span>
                          </div>
                          {loading ? (
                            <>
                              <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin relative z-10"></div>
                              <span className="animate-pulse relative z-10 text-xl">TRANSMISSION...</span>
                            </>
                          ) : (
                            <>
                              <span className="relative z-10 text-xl">SOUMETTRE LE SIGNALEMENT</span>
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center relative z-10 border border-white/70">
                                <span className="text-xl font-bold text-amber-600 animate-pulse">
                                  ⚡
                                </span>
                              </div>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="text-center mt-10">
                        <div className="flex items-center justify-center gap-8 mb-6">
                          <span className="text-sm text-warm-gray-500 flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-golden-brown-600 to-golden-brown-700 border border-golden-brown-600 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]"></div>
                            Traitement garanti
                          </span>
                          <span className="text-sm text-warm-gray-500 flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-700 animate-pulse border border-emerald-600 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]"></div>
                            Suivi en temps réel
                          </span>
                        </div>
                        <p className="text-sm text-warm-gray-500">
                          Hôtel de Ville de Kinshasa • Service Municipal de la Propreté Urbaine
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // MES SIGNALEMENTS AVEC DESIGN ENRICHIT
                <div>
                  {/* Liste des signalements avec design moderne */}
                  <div className="bg-gradient-to-br from-white to-warm-gray-50/30 rounded-3xl overflow-hidden border border-golden-brown-400/30 shadow-[inset_0_1px_4px_rgba(193,154,107,0.15),0_6px_24px_rgba(0,0,0,0.08)]">
                    <div className="p-10 border-b border-warm-gray-300/30 bg-gradient-to-r from-golden-brown-600/10 to-transparent">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div>
                          <h3 className="text-2xl font-bold text-warm-gray-800 mb-3 flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center border border-golden-brown-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_12px_rgba(193,154,107,0.25)]">
                              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px_rgba(255,255,255,0.5)]">
                                <span className="text-2xl font-bold text-golden-brown-700">📋</span>
                              </div>
                            </div>
                            <div>
                              <span>Historique de vos signalements</span>
                              <p className="text-warm-gray-600 text-lg font-normal mt-2">Suivez l'évolution de vos contributions citoyennes</p>
                              {isAgent && currentMode === 'citizen' && (
                                <div className="mt-3 flex items-center gap-3">
                                  <div className="px-4 py-2 rounded-full bg-gradient-to-br from-white to-golden-brown-100 text-golden-brown-700 font-medium border border-golden-brown-400/40 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),0_2px_6px_rgba(193,154,107,0.15)] flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-golden-brown-100 to-golden-brown-200 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]">
                                      <span className="text-sm font-bold text-golden-brown-700">👷</span>
                                    </div>
                                    <span>Mode citoyen (Agent)</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </h3>
                        </div>
                        <button
                          onClick={() => fetchMyReports(token)}
                          className="px-8 py-4 rounded-2xl bg-gradient-to-br from-white to-warm-gray-100 text-warm-gray-700 font-bold hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex items-center gap-3 border border-golden-brown-400/30 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_3px_10px_rgba(0,0,0,0.06)]"
                        >
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-golden-brown-100 to-golden-brown-200 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]">
                            <span className="text-lg font-bold text-golden-brown-700">🔄</span>
                          </div>
                          <span>Actualiser la liste</span>
                        </button>
                      </div>
                    </div>

                    {reportsLoading ? (
                      <div className="p-16 text-center">
                        <div className="inline-block w-24 h-24 border border-warm-gray-400/30 border-t-golden-brown-600 rounded-full animate-spin"></div>
                        <p className="mt-6 text-warm-gray-600 text-lg">Chargement de vos signalements...</p>
                        <p className="text-sm text-warm-gray-500 mt-2">Récupération en cours</p>
                      </div>
                    ) : myReports.length === 0 ? (
                      <div className="p-16 text-center">
                        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center mx-auto mb-6 shadow-lg border border-golden-brown-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_6px_20px_rgba(193,154,107,0.25)]">
                          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px_rgba(255,255,255,0.5)]">
                            <span className="text-5xl font-bold text-golden-brown-700">📝</span>
                          </div>
                        </div>
                        <h3 className="text-2xl font-bold text-warm-gray-700 mb-3">Aucun signalement enregistré</h3>
                        <p className="text-warm-gray-600 text-lg mb-8 max-w-md mx-auto">
                          {isAgent && currentMode === 'citizen'
                            ? "Vous n'avez pas encore soumis de signalement en mode citoyen. Créez votre premier signalement !"
                            : "Vous n'avez pas encore soumis de signalement. Contribuez à rendre Kinshasa plus propre !"}
                        </p>
                        <button
                          onClick={() => setActiveTab('signalement')}
                          className="px-10 py-5 rounded-2xl bg-gradient-to-br from-golden-brown-600 to-amber-600 text-white font-bold hover:shadow-xl transition-all duration-300 hover:-translate-y-2 flex items-center gap-3 border border-golden-brown-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_12px_rgba(193,154,107,0.25)]"
                        >
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)]">
                            <span className="text-xl font-bold text-golden-brown-700">📍</span>
                          </div>
                          <span>Faire un signalement</span>
                        </button>
                      </div>
                    ) : (
                      <div className="divide-y divide-warm-gray-300/30">
                        {myReports.map((report) => (
                          <div key={report.id} className="p-10 hover:bg-gradient-to-r hover:from-golden-brown-50/30 hover:to-transparent transition-all duration-300">
                            <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-10">
                              <div className="flex-1">
                                <div className="flex items-center gap-4 mb-8">
                                  <span className={`px-5 py-2.5 rounded-xl text-sm font-bold ${getStatusColor(report.status)}`}>
                                    {getStatusText(report.status)}
                                  </span>
                                  <span className="text-sm text-warm-gray-500 px-4 py-2 rounded-xl bg-gradient-to-br from-white to-warm-gray-100 border border-warm-gray-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]">
                                    {formatDate(report.created_at)}
                                  </span>
                                </div>

                                <h4 className="text-2xl font-bold text-warm-gray-800 mb-4">Signalement #{report.id}</h4>

                                {report.description && (
                                  <p className="text-warm-gray-600 text-lg mb-6 leading-relaxed">{report.description}</p>
                                )}

                                {/* Affichage de la photo de confirmation du ramasseur */}
                                {report.status === 'AWAITING_CONFIRMATION' && report.cleanup_photo_url && (
                                  <div className="mb-8">
                                    <p className="text-xs font-bold text-warm-gray-600 uppercase tracking-wider mb-6">
                                      📸 Photo de confirmation du ramasseur
                                    </p>
                                    <div className="flex items-center gap-10">
                                      <div className="relative w-64 h-64 rounded-2xl overflow-hidden border border-purple-400/30 shadow-xl shadow-[0_8px_32px_rgba(168,85,247,0.1)]">
                                        <img
                                          src={`${API_BASE_URL}${report.cleanup_photo_url}`}
                                          alt="Photo de confirmation du ramassage"
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjE5MiIgaGVpZ2h0PSIxOTIiIGZpbGw9IiNFM0UzRTMiLz48cGF0aCBkPSJNMTIwIDg0QzEyMCA5Ny4yNTQ4IDEwOS4yNTUgMTA4IDk2IDEwOEM4Mi43NDUyIDEwOCA3MiA5Ny4yNTQ4IDcyIDg0QzcyIDcwLjc0NTIgODIuNzQ1MiA2MCA5NiA2MEMxMDkuMjU1IDYwIDEyMCA3MC43NDUyIDEyMCA4NFoiIGZpbGw9IiNCQ0JDQkMiLz48cGF0aCBkPSJNMTQ0IDE0MEg0OEMzOS4xNjM0IDE0MCAzMiAxMzIuODM3IDMyIDEyNFY5NkMzMiA4Ny4xNjM0IDM5LjE2MzQgODAgNDggODBIMTQ0QzE1Mi44MzcgODAgMTYwIDg3LjE2MzQgMTYwIDk2VjEyNEMxNjAgMTMyLjgzNyAxNTIuODM3IDE0MCAxNDQgMTQwWiIgZmlsbD0iI0JDQkNCQyIvPjwvc3ZnPg==';
                                          }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                                      </div>
                                      <div className="flex-1">
                                        <div className="bg-gradient-to-br from-white to-purple-100/30 rounded-2xl p-8 border border-purple-400/30 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_3px_10px_rgba(168,85,247,0.06)]">
                                          <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-4">⏳ En attente de votre confirmation</p>
                                          <div className="font-medium text-purple-800 space-y-3 bg-gradient-to-br from-white to-purple-50 p-6 rounded-xl border border-purple-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]">
                                            <p>Le ramasseur a soumis une preuve photographique du nettoyage.</p>
                                            <p className="text-sm text-purple-600">
                                              Photo soumise le {formatDate(report.cleanup_photo_submitted_at)}
                                            </p>
                                            {report.confirmation_deadline && (
                                              <p className="text-sm text-purple-500 mt-2">
                                                Confirmation automatique dans {Math.floor((new Date(report.confirmation_deadline) - new Date()) / (1000 * 60 * 60))}h
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                                  <div className="bg-gradient-to-br from-white to-golden-brown-100/30 rounded-2xl p-8 border border-golden-brown-400/30 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_3px_10px_rgba(0,0,0,0.06)]">
                                    <p className="text-xs font-bold text-golden-brown-600 uppercase tracking-wider mb-4">📍 Localisation</p>
                                    <p className="font-mono text-lg text-warm-gray-800 font-medium">
                                      {report.latitude?.toFixed(6) || 'N/A'}, {report.longitude?.toFixed(6) || 'N/A'}
                                    </p>
                                  </div>

                                  <div className="bg-gradient-to-br from-white to-warm-gray-100/30 rounded-2xl p-8 border border-warm-gray-400/30 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_3px_10px_rgba(0,0,0,0.06)]">
                                    <p className="text-xs font-bold text-warm-gray-600 uppercase tracking-wider mb-4">📊 Statut</p>
                                    <div className="flex items-center gap-4">
                                      <div className={`w-4 h-4 rounded-full border ${
                                        report.status === 'PENDING' ? 'border-amber-600 bg-amber-500 animate-pulse shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]' :
                                        report.status === 'IN_PROGRESS' ? 'border-golden-brown-600 bg-golden-brown-500 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]' :
                                        report.status === 'AWAITING_CONFIRMATION' ? 'border-purple-600 bg-purple-500 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]' :
                                        report.status === 'DISPUTED' ? 'border-red-600 bg-red-500 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]' :
                                        'border-emerald-600 bg-emerald-500 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]'
                                      }`}></div>
                                      <span className="font-bold text-warm-gray-700 text-xl">
                                        {report.status === 'PENDING' ? 'En attente de traitement' :
                                         report.status === 'IN_PROGRESS' ? 'En cours de traitement' :
                                         report.status === 'AWAITING_CONFIRMATION' ? 'En attente de votre confirmation' :
                                         report.status === 'DISPUTED' ? 'En litige - Collecte refusée' :
                                         'Traité et collecté'}
                                      </span>
                                    </div>
                                    {report.collector_full_name && (
                                      <p className="text-sm text-warm-gray-600 mt-4">
                                        Pris en charge par : <span className="font-semibold">{report.collector_full_name}</span>
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Photo du signalement */}
                                {report.image_url && (
                                  <div className="mt-8">
                                    <p className="text-xs font-bold text-warm-gray-600 uppercase tracking-wider mb-6">📸 Votre photo</p>
                                    <div className="flex items-center gap-10">
                                      <div className="relative w-64 h-64 rounded-2xl overflow-hidden border border-warm-gray-400/30 shadow-xl shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
                                        <img
                                          src={`${API_BASE_URL}${report.image_url}`}
                                          alt="Votre photo du signalement"
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjE5MiIgaGVpZ2h0PSIxOTIiIGZpbGw9IiNFM0UzRTMiLz48cGF0aCBkPSJNMTIwIDg0QzEyMCA5Ny4yNTQ4IDEwOS4yNTUgMTA4IDk2IDEwOEM4Mi43NDUyIDEwOCA3MiA5Ny4yNTQ4IDcyIDg0QzcyIDcwLjc0NTIgODIuNzQ1MiA2MCA5NiA2MEMxMDkuMjU1IDYwIDEyMCA3MC43NDUyIDEyMCA4NFoiIGZpbGw9IiNCQ0JDQkMiLz48cGF0aCBkPSJNMTQ0IDE0MEg0OEMzOS4xNjM0IDE0MCAzMiAxMzIuODM3IDMyIDEyNFY5NkMzMiA4Ny4xNjM0IDM5LjE2MzQgODAgNDggODBIMTQ0QzE1Mi44MzcgODAgMTYwIDg3LjE2MzQgMTYwIDk2VjEyNEMxNjAgMTMyLjgzcyAgMTUyLjgzNyAxNDAgMTQ0IDE0MFoiIGZpbGw9IiNCQ0JDQkMiLz48L3N2Zz4=';
                                          }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                                        <a
                                          href={`${API_BASE_URL}${report.image_url}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="absolute bottom-6 right-6 px-6 py-3 rounded-xl bg-gradient-to-br from-golden-brown-600 to-amber-600 text-white font-bold hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex items-center gap-2 border border-golden-brown-700/60 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_2px_8px_rgba(193,154,107,0.2)]"
                                        >
                                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)]">
                                            <span className="text-lg font-bold text-golden-brown-700">🔍</span>
                                          </div>
                                          <span>Agrandir</span>
                                        </a>
                                      </div>
                                      <div className="flex-1">
                                        <div className="bg-gradient-to-br from-white to-warm-gray-100/30 rounded-2xl p-8 border border-warm-gray-400/30 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_3px_10px_rgba(0,0,0,0.06)]">
                                          <p className="text-xs font-bold text-warm-gray-600 uppercase tracking-wider mb-4">🎯 Coordonnées GPS</p>
                                          <div className="font-mono text-lg text-warm-gray-800 space-y-3 bg-gradient-to-br from-white to-warm-gray-100 p-6 rounded-xl border border-warm-gray-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]">
                                            <p><span className="text-golden-brown-600">Latitude:</span> {report.latitude?.toFixed(6)}</p>
                                            <p><span className="text-golden-brown-600">Longitude:</span> {report.longitude?.toFixed(6)}</p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Actions avec design moderne */}
                              <div className="flex flex-col gap-5 min-w-[320px]">
                                {/* Bouton Supprimer */}
                                {report.status === 'PENDING' && (
                                  <button
                                    onClick={() => {
                                      setSelectedReport(report);
                                      setShowDeleteModal(true);
                                    }}
                                    disabled={loading}
                                    className="px-10 py-5 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 text-white font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 flex items-center justify-center gap-4 group border border-red-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_12px_rgba(239,68,68,0.25)]"
                                  >
                                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px_rgba(255,255,255,0.5)]">
                                      <span className="text-2xl font-bold text-red-700">🗑️</span>
                                    </div>
                                    <span>Supprimer</span>
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transform group-hover:translate-x-2 transition-all duration-300 border border-white/70">
                                      <span className="text-lg font-bold text-red-600">⚠️</span>
                                    </div>
                                  </button>
                                )}

                                {/* Bouton Confirmer collecte (nouvelle version avec photo) */}
                                {report.status === 'AWAITING_CONFIRMATION' && (
                                  <div className="space-y-4">
                                    <div className="p-6 bg-gradient-to-br from-purple-50/50 to-purple-100/30 rounded-2xl border border-purple-400/40 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_2px_8px_rgba(168,85,247,0.1)]">
                                      <p className="font-bold text-purple-700 text-lg mb-3">Confirmer la collecte</p>
                                      <p className="text-purple-600 text-sm mb-4">Le ramasseur a soumis une photo de preuve.</p>
                                      <div className="grid grid-cols-2 gap-4">
                                        <button
                                          onClick={() => handleConfirmCleanup(report.id, true)}
                                          disabled={loading}
                                          className="px-6 py-4 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white font-bold hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex items-center justify-center gap-3 border border-emerald-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_12px_rgba(16,185,129,0.25)]"
                                        >
                                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)]">
                                            <span className="text-lg font-bold text-emerald-700">✅</span>
                                          </div>
                                          <span>Confirmer</span>
                                        </button>

                                        <button
                                          onClick={() => {
                                            setReportToDispute(report.id);
                                            setShowDisputeModal(true);
                                          }}
                                          disabled={loading}
                                          className="px-6 py-4 rounded-xl bg-gradient-to-br from-red-600 to-red-700 text-white font-bold hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex items-center justify-center gap-3 border border-red-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_12px_rgba(239,68,68,0.25)]"
                                        >
                                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)]">
                                            <span className="text-lg font-bold text-red-700">❌</span>
                                          </div>
                                          <span>Refuser</span>
                                        </button>
                                      </div>
                                      {report.confirmation_deadline && (
                                        <p className="text-xs text-purple-500 mt-4 text-center">
                                          Confirmation automatique dans {Math.floor((new Date(report.confirmation_deadline) - new Date()) / (1000 * 60 * 60))}h
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Bouton Confirmer collecte (ancienne version sans photo) */}
                                {report.status === 'IN_PROGRESS' && (
                                  <button
                                    onClick={async () => {
                                      const canConfirm = await checkCanConfirm(report.id);
                                      if (canConfirm) {
                                        setSelectedReport(report);
                                        setShowConfirmModal(true);
                                      } else {
                                        setMessage({
                                          text: "Vous ne pouvez pas confirmer ce signalement. Vérifiez le statut.",
                                          type: "error"
                                        });
                                      }
                                    }}
                                    disabled={loading}
                                    className="px-10 py-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 flex items-center justify-center gap-4 group border border-emerald-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_12px_rgba(16,185,129,0.25)]"
                                  >
                                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center border border-white/80 shadow-[inset_0_1px_3px_rgba(255,255,255,0.5)]">
                                      <span className="text-2xl font-bold text-emerald-700">✅</span>
                                    </div>
                                    <span>Confirmer collecte</span>
                                  </button>
                                )}

                                {/* Bouton Voir sur carte */}
                                {report.latitude && report.longitude && (
                                  <a
                                    href={`https://maps.google.com/?q=${report.latitude},${report.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-10 py-5 rounded-2xl bg-gradient-to-br from-white to-warm-gray-100 text-warm-gray-700 font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex items-center justify-center gap-4 group border border-golden-brown-400/30 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_3px_10px_rgba(0,0,0,0.06)]"
                                  >
                                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-golden-brown-100 to-golden-brown-200 flex items-center justify-center border border-golden-brown-400/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]">
                                      <span className="text-2xl font-bold text-golden-brown-700">🗺️  </span>
                                    </div>
                                    <span>Voir sur carte</span>
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white to-warm-gray-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transform group-hover:translate-x-2 transition-all duration-300 border border-white/70">
                                      <span className="text-lg font-bold text-golden-brown-600 animate-pulse">📍</span>
                                    </div>
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
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default Dashboard;
