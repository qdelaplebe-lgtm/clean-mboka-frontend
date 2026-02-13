// pages/Register.jsx
import { useState } from 'react';
import { API_BASE_URL } from "../api";
import { Link, useNavigate } from 'react-router-dom';

function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // États pour le formulaire d'inscription
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    email: '',
    province: 'Kinshasa',
    commune: '',
    quartier: '',
    avenue: '',
    role: 'citoyen',
    passwordVisible: false,
    confirmPasswordVisible: false
  });

  // Fonction pour normaliser les noms de villes/communes
  const normalizeCityName = (name) => {
    if (!name) return '';
    
    // Liste des exceptions (noms avec traits d'union, apostrophes, etc.)
    const exceptions = {
      'mont-ngafula': 'Mont-Ngafula',
      'kasa-vubu': 'Kasa-Vubu',
      'ngiri-ngiri': 'Ngiri-Ngiri',
      'bandalungwa': 'Bandalungwa',
      'selembao': 'Selembao',
      'kimbanseke': 'Kimbanseke',
      'ndjili': 'Ndjili',
      'ngaba': 'Ngaba',
      'nsele': 'Nsele',
      'maluku': 'Maluku',
      'masina': 'Masina',
      'matete': 'Matete',
      'kisenso': 'Kisenso',
      'kintambo': 'Kintambo',
      'kalamu': 'Kalamu',
      'limete': 'Limete',
      'lingwala': 'Lingwala',
      'barumbu': 'Barumbu',
      'bumbu': 'Bumbu',
      'gombe': 'Gombe',
      'lemba': 'Lemba',
      'kinshasa': 'Kinshasa'
    };
    
    const lowerName = name.toLowerCase().trim();
    
    // Retourner l'exception si elle existe
    if (exceptions[lowerName]) {
      return exceptions[lowerName];
    }
    
    // Sinon, première lettre majuscule pour chaque mot
    return name.toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Liste des communes de Kinshasa (normalisées - première lettre majuscule)
  const communes = [
    'Bandalungwa', 'Barumbu', 'Bumbu', 'Gombe', 'Kalamu',
    'Kasa-Vubu', 'Kimbanseke', 'Kinshasa', 'Kintambo', 'Kisenso',
    'Lemba', 'Limete', 'Lingwala', 'Maluku', 'Masina',
    'Matete', 'Mont-Ngafula', 'Ndjili', 'Ngaba', 'Ngiri-Ngiri',
    'Nsele', 'Selembao'
  ];

  // Liste des quartiers par commune (normalisés)
  const quartiersByCommune = {
    'Gombe': ['Centre Ville', 'Gare Centrale', 'La Gombe'],
    'Lemba': ['Binza', 'Campus', 'Lemba'],
    'Kinshasa': ['Mbinza', 'Ngaliema'],
    'Limete': ['Industriel', 'Kauka', 'Limete'],
    'Ngaba': ['Biyela', 'Kauka', 'Ngaba'],
    'Mont-Ngafula': ['Kingabwa', 'Ngafula'],
    'Kimbanseke': ['Kimbanseke Centre', 'Salongo'],
    'Masina': ['Masina 1', 'Masina 2', 'Masina 3'],
    'Matete': ['Matete Centre', 'Mabulu'],
    'Bandalungwa': ['Bandalungwa Centre', 'Lubudi'],
    'Barumbu': ['Barumbu Centre', 'Lukunga'],
    'Bumbu': ['Bumbu Centre', 'Mokali'],
    'Kalamu': ['Kalamu Centre', 'Yolo'],
    'Kasa-Vubu': ['Kasa-Vubu Centre', 'Lemba'],
    'Kintambo': ['Kintambo Centre', 'Lingwala'],
    'Kisenso': ['Kisenso Centre', 'Mikondo'],
    'Lingwala': ['Lingwala Centre', 'Gombé'],
    'Maluku': ['Maluku Centre', 'Nsele'],
    'Ngiri-Ngiri': ['Ngiri-Ngiri Centre', 'Binza'],
    'Nsele': ['Nsele Centre', 'Masa'],
    'Selembao': ['Selembao Centre', 'Makala']
  };

  // Fonction de soumission d'inscription
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    // Validation des mots de passe
    if (formData.password !== formData.confirmPassword) {
      setMessage({ text: 'Les mots de passe ne correspondent pas', type: 'error' });
      setLoading(false);
      return;
    }

    // Validation de la longueur du mot de passe
    if (formData.password.length < 6) {
      setMessage({ text: 'Le mot de passe doit contenir au moins 6 caractères', type: 'error' });
      setLoading(false);
      return;
    }

    // Validation du téléphone (format +243)
    const phoneRegex = /^\+243[0-9]{9}$/;
    if (!phoneRegex.test(formData.phone)) {
      setMessage({ 
        text: 'Format de téléphone invalide. Exemple: +243810000000', 
        type: 'error' 
      });
      setLoading(false);
      return;
    }

    try {
      // Normaliser les données avant envoi
      const normalizedCommune = normalizeCityName(formData.commune);
      const normalizedQuartier = formData.quartier ? 
        formData.quartier.charAt(0).toUpperCase() + formData.quartier.slice(1).toLowerCase() : 
        null;
      const normalizedAvenue = formData.avenue ? 
        formData.avenue.charAt(0).toUpperCase() + formData.avenue.slice(1).toLowerCase() : 
        null;

      // Appel API d'inscription
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formData.phone,
          password: formData.password,
          full_name: formData.full_name,
          email: formData.email || null,
          province: formData.province,
          commune: normalizedCommune, // Commune normalisée
          quartier: normalizedQuartier, // Quartier normalisé
          avenue: normalizedAvenue, // Avenue normalisée
          role: formData.role
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Succès de l'inscription
        setMessage({ 
          text: '🎉 Compte créé avec succès ! Redirection vers la connexion...', 
          type: 'success' 
        });

        // Redirection vers la page de connexion
        setTimeout(() => {
          navigate('/');
        }, 2000);

      } else {
        // Erreur d'inscription
        const errorMessage = data.detail || data.message || 'Erreur lors de l\'inscription';
        setMessage({ text: errorMessage, type: 'error' });
      }
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      setMessage({ 
        text: 'Erreur de connexion au serveur. Veuillez réessayer.', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour basculer la visibilité du mot de passe
  const togglePasswordVisibility = (field) => {
    setFormData({
      ...formData,
      [field]: !formData[field]
    });
  };

  // Fonction pour gérer le changement de commune
  const handleCommuneChange = (commune) => {
    const normalizedCommune = normalizeCityName(commune);
    setFormData({
      ...formData,
      commune: normalizedCommune,
      quartier: quartiersByCommune[normalizedCommune] ? '' : '' // Réinitialiser le quartier
    });
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-golden-brown-50 via-golden-brown-100/30 to-golden-brown-200/20 flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Arrière-plan décoratif */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-1/3 h-1/3 bg-gradient-to-br from-golden-brown-200/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-1/3 h-1/3 bg-gradient-to-br from-amber-200/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1/2 h-1/2 bg-gradient-to-br from-amber-100/10 to-transparent rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-4xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-10 z-20">
        {/* Section gauche - Informations */}
        <div className="flex-1 max-w-lg">
          <div className="card-golden rounded-3xl p-8 lg:p-10 relative overflow-hidden">
            {/* Effet de profondeur */}
            <div className="absolute inset-0 bg-gradient-to-br from-golden-brown-600/5 via-transparent to-amber-600/5"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-golden-brown-600/10 to-transparent rounded-full -translate-y-16 translate-x-16"></div>

            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-golden-brown-600 to-amber-600 flex items-center justify-center shadow-lg">
                  <span className="text-3xl text-white">🚀</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-warm-gray-800">Rejoignez Clean Mboka</h2>
                  <p className="text-warm-gray-600">Contribuez à rendre Kinshasa plus propre</p>
                </div>
              </div>

              <div className="space-y-6 mb-10">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-golden-brown-100 to-golden-brown-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl text-golden-brown-600">🏆</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-warm-gray-800 mb-2">Gagnez des points</h3>
                    <p className="text-warm-gray-600">Chaque signalement vous rapporte des points et vous fait monter en niveau.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl text-emerald-600">📱</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-warm-gray-800 mb-2">Suivi en temps réel</h3>
                    <p className="text-warm-gray-600">Suivez l'évolution de vos signalements et des interventions municipales.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl text-amber-600">🤝</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-warm-gray-800 mb-2">Communauté active</h3>
                    <p className="text-warm-gray-600">Rejoignez des milliers de citoyens engagés pour la propreté de Kinshasa.</p>
                  </div>
                </div>
              </div>

              {/* Statistiques */}
              <div className="bg-gradient-to-br from-golden-brown-50 to-golden-brown-100/30 rounded-2xl p-6 border border-golden-brown-200">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-golden-brown-700">5,000+</p>
                    <p className="text-sm text-golden-brown-600 font-medium">Citoyens inscrits</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-emerald-600">15,000+</p>
                    <p className="text-sm text-emerald-600 font-medium">Signalements traités</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section droite - Formulaire d'inscription */}
        <div className="flex-1 max-w-md w-full">
          <div className="bg-gradient-to-br from-white to-warm-gray-50/30 border-2 border-warm-gray-200/50 rounded-3xl p-8 lg:p-10 shadow-2xl relative overflow-hidden">
            {/* Effet de profondeur */}
            <div className="absolute inset-0 bg-gradient-to-br from-warm-gray-600/5 via-transparent to-golden-brown-600/5"></div>
            <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-warm-gray-600/10 to-transparent rounded-full -translate-y-16 -translate-x-16"></div>

            <div className="relative z-10">
              <h2 className="text-2xl font-bold text-warm-gray-800 mb-2 text-center">Créer un compte</h2>
              <p className="text-warm-gray-600 text-center mb-8">Rejoignez la communauté Clean Mboka</p>

              {/* Message d'information/erreur */}
              {message.text && (
                <div className={`mb-6 p-4 rounded-xl text-center font-semibold ${
                  message.type === "success"
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                    : "bg-red-100 text-red-700 border border-red-300"
                }`}>
                  {message.text}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Nom complet */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-golden-brown-600 to-amber-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity"></div>
                  <div className="relative">
                    <label className="block text-sm font-bold text-warm-gray-700 mb-2">
                      Nom complet *
                    </label>
                    <input
                      type="text"
                      className="input-golden w-full p-4"
                      placeholder="Ex: Jean Mutombo"
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Téléphone */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-golden-brown-600 to-amber-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity"></div>
                  <div className="relative">
                    <label className="block text-sm font-bold text-warm-gray-700 mb-2">
                      Numéro de téléphone *
                    </label>
                    <input
                      type="tel"
                      className="input-golden w-full p-4"
                      placeholder="+243 81 234 5678"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      required
                      disabled={loading}
                    />
                    <p className="text-xs text-warm-gray-500 mt-2">
                      Format international requis: +243XXXXXXXXX
                    </p>
                  </div>
                </div>

                {/* Email (optionnel) */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-golden-brown-600 to-amber-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity"></div>
                  <div className="relative">
                    <label className="block text-sm font-bold text-warm-gray-700 mb-2">
                      Email (optionnel)
                    </label>
                    <input
                      type="email"
                      className="input-golden w-full p-4"
                      placeholder="exemple@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Mot de passe */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-golden-brown-600 to-amber-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity"></div>
                  <div className="relative">
                    <label className="block text-sm font-bold text-warm-gray-700 mb-2">
                      Mot de passe *
                    </label>
                    <div className="relative">
                      <input
                        type={formData.passwordVisible ? "text" : "password"}
                        className="input-golden w-full p-4 pr-12"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        required
                        disabled={loading}
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('passwordVisible')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-warm-gray-500 hover:text-warm-gray-700"
                      >
                        {formData.passwordVisible ? '🙈' : '👁️'}
                      </button>
                    </div>
                    <p className="text-xs text-warm-gray-500 mt-2">
                      Minimum 6 caractères
                    </p>
                  </div>
                </div>

                {/* Confirmation du mot de passe */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-golden-brown-600 to-amber-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity"></div>
                  <div className="relative">
                    <label className="block text-sm font-bold text-warm-gray-700 mb-2">
                      Confirmer le mot de passe *
                    </label>
                    <div className="relative">
                      <input
                        type={formData.confirmPasswordVisible ? "text" : "password"}
                        className="input-golden w-full p-4 pr-12"
                        placeholder="••••••••"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                        required
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('confirmPasswordVisible')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-warm-gray-500 hover:text-warm-gray-700"
                      >
                        {formData.confirmPasswordVisible ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Province (fixe pour Kinshasa) */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-golden-brown-600 to-amber-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity"></div>
                  <div className="relative">
                    <label className="block text-sm font-bold text-warm-gray-700 mb-2">
                      Province
                    </label>
                    <input
                      type="text"
                      className="input-golden w-full p-4 bg-warm-gray-100"
                      value="Kinshasa"
                      readOnly
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Commune */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-golden-brown-600 to-amber-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity"></div>
                  <div className="relative">
                    <label className="block text-sm font-bold text-warm-gray-700 mb-2">
                      Commune *
                    </label>
                    <select
                      className="input-golden w-full p-4"
                      value={formData.commune}
                      onChange={(e) => handleCommuneChange(e.target.value)}
                      required
                      disabled={loading}
                    >
                      <option value="">Sélectionnez votre commune</option>
                      {communes.map(commune => (
                        <option key={commune} value={commune}>
                          {commune}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Quartier (dynamique selon la commune) */}
                {formData.commune && quartiersByCommune[formData.commune] && (
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-golden-brown-600 to-amber-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity"></div>
                    <div className="relative">
                      <label className="block text-sm font-bold text-warm-gray-700 mb-2">
                        Quartier (optionnel)
                      </label>
                      <select
                        className="input-golden w-full p-4"
                        value={formData.quartier}
                        onChange={(e) => setFormData({...formData, quartier: e.target.value})}
                        disabled={loading}
                      >
                        <option value="">Sélectionnez votre quartier</option>
                        {quartiersByCommune[formData.commune].map(quartier => (
                          <option key={quartier} value={quartier}>
                            {quartier}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Avenue (libre) */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-golden-brown-600 to-amber-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity"></div>
                  <div className="relative">
                    <label className="block text-sm font-bold text-warm-gray-700 mb-2">
                      Avenue/Rue (optionnel)
                    </label>
                    <input
                      type="text"
                      className="input-golden w-full p-4"
                      placeholder="Ex: Avenue de la Libération"
                      value={formData.avenue}
                      onChange={(e) => setFormData({...formData, avenue: e.target.value})}
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Bouton d'inscription */}
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-500 flex items-center justify-center gap-3 relative overflow-hidden group ${
                    loading
                      ? 'bg-gradient-to-r from-warm-gray-500 to-warm-gray-600 text-white cursor-not-allowed'
                      : 'btn-golden-primary hover:shadow-[0_20px_60px_-15px_rgba(193,154,107,0.5)] hover:-translate-y-1'
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-golden-brown-700 to-amber-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  {loading ? (
                    <>
                      <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span className="animate-pulse">INSCRIPTION...</span>
                    </>
                  ) : (
                    <>
                      <span className="relative z-10 text-xl">📝</span>
                      <span className="relative z-10">CRÉER MON COMPTE</span>
                      <span className="relative z-10 text-amber-300 text-xl animate-pulse">✨</span>
                    </>
                  )}
                </button>
              </form>

              {/* Lien vers la connexion */}
              <div className="mt-8 pt-8 border-t border-warm-gray-200">
                <p className="text-center text-warm-gray-600">
                  Déjà un compte ?{' '}
                  <Link 
                    to="/" 
                    className="text-golden-brown-600 font-semibold hover:text-golden-brown-700 hover:underline transition-colors"
                  >
                    Se connecter
                  </Link>
                </p>
              </div>

              {/* Informations légales */}
              <div className="mt-6 p-4 bg-gradient-to-r from-golden-brown-50 to-golden-brown-100/30 rounded-xl border border-golden-brown-200">
                <p className="text-xs text-warm-gray-600 text-center">
                  En créant un compte, vous acceptez nos{' '}
                  <a href="#" className="text-golden-brown-600 hover:underline">Conditions d'utilisation</a>{' '}
                  et notre{' '}
                  <a href="#" className="text-golden-brown-600 hover:underline">Politique de confidentialité</a>
                </p>
                <p className="text-xs text-warm-gray-500 text-center mt-2">
                  Service Municipal de Propreté Urbaine - Hôtel de Ville de Kinshasa
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
