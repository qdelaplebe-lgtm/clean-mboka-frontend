// components/BottomNav.jsx
import { useLocation, useNavigate } from 'react-router-dom';

function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  // Vérification simple de l'authentification
  const isLoggedIn = !!localStorage.getItem('cm_token');

  const handleNavigation = (path) => {
    navigate(path);
  };

  const navItems = [
    {
      path: '/',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      label: 'Accueil',
      activeIcon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      color: 'from-blue-500 to-cyan-400',
      bgColor: 'bg-gradient-to-br from-blue-500/20 to-cyan-400/20'
    },
    {
      path: '/dashboard',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      label: 'Dashboard',
      activeIcon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'from-emerald-500 to-green-400',
      bgColor: 'bg-gradient-to-br from-emerald-500/20 to-green-400/20'
    },
    {
      path: '/profile',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      label: 'Profil',
      activeIcon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C9.243 2 7 4.243 7 7s2.243 5 5 5 5-2.243 5-5-2.243-5-5-5zm0 2c1.654 0 3 1.346 3 3s-1.346 3-3 3-3-1.346-3-3 1.346-3 3-3zm0 8c-3.859 0-7 3.141-7 7h14c0-3.859-3.141-7-7-7z" />
        </svg>
      ),
      color: 'from-violet-500 to-purple-400',
      bgColor: 'bg-gradient-to-br from-violet-500/20 to-purple-400/20'
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      {/* Fond avec effet verre coloré */}
      <div className="absolute inset-0 bg-gradient-to-t from-blue-50/90 via-white/80 to-white/90 backdrop-blur-2xl backdrop-saturate-200 border-t border-white/60 shadow-2xl shadow-blue-500/10"></div>
      
      {/* Effet de dégradé coloré en bas */}
      <div className="absolute inset-0 bg-gradient-to-t from-blue-500/5 via-teal-500/5 to-transparent"></div>
      
      {/* Effet de particules colorées subtiles */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute bottom-0 left-1/4 w-32 h-32 bg-blue-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-1/2 w-32 h-32 bg-teal-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-purple-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative flex justify-around items-center h-22 max-w-2xl mx-auto px-6">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const isRestricted = (item.path === '/dashboard' || item.path === '/profile') && !isLoggedIn;

          return (
            <button
              key={item.path}
              onClick={() => !isRestricted && handleNavigation(item.path)}
              className={`group relative flex flex-col items-center justify-center flex-1 h-full transition-all duration-500 ${
                isRestricted ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
              }`}
              disabled={isRestricted}
            >
              {/* Fond animé pour l'item actif - plus coloré */}
              {isActive && (
                <div className="absolute inset-0 flex justify-center overflow-hidden">
                  {/* Effet de halo */}
                  <div className={`absolute top-1/2 -translate-y-1/2 w-20 h-20 bg-gradient-to-br ${item.color} opacity-20 rounded-full blur-xl animate-pulse-slow`}></div>
                  
                  {/* Barre active colorée */}
                  <div className={`absolute -top-5 w-16 h-3 bg-gradient-to-r ${item.color} rounded-b-full shadow-lg shadow-blue-500/30`}></div>
                  
                  {/* Particules animées */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2">
                    <div className="flex space-x-1">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className={`w-1 h-1 bg-gradient-to-br ${item.color} rounded-full animate-bounce`}
                          style={{ animationDelay: `${i * 0.1}s` }}
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Conteneur principal avec effet 3D */}
              <div className={`relative flex flex-col items-center justify-center gap-1 transition-all duration-500 ${
                isActive
                  ? 'scale-110 -translate-y-3'
                  : 'group-hover:-translate-y-2'
              }`}>
                {/* Badge de notification pour les pages restreintes */}
                {isRestricted && (
                  <div className="absolute -top-2 -right-2 z-10">
                    <div className="relative">
                      <div className="absolute animate-ping w-4 h-4 bg-gradient-to-r from-red-500 to-pink-500 rounded-full"></div>
                      <div className="relative w-3 h-3 bg-gradient-to-r from-red-500 to-pink-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                        <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cercle de fond pour l'icône */}
                <div className={`relative mb-1 transition-all duration-500 ${
                  isActive
                    ? 'scale-125'
                    : 'group-hover:scale-110'
                }`}>
                  {/* Cercle de fond avec dégradé */}
                  <div className={`absolute inset-0 rounded-full transition-all duration-500 ${
                    isActive
                      ? `${item.bgColor} shadow-lg ${item.color.replace('from-', 'shadow-').replace('to-', '/30')}`
                      : 'bg-gray-100/50 group-hover:bg-gray-200/50'
                  }`}></div>
                  
                  {/* Bordure animée */}
                  <div className={`absolute inset-0 rounded-full border-2 transition-all duration-500 ${
                    isActive
                      ? `border-transparent bg-gradient-to-br ${item.color} p-0.5`
                      : 'border-gray-300/50 group-hover:border-gray-400/50'
                  }`}>
                    <div className={`absolute inset-0 rounded-full transition-all duration-500 ${
                      isActive
                        ? 'bg-white'
                        : 'bg-white/90 group-hover:bg-white'
                    }`}></div>
                  </div>

                  {/* Icone */}
                  <div className={`relative w-10 h-10 flex items-center justify-center transition-all duration-500 ${
                    isActive
                      ? `text-transparent bg-gradient-to-br ${item.color} bg-clip-text`
                      : 'text-gray-600 group-hover:text-gray-800'
                  }`}>
                    <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-10 rounded-full blur transition-all duration-500 ${
                      isActive ? 'scale-100' : 'scale-0 group-hover:scale-100'
                    }`}></div>
                    <div className="relative">
                      {isActive ? item.activeIcon : item.icon}
                    </div>
                  </div>
                </div>

                {/* Label avec effet de profondeur */}
                <span className={`relative text-xs font-bold transition-all duration-500 ${
                  isActive
                    ? `text-transparent bg-gradient-to-br ${item.color} bg-clip-text drop-shadow-sm`
                    : 'text-gray-600 group-hover:text-gray-800'
                }`}>
                  {item.label}
                  {/* Effet de soulignement animé */}
                  <span className={`absolute -bottom-1 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all duration-500 ${
                    isActive
                      ? `w-6 bg-gradient-to-r ${item.color}`
                      : 'w-0 bg-gray-400 group-hover:w-4'
                  }`}></span>
                </span>

                {/* Points décoratifs */}
                <div className="flex space-x-1 mt-1">
                  {[0, 1].map((i) => (
                    <div
                      key={i}
                      className={`w-1 h-1 rounded-full transition-all duration-500 ${
                        isActive
                          ? `bg-gradient-to-br ${item.color}`
                          : 'bg-gray-300 group-hover:bg-gray-400'
                      }`}
                    ></div>
                  ))}
                </div>
              </div>

              {/* Effet de hover - onde circulaire colorée */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`w-20 h-20 ${item.bgColor} rounded-full animate-ping-slow`}></div>
                </div>
              </div>

              {/* Effet de particules au hover */}
              <div className="absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className={`absolute w-1 h-1 ${item.bgColor.replace('bg-gradient-to-br', 'bg').replace('/20', '')} rounded-full animate-float`}
                    style={{
                      left: `${20 + i * 20}%`,
                      bottom: '10%',
                      animationDelay: `${i * 0.2}s`,
                      animationDuration: '2s'
                    }}
                  ></div>
                ))}
              </div>

              {/* Tooltip stylisé pour les pages restreintes */}
              {isRestricted && (
                <div className="absolute bottom-full mb-3 px-3 py-2 bg-gradient-to-r from-gray-900 to-gray-800 text-white text-xs font-semibold rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none shadow-2xl shadow-black/30 transform -translate-y-1 group-hover:translate-y-0">
                  <div className="flex items-center gap-2">
                    <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Connectez-vous pour accéder
                  </div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                </div>
              )}
            </button>
          );
        })}

        {/* Ligne décorative en bas avec dégradé */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-400/30 to-transparent"></div>
        
        {/* Effet de lumière en bas */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-t from-white/50 to-transparent blur-sm"></div>
      </div>

      {/* Styles d'animation CSS */}
      <style jsx>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.4; }
        }
        @keyframes ping-slow {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(1.2); opacity: 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-10px) scale(1.2); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
        .animate-ping-slow {
          animation: ping-slow 2s ease-out infinite;
        }
        .animate-float {
          animation: float 2s ease-in-out infinite;
        }
      `}</style>
    </nav>
  );
}

export default BottomNav;
