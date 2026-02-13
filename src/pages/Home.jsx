// pages/Home.jsx
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';

function Home() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentClimateSlide, setCurrentClimateSlide] = useState(0);
  const [currentMissionSlide, setCurrentMissionSlide] = useState(0);
  const [currentRewardSlide, setCurrentRewardSlide] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const partnersContainerRef = useRef(null);

  // Images du carrousel principal
  const slides = [
    {
      id: 1,
      image: "/data/images/ville-propre-1.png",
      title: "Kinshasa, ville propre",
      subtitle: "Notre vision pour une capitale durable"
    },
    {
      id: 2,
      image: "/data/images/ville-propre-2.png",
      title: "Avenues propres",
      subtitle: "Des rues dignes de notre capitale"
    },
    {
      id: 3,
      image: "/data/images/ville-propre-3.png",
      title: "Espaces verts préservés",
      subtitle: "La nature au cœur de la ville"
    },
    {
      id: 4,
      image: "/data/images/ville-propre-4.png",
      title: "Fleuve Congo majestueux",
      subtitle: "Notre patrimoine naturel protégé"
    }
  ];

  // Carrousel d'informations climatiques
  const climateSlides = [
    {
      id: 1,
      image: "/data/images/cop21-paris.png",
      title: "COP21 - Paris 2015",
      content: "La RDC s'engage à réduire ses émissions de 17% d'ici 2030",
      icon: "🌍",
      details: "Accord historique pour limiter le réchauffement climatique à 1.5°C"
    },
    {
      id: 2,
      image: "/data/images/cop27-egypte.png",
      title: "COP27 - Égypte 2022",
      content: "Compensation carbone et finance climat pour l'Afrique",
      icon: "💰",
      details: "Création d'un fonds pour les pertes et préjudices climatiques"
    },
    {
      id: 3,
      image: "/data/images/environnement-rdc.png",
      title: "Biodiversité RDC",
      content: "2ème poumon vert de la planète après l'Amazonie",
      icon: "🌳",
      details: "Forêts du Bassin du Congo : 300 millions d'hectares"
    },
    {
      id: 4,
      image: "/data/images/action-climatique.png",
      title: "Action Climatique Jeunesse",
      content: "Engagement des jeunes générations pour la planète",
      icon: "👨‍👩‍👧‍👦",
      details: "Éducation et mobilisation des citoyens de demain"
    },
    {
      id: 5,
      image: "/data/images/onu-climat.png",
      title: "Coopération ONU Climat",
      content: "Partenariat stratégique pour le développement durable",
      icon: "🤝",
      details: "Cadre de coopération RDC-ONU 2025-2029"
    },
    {
      id: 6,
      image: "/data/images/developpement-durable.png",
      title: "Objectifs ODD 2030",
      content: "Alignement sur les ODD 11, 12, 13 et 15",
      icon: "🎯",
      details: "Villes durables, consommation responsable, climat, biodiversité"
    }
  ];

  // Carrousel Notre Mission avec images ET textes descriptifs
  const missionSlides = [
    {
      id: 1,
      image: "/data/images/mission-economie-circulaire.png",
      title: "Économie Circulaire",
      description: "Transformation des déchets en ressources précieuses pour notre ville",
      detailedDescription: "Nous transformons les déchets en opportunités économiques grâce à des systèmes de recyclage innovants et des partenariats avec des entreprises locales.",
      icon: "♻️",
      color: "from-green-600 to-emerald-700"
    },
    {
      id: 2,
      image: "/data/images/mission-quartiers-durables.png",
      title: "Quartiers Durables",
      description: "Des espaces urbains propres, verts et exemplaires",
      detailedDescription: "Certification des quartiers modèles avec espaces verts, gestion optimisée des déchets et infrastructures de propreté durable.",
      icon: "🏘️",
      color: "from-blue-600 to-cyan-700"
    },
    {
      id: 3,
      image: "/data/images/mission-communautes-actives.png",
      title: "Communautés Actives",
      description: "Citoyens engagés qui façonnent l'avenir de leur quartier",
      detailedDescription: "Programmes de participation citoyenne, comités de quartier et initiatives communautaires pour une ville propre et inclusive.",
      icon: "👥",
      color: "from-purple-600 to-violet-700"
    },
    {
      id: 4,
      image: "/data/images/mission-data-driven.png",
      title: "Innovation Technologique",
      description: "Décisions intelligentes basées sur des données en temps réel",
      detailedDescription: "Plateforme digitale de suivi, analytics prédictifs et intelligence artificielle pour optimiser les interventions de propreté.",
      icon: "📊",
      color: "from-amber-600 to-orange-700"
    }
  ];

  // Carrousel Récompenses - TEXTE RÉDUIT POUR TENIR DANS LES CASES
  const rewardSlides = [
    {
      id: 1,
      title: "Points Éco-Citoyens",
      description: "Gagnez des points pour chaque action validée",
      points: "+50",
      icon: "⭐",
      color: "from-blue-500 to-cyan-600",
      features: ["Signalement validé", "Participation active", "Référencement"]
    },
    {
      id: 2,
      title: "Badges d'Excellence",
      description: "Collectez des badges pour vos contributions",
      points: "+100",
      icon: "🛡️",
      color: "from-emerald-500 to-green-600",
      features: ["Éco-Warrior", "Leader Communautaire", "Ambassadeur"]
    },
    {
      id: 3,
      title: "Classement Mensuel",
      description: "Montez dans le classement des plus actifs",
      points: "🏅 Top 100",
      icon: "🏆",
      color: "from-amber-500 to-orange-600",
      features: ["Tableau des leaders", "Reconnaissance", "Prix spéciaux"]
    },
    {
      id: 4,
      title: "Avantages Exclusifs",
      description: "Accédez à des récompenses uniques",
      points: "VIP",
      icon: "💎",
      color: "from-violet-500 to-purple-600",
      features: ["Invitations", "Formations", "Réductions"]
    }
  ];

  // Organisations partenaires avec défilement
  const partners = [
    { id: 1, name: "Banque Mondiale", logo: "/data/images/banque-mondiale.png", category: "Financier" },
    { id: 2, name: "UN-Habitat", logo: "/data/images/un-habitat.png", category: "ONU" },
    { id: 3, name: "Union Européenne", logo: "/data/images/union-europeenne.png", category: "Union" },
    { id: 4, name: "PNUD", logo: "/data/images/pnud.png", category: "ONU" },
    { id: 5, name: "AFD", logo: "/data/images/afd.png", category: "Coopération" },
    { id: 6, name: "JICA", logo: "/data/images/jica.png", category: "Coopération" },
    { id: 7, name: "GIZ", logo: "/data/images/giz.png", category: "Coopération" },
    { id: 8, name: "Union Africaine", logo: "/data/images/union-africaine.png", category: "Continental" },
    { id: 9, name: "Ministère Environnement RDC", logo: "/data/images/ministere-environnement.png", category: "National" },
    { id: 10, name: "Gouvernorat Kinshasa", logo: "/data/images/gouvernorat-kinshasa.png", category: "Local" }
  ];

  // Dupliquer les partenaires pour un défilement continu
  const scrollingPartners = [...partners, ...partners, ...partners];

  // Étapes améliorées pour "Comment ça marche"
  const steps = [
    {
      id: 1,
      number: "01",
      title: "Signaler",
      description: "Prenez une photo du problème de salubrité avec votre smartphone",
      icon: "📱",
      color: "from-blue-500 to-cyan-500",
      details: [
        "Application intuitive",
        "Photo géolocalisée automatiquement",
        "Catégorisation instantanée"
      ],
      animation: "animate-pulse"
    },
    {
      id: 2,
      number: "02",
      title: "Localiser",
      description: "Le système détecte automatiquement la position exacte",
      icon: "📍",
      color: "from-emerald-500 to-green-500",
      details: [
        "GPS précis à 5 mètres",
        "Carte interactive",
        "Identification du quartier"
      ],
      animation: "animate-bounce"
    },
    {
      id: 3,
      number: "03",
      title: "Traiter",
      description: "Notre équipe intervient rapidement pour résoudre le problème",
      icon: "⚡",
      color: "from-amber-500 to-orange-500",
      details: [
        "Délai moyen : 24h",
        "Équipes spécialisées",
        "Matériel adapté"
      ],
      animation: "animate-ping"
    },
    {
      id: 4,
      number: "04",
      title: "Confirmer",
      description: "Recevez une notification avec la photo après l'intervention",
      icon: "✅",
      color: "from-violet-500 to-purple-500",
      details: [
        "Photo de vérification",
        "Rapport détaillé",
        "Points de récompense"
      ],
      animation: "animate-spin-slow"
    }
  ];

  useEffect(() => {
    const token = localStorage.getItem('cm_token');
    setIsLoggedIn(!!token);
    
    // Simuler un temps de chargement
    const timer = setTimeout(() => setIsLoading(false), 800);
    
    // Carrousel principal automatique
    const carouselInterval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    
    // Carrousel climatique automatique
    const climateInterval = setInterval(() => {
      setCurrentClimateSlide((prev) => (prev + 1) % climateSlides.length);
    }, 6000);
    
    // Carrousel mission automatique
    const missionInterval = setInterval(() => {
      setCurrentMissionSlide((prev) => (prev + 1) % missionSlides.length);
    }, 4000);
    
    // Carrousel récompenses automatique
    const rewardInterval = setInterval(() => {
      setCurrentRewardSlide((prev) => (prev + 1) % rewardSlides.length);
    }, 3500);
    
    // Animation des étapes
    const stepInterval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 3000);
    
    return () => {
      clearTimeout(timer);
      clearInterval(carouselInterval);
      clearInterval(climateInterval);
      clearInterval(missionInterval);
      clearInterval(rewardInterval);
      clearInterval(stepInterval);
    };
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  const goToSlide = (index) => setCurrentSlide(index);
  
  const nextClimateSlide = () => setCurrentClimateSlide((prev) => (prev + 1) % climateSlides.length);
  const prevClimateSlide = () => setCurrentClimateSlide((prev) => (prev - 1 + climateSlides.length) % climateSlides.length);
  const goToClimateSlide = (index) => setCurrentClimateSlide(index);
  
  const nextMissionSlide = () => setCurrentMissionSlide((prev) => (prev + 1) % missionSlides.length);
  const prevMissionSlide = () => setCurrentMissionSlide((prev) => (prev - 1 + missionSlides.length) % missionSlides.length);
  const goToMissionSlide = (index) => setCurrentMissionSlide(index);
  
  const nextRewardSlide = () => setCurrentRewardSlide((prev) => (prev + 1) % rewardSlides.length);
  const prevRewardSlide = () => setCurrentRewardSlide((prev) => (prev - 1 + rewardSlides.length) % rewardSlides.length);
  const goToRewardSlide = (index) => setCurrentRewardSlide(index);

  const handleStartClick = () => {
    navigate('/dashboard');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-600 font-medium">Chargement de Clean Mboka...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section avec Carrousel */}
      <section className="relative h-screen">
        {/* Carrousel */}
        <div className="absolute inset-0">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                index === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent z-10"></div>
              <img
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-cover"
                loading="eager"
              />
            </div>
          ))}
        </div>

        {/* Navigation Carrousel */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30 flex gap-3">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-1.5 transition-all duration-300 rounded-full ${
                index === currentSlide ? 'w-8 bg-white' : 'w-3 bg-white/50 hover:bg-white/80'
              }`}
              aria-label={`Aller à la diapositive ${index + 1}`}
            />
          ))}
        </div>

        {/* Contenu Hero */}
        <div className="relative z-20 h-full flex items-center">
          <div className="container mx-auto px-6 lg:px-8">
            <div className="max-w-4xl">
              {/* Logo */}
              <div className="mb-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 p-3 flex items-center justify-center">
                    <img
                      src="/data/images/logo-hotel-ville-kinshasa.png"
                      alt="Hôtel de Ville de Kinshasa"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="text-white">
                    <div className="text-xs font-semibold tracking-wider text-white/80 mb-1">
                      INITIATIVE MUNICIPALE
                    </div>
                    <div className="text-sm text-white/60">Hôtel de Ville de Kinshasa</div>
                  </div>
                </div>
              </div>

              <h1 className="text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                <span className="block">Clean</span>
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-teal-300">
                  Mboka
                </span>
              </h1>

              <p className="text-xl lg:text-2xl text-white/90 mb-10 max-w-2xl leading-relaxed">
                Programme officiel de salubrité urbaine. 
                <span className="font-semibold"> Transformons Kinshasa </span>
                en ville durable d'Afrique centrale.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleStartClick}
                  className="group relative px-8 py-4 bg-white text-slate-900 font-semibold text-lg rounded-lg hover:bg-slate-50 transition-all duration-300 shadow-2xl hover:shadow-3xl transform hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-3">
                    <span>{isLoggedIn ? '📊 Tableau de Bord' : '🚀 Commencer'}</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </button>

                <button className="px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/20 text-white font-semibold text-lg rounded-lg hover:bg-white/20 transition-all duration-300">
                  En savoir plus
                </button>
              </div>

              {/* Stats en overlay */}
              <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { value: "85%", label: "Réduction déchets" },
                  { value: "1M+", label: "Citoyens 2026" },
                  { value: "24h", label: "Traitement moyen" },
                  { value: "15+", label: "Partenaires" }
                ].map((stat, index) => (
                  <div key={index} className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                    <div className="text-2xl font-bold text-white">{stat.value}</div>
                    <div className="text-sm text-white/70 mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 right-8 z-30">
          <div className="animate-bounce">
            <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
              <div className="w-1 h-3 bg-white/70 rounded-full mt-2 animate-pulse"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Section Partenaires avec défilement */}
      <section className="py-16 bg-slate-50 overflow-hidden">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-teal-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold mb-4">
              <span className="text-lg">🤝</span> PARTENARIATS STRATÉGIQUES
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-3">
              Un réseau international d'excellence
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Soutenu par des organisations mondiales leaders dans le développement durable
            </p>
          </div>

          {/* Zone de défilement des partenaires */}
          <div className="relative">
            {/* Gradient overlay left */}
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-slate-50 to-transparent z-10 pointer-events-none"></div>
            
            {/* Gradient overlay right */}
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-slate-50 to-transparent z-10 pointer-events-none"></div>

            {/* Container de défilement */}
            <div className="overflow-hidden">
              <div 
                className="flex gap-8 animate-scroll"
                style={{
                  animation: 'scroll 40s linear infinite',
                  width: 'max-content'
                }}
              >
                {scrollingPartners.map((partner, index) => (
                  <div
                    key={`${partner.id}-${index}`}
                    className="flex-shrink-0 w-48 h-32 bg-white rounded-xl p-5 flex flex-col items-center justify-center border border-slate-200 hover:border-blue-200 hover:shadow-lg transition-all duration-300 group"
                  >
                    <div className="relative w-full h-16 mb-3">
                      <img
                        src={partner.logo}
                        alt={partner.name}
                        className="w-full h-full object-contain grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-semibold text-blue-600 mb-1">{partner.category}</div>
                      <div className="text-sm font-medium text-slate-800 truncate max-w-[180px]">{partner.name}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Animation CSS pour le défilement */}
            <style jsx>{`
              @keyframes scroll {
                0% {
                  transform: translateX(0);
                }
                100% {
                  transform: translateX(calc(-48rem * 3));
                }
              }
              @keyframes spin-slow {
                from {
                  transform: rotate(0deg);
                }
                to {
                  transform: rotate(360deg);
                }
              }
              .animate-spin-slow {
                animation: spin-slow 3s linear infinite;
              }
            `}</style>
          </div>
        </div>
      </section>

      {/* Section Engagement Climatique */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-emerald-50/30">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              <span className="text-lg">🌱</span> ENGAGEMENT CLIMATIQUE
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
              Kinshasa au cœur de l'action climatique mondiale
            </h2>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto">
              Notre initiative s'inscrit dans les grands accords internationaux 
              pour une ville résiliente face aux changements climatiques
            </p>
          </div>

          {/* Carrousel Climatique */}
          <div className="relative h-[500px] rounded-2xl overflow-hidden shadow-2xl">
            {climateSlides.map((slide, index) => (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                  index === currentClimateSlide ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent z-10"></div>
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="w-full h-full object-cover"
                />
                
                {/* Contenu superposé */}
                <div className="absolute bottom-0 left-0 right-0 z-20 p-8 md:p-12 text-white">
                  <div className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="text-4xl">{slide.icon}</div>
                      <h3 className="text-3xl md:text-4xl font-bold">{slide.title}</h3>
                    </div>
                    <p className="text-xl md:text-2xl text-white/90 max-w-3xl mb-3">
                      {slide.content}
                    </p>
                    <p className="text-lg text-white/80 italic">
                      {slide.details}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Navigation */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30 flex gap-3">
              {climateSlides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToClimateSlide(index)}
                  className={`h-2 transition-all duration-300 rounded-full ${
                    index === currentClimateSlide ? 'w-8 bg-white' : 'w-3 bg-white/50 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>

            {/* Flèches de navigation */}
            <button
              onClick={prevClimateSlide}
              className="absolute left-6 top-1/2 transform -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              ←
            </button>
            <button
              onClick={nextClimateSlide}
              className="absolute right-6 top-1/2 transform -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              →
            </button>
          </div>
        </div>
      </section>

      {/* Section Notre Mission avec Carrousel d'images ET textes - CORRIGÉE */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-blue-50/30">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold mb-4">
              <span className="text-lg">🎯</span> NOTRE MISSION
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
              Les piliers de notre engagement pour Kinshasa
            </h2>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto">
              Une approche holistique qui combine innovation, communauté et durabilité 
              pour transformer notre capitale
            </p>
          </div>

          {/* Carrousel Notre Mission CORRIGÉ - Texte en italique au-dessus de l'image */}
          <div className="max-w-5xl mx-auto">
            <div className="relative h-[600px] rounded-2xl overflow-hidden shadow-2xl">
              {missionSlides.map((slide, index) => (
                <div
                  key={slide.id}
                  className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                    index === currentMissionSlide ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  {/* Texte descriptif en italique au-dessus de l'image - CORRECTION */}
                  <div className="absolute top-0 left-0 right-0 z-30">
                    <div className="bg-gradient-to-b from-black/70 via-black/50 to-transparent p-6 md:p-8">
                      <div className="max-w-5xl mx-auto">
                        <p className="text-lg md:text-xl italic text-white/90 text-center font-light leading-relaxed">
                          {slide.description}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Image de fond */}
                  <img
                    src={slide.image}
                    alt={slide.title}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Overlay gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${slide.color} opacity-60 z-10`}></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent z-20"></div>
                  
                  {/* Contenu principal */}
                  <div className="relative z-30 h-full flex flex-col justify-end p-8 md:p-12">
                    <div className="max-w-2xl">
                      {/* Icone et titre */}
                      <div className="flex items-center gap-4 mb-6">
                        <div className="text-5xl animate-pulse">{slide.icon}</div>
                        <div>
                          <h3 className="text-3xl md:text-4xl font-bold text-white mb-2">
                            {slide.title}
                          </h3>
                          <p className="text-lg text-white/90">
                            {slide.detailedDescription}
                          </p>
                        </div>
                      </div>
                      
                      {/* Description détaillée */}
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                        {/* Indicateurs de mission */}
                        <div className="grid grid-cols-2 gap-6 mb-6">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-white"></div>
                            <span className="text-white/80">Impact communautaire</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-white"></div>
                            <span className="text-white/80">Solution durable</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-white"></div>
                            <span className="text-white/80">Innovation technologique</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-white"></div>
                            <span className="text-white/80">Participation citoyenne</span>
                          </div>
                        </div>
                        
                        {/* Progression */}
                        <div className="mt-4">
                          <div className="flex justify-between text-sm text-white/70 mb-2">
                            <span>Niveau d'engagement</span>
                            <span>92%</span>
                          </div>
                          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-white/90 to-white/60 transition-all duration-1000"
                              style={{ width: '92%' }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Navigation */}
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-40 flex gap-3">
                {missionSlides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToMissionSlide(index)}
                    className={`h-2 transition-all duration-300 rounded-full ${
                      index === currentMissionSlide ? 'w-8 bg-white' : 'w-3 bg-white/50 hover:bg-white/80'
                    }`}
                  />
                ))}
              </div>

              {/* Flèches de navigation */}
              <button
                onClick={prevMissionSlide}
                className="absolute left-6 top-1/2 transform -translate-y-1/2 z-40 w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
              >
                ←
              </button>
              <button
                onClick={nextMissionSlide}
                className="absolute right-6 top-1/2 transform -translate-y-1/2 z-40 w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
              >
                →
              </button>
            </div>
          </div>

          {/* Bouton CTA */}
          <div className="text-center mt-12">
            <button
              onClick={handleStartClick}
              className="group px-10 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold text-lg rounded-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 inline-flex items-center gap-3"
            >
              <span>Rejoindre la mission</span>
              <span className="group-hover:translate-x-2 transition-transform">→</span>
            </button>
          </div>
        </div>
      </section>

      {/* Section Comment Ça Marche - AMÉLIORÉE */}
      <section className="py-20 bg-gradient-to-br from-slate-900 to-slate-800 overflow-hidden">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-white/10 text-white px-5 py-2.5 rounded-full text-sm font-semibold mb-4">
              <span className="text-lg">⚡</span> COMMENT ÇA MARCHE
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Un processus simple et efficace en 4 étapes
            </h2>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">
              Devenez acteur du changement en quelques minutes seulement
            </p>
          </div>

          {/* Timeline interactive */}
          <div className="relative">
            {/* Ligne de timeline */}
            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-white/20 transform -translate-y-1/2 hidden lg:block"></div>
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-4">
              {steps.map((step, index) => (
                <div 
                  key={step.id}
                  className="relative"
                  onMouseEnter={() => setActiveStep(index)}
                >
                  {/* Connecteur de timeline (mobile) */}
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/20 transform -translate-x-1/2 lg:hidden"></div>
                  
                  <div className={`relative bg-white/5 backdrop-blur-sm rounded-2xl p-8 border-2 transition-all duration-500 hover:scale-105 ${
                    activeStep === index 
                      ? 'border-white/40 shadow-2xl' 
                      : 'border-white/10 hover:border-white/30'
                  }`}>
                    {/* Numéro d'étape */}
                    <div className={`absolute -top-4 left-1/2 transform -translate-x-1/2 w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-all duration-300 ${
                      activeStep === index 
                        ? 'bg-gradient-to-br ' + step.color + ' scale-110' 
                        : 'bg-white/10'
                    }`}>
                      {step.number}
                    </div>
                    
                    {/* Icône animée */}
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center text-white mb-6 mx-auto ${step.animation}`}>
                      <span className="text-2xl">{step.icon}</span>
                    </div>
                    
                    {/* Contenu */}
                    <div className="text-center">
                      <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                      <p className="text-white/80 mb-6">{step.description}</p>
                      
                      {/* Détails */}
                      <div className="space-y-2">
                        {step.details.map((detail, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm text-white/60">
                            <div className="w-1.5 h-1.5 rounded-full bg-white/40"></div>
                            <span>{detail}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Indicateur de timeline */}
                  <div className={`absolute left-1/2 transform -translate-x-1/2 w-4 h-4 rounded-full border-2 transition-all duration-300 hidden lg:block ${
                    activeStep === index 
                      ? 'bg-white scale-125 border-white' 
                      : 'bg-slate-800 border-white/30'
                  }`}></div>
                </div>
              ))}
            </div>

            {/* Indicateur de progression */}
            <div className="flex justify-center gap-4 mt-12">
              {steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveStep(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    activeStep === index 
                      ? 'w-8 bg-white' 
                      : 'bg-white/30 hover:bg-white/50'
                  }`}
                  aria-label={`Aller à l'étape ${index + 1}`}
                />
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-16 text-center">
            <div className="inline-flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-8">
              <span className="text-2xl">⏱️</span>
              <div className="text-left">
                <div className="text-white font-semibold">Traitement en 24h maximum</div>
                <div className="text-white/60 text-sm">Garantie de rapidité d'intervention</div>
              </div>
            </div>
            
            <button
              onClick={handleStartClick}
              className="group px-10 py-4 bg-gradient-to-r from-blue-600 to-teal-600 text-white font-semibold text-lg rounded-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 inline-flex items-center gap-3"
            >
              <span className="text-xl">📱</span>
              <span>Télécharger l'application</span>
              <span className="group-hover:translate-x-2 transition-transform">→</span>
            </button>
          </div>
        </div>
      </section>

      {/* Section Récompenses - AMÉLIORÉE avec texte réduit */}
      <section className="py-20 bg-gradient-to-br from-amber-50 to-orange-50/30">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold mb-4">
              <span className="text-lg">🏆</span> SYSTÈME DE RÉCOMPENSES
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
              Votre engagement récompensé
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Programme de fidélité innovant pour récompenser vos actions écocitoyennes
            </p>
          </div>

          {/* Carrousel Récompenses - AMÉLIORÉ */}
          <div className="max-w-4xl mx-auto">
            <div className="relative h-[500px] rounded-2xl overflow-hidden shadow-2xl">
              {rewardSlides.map((slide, index) => (
                <div
                  key={slide.id}
                  className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                    index === currentRewardSlide ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  {/* Fond gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${slide.color} z-10`}></div>
                  
                  {/* Contenu */}
                  <div className="relative z-20 h-full flex flex-col items-center justify-center p-6 md:p-10">
                    <div className="text-center max-w-2xl w-full px-4">
                      {/* Points badge */}
                      <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-white/20 backdrop-blur-sm mb-6 border-4 border-white/30">
                        <div className="text-4xl">{slide.icon}</div>
                      </div>
                      
                      {/* Points */}
                      <div className="text-6xl font-bold text-white mb-2 leading-none">
                        {slide.points}
                      </div>
                      
                      {/* Titre et description */}
                      <div className="bg-white/20 backdrop-blur-sm rounded-xl p-5 mb-6">
                        <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 leading-tight">
                          {slide.title}
                        </h3>
                        <p className="text-lg text-white/90 leading-snug">
                          {slide.description}
                        </p>
                      </div>
                      
                      {/* Features - AMÉLIORÉ avec texte réduit */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {slide.features.map((feature, idx) => (
                          <div 
                            key={idx}
                            className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20 min-h-[70px] flex items-center justify-center"
                          >
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-white"></div>
                                <span className="text-white font-medium text-sm md:text-base">
                                  {feature}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Navigation */}
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30 flex gap-3">
                {rewardSlides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToRewardSlide(index)}
                    className={`h-2 transition-all duration-300 rounded-full ${
                      index === currentRewardSlide ? 'w-8 bg-white' : 'w-3 bg-white/50 hover:bg-white/80'
                    }`}
                  />
                ))}
              </div>

              {/* Flèches de navigation */}
              <button
                onClick={prevRewardSlide}
                className="absolute left-4 md:left-6 top-1/2 transform -translate-y-1/2 z-30 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
              >
                ←
              </button>
              <button
                onClick={nextRewardSlide}
                className="absolute right-4 md:right-6 top-1/2 transform -translate-y-1/2 z-30 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
              >
                →
              </button>
            </div>
          </div>

          {/* Bouton CTA */}
          <div className="text-center mt-12">
            <button className="group px-10 py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold text-lg rounded-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 inline-flex items-center gap-3">
              <span>Découvrir mon score</span>
              <span className="group-hover:translate-x-2 transition-transform">→</span>
            </button>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-teal-600 to-emerald-700"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0di00aC0ydjRoLTR2Mmg0djRoMnYtNGg0di0yaC00em0wLTMwVjBoLTJ2NGgtNHYyaDR2NGgydi00aDR2LTJoLTR6TTYgMzR2LTRINHY4SDB2Mmg0djRoMnYtNGg0di0ySDZ6TTYgNFYwSDR2NEgwdjJoNHY0aDJ2LTRoNHYtMkg2eiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
        
        <div className="relative container mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6">
            Prêt à transformer Kinshasa avec nous ?
          </h2>
          <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed">
            Rejoignez des milliers de citoyens engagés et participez à la construction 
            d'une capitale propre, durable et fière.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleStartClick}
              className="group relative px-10 py-5 bg-white text-slate-900 font-semibold text-lg rounded-lg hover:bg-slate-50 transition-all duration-300 shadow-2xl hover:shadow-3xl transform hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3">
                <span>{isLoggedIn ? '📊 Accéder au Dashboard' : '🚀 Commencer gratuitement'}</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </button>

            <button className="px-10 py-5 bg-white/10 backdrop-blur-sm border border-white/30 text-white font-semibold text-lg rounded-lg hover:bg-white/20 transition-all duration-300">
              <div className="flex items-center gap-3">
                <span className="text-xl">📱</span>
                <span>Télécharger l'app</span>
              </div>
            </button>
          </div>

          <p className="text-white/60 text-sm mt-8">
            Aucune carte bancaire requise • Programme officiel municipal
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-white/10 p-2">
                  <img
                    src="/data/images/logo-hotel-ville-kinshasa.png"
                    alt="Hôtel de Ville"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <div className="font-bold">Clean Mboka</div>
                  <div className="text-sm text-white/60">Hôtel de Ville</div>
                </div>
              </div>
              <p className="text-white/70 text-sm">
                Programme officiel municipal de salubrité urbaine de la Ville de Kinshasa.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Ressources</h4>
              <ul className="space-y-2 text-sm text-white/70">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Charte écocitoyenne</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Rapports annuels</a></li>
                <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Légal</h4>
              <ul className="space-y-2 text-sm text-white/70">
                <li><a href="#" className="hover:text-white transition-colors">Conditions d'utilisation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Politique de confidentialité</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Mentions légales</a></li>
                <li><a href="#" className="hover:text-white transition-colors">RGPD</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-white/70">
                <li className="flex items-center gap-2"><span className="text-lg">📞</span> +243 81 700 0000</li>
                <li className="flex items-center gap-2"><span className="text-lg">✉️</span> cleanmboka@kinshasa.cd</li>
                <li className="flex items-center gap-2"><span className="text-lg">📍</span> Avenue des Aviateurs, Gombe</li>
                <li className="flex items-center gap-2"><span className="text-lg">🏛️</span> Hôtel de Ville de Kinshasa</li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/20 text-center">
            <p className="text-white/50 text-sm">
              © {new Date().getFullYear()} Clean Mboka - Programme Municipal de Salubrité Urbaine. 
              Tous droits réservés.
            </p>
            <p className="text-white/40 text-xs mt-2">
              Aligné sur les Objectifs de Développement Durable (ODD) des Nations Unies
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;
