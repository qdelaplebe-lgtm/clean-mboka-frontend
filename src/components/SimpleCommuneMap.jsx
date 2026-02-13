import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getCommuneInfo } from '../constants/communes';

// Corriger les icônes Leaflet avec React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: '/leaflet/images/marker-icon-2x.png',
    iconUrl: '/leaflet/images/marker-icon.png',
    shadowUrl: '/leaflet/images/marker-shadow.png',
});

// Créer des icônes personnalisées pour les différents statuts
const createCustomIcon = (color) => {
    return L.divIcon({
        html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
        iconSize: [24, 24],
        className: 'custom-marker'
    });
};

// Fonction utilitaire pour normaliser les noms de communes
const normalizeCommuneName = (communeName) => {
    if (!communeName) return '';
    
    return communeName
        .toString()
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Enlever accents
        .replace(/\s+/g, ' ') // Remplacer multiples espaces
        .trim();
};

const SimpleCommuneMap = ({
    communeName = null,
    userRole,
    onQuartierClick,
    reports = [],
    token,
    API_BASE_URL = 'http://localhost:8000',
    onTakeMission,
    onCompleteMission,
    loading = false,
    isAgent = true,
    userCommune = null
}) => {
    // DÉTERMINER LA COMMUNE À AFFICHER
    const effectiveCommuneName = useMemo(() => {
        if (communeName) return communeName;
        if (userCommune) return userCommune;
        return 'Lemba'; // Fallback seulement si aucune commune n'est fournie
    }, [communeName, userCommune]);

    const [mapData, setMapData] = useState(null);
    const [loadingMap, setLoadingMap] = useState(true);
    const [error, setError] = useState(null);
    const [debugInfo, setDebugInfo] = useState('');
    const [selectedReport, setSelectedReport] = useState(null);
    
    // État pour gérer l'affichage des signalements traités
    const [showCompletedReports, setShowCompletedReports] = useState(false);
    const [filteredReports, setFilteredReports] = useState([]);
    const [communesInData, setCommunesInData] = useState([]);

    // Obtenir les informations de la commune
    const communeInfo = useMemo(() => {
        const info = getCommuneInfo(effectiveCommuneName);
        
        // Debug pour vérifier les coordonnées
        console.log('📍 Commune Info pour', effectiveCommuneName, ':', {
            nom: effectiveCommuneName,
            lat: info.lat,
            lng: info.lng,
            quartiers: info.quartiers?.length || 0
        });
        
        return info;
    }, [effectiveCommuneName]);

    // Effet pour filtrer les signalements par commune et statut - VERSION CORRIGÉE
    useEffect(() => {
        if (!reports || reports.length === 0) {
            setFilteredReports([]);
            setCommunesInData([]);
            return;
        }

        console.log(`🔍 FILTRAGE STRICT POUR COMMUNE: ${effectiveCommuneName}`);
        console.log(`📊 Total signalements reçus: ${reports.length}`);

        const targetCommuneNormalized = normalizeCommuneName(effectiveCommuneName);
        
        console.log(`🎯 Commune cible normalisée: "${targetCommuneNormalized}"`);

        // Identifier toutes les communes présentes dans les signalements
        const allCommunesInReports = [...new Set(reports
            .map(r => r.commune || r.location?.commune || '')
            .filter(Boolean)
            .map(normalizeCommuneName)
        )];
        
        setCommunesInData(allCommunesInReports);

        // Filtrer strictement par commune
        const communeReports = reports.filter(report => {
            // Récupérer la commune du signalement
            const reportCommune = 
                report.commune || 
                report.location?.commune || 
                report.agent_commune || 
                '';
            
            const reportCommuneNormalized = normalizeCommuneName(reportCommune);
            
            // Vérifier la correspondance exacte
            const matches = reportCommuneNormalized === targetCommuneNormalized;
            
            return matches;
        });

        // Statistiques de filtrage
        const otherCommunesReports = reports.filter(report => {
            const reportCommune = report.commune || report.location?.commune || '';
            return normalizeCommuneName(reportCommune) !== targetCommuneNormalized;
        });

        console.log('📊 STATISTIQUES FILTRAGE:', {
            totalSignalements: reports.length,
            pourCommune: communeReports.length,
            autresCommunes: otherCommunesReports.length,
            communesTrouvees: allCommunesInReports,
            communeCiblePresente: allCommunesInReports.includes(targetCommuneNormalized)
        });

        // Avertissement si aucun signalement pour la commune
        if (communeReports.length === 0 && reports.length > 0) {
            console.warn(`⚠️ AUCUN signalement pour la commune: ${effectiveCommuneName}`);
            console.warn(`📋 Communes disponibles dans les données:`, allCommunesInReports);
            
            // Vérifier s'il y a des correspondances proches
            const similarCommunes = allCommunesInReports.filter(commune => 
                commune.includes(targetCommuneNormalized) || 
                targetCommuneNormalized.includes(commune)
            );
            
            if (similarCommunes.length > 0) {
                console.warn(`💡 Noms similaires trouvés:`, similarCommunes);
            }
        }

        // Ensuite filtrer par statut
        if (showCompletedReports) {
            setFilteredReports(communeReports);
        } else {
            setFilteredReports(communeReports.filter(report => 
                report.status !== 'COMPLETED' && report.status !== 'TERMINE'
            ));
        }
    }, [reports, showCompletedReports, effectiveCommuneName]);

    // Effet de débogage
    useEffect(() => {
        console.log('=== SIMPLE COMMUNE MAP DEBUG ===');
        console.log('Commune demandée:', communeName);
        console.log('Commune utilisateur:', userCommune);
        console.log('Commune effective:', effectiveCommuneName);
        console.log('Coordonnées:', communeInfo);
        console.log('Signalements reçus:', reports.length);
        console.log('Signalements filtrés:', filteredReports.length);
        console.log('Afficher les terminés?', showCompletedReports);

        let debug = '=== DÉBOGAGE CARTE COMMUNALE ===\n';
        debug += `Commune demandée: ${communeName || 'Non spécifiée'}\n`;
        debug += `Commune utilisateur: ${userCommune || 'Non spécifiée'}\n`;
        debug += `Commune effective: ${effectiveCommuneName}\n`;
        debug += `Centre: ${communeInfo.lat}, ${communeInfo.lng}\n`;
        debug += `Signalements reçus: ${reports.length}\n`;
        debug += `Signalements pour ${effectiveCommuneName}: ${filteredReports.length}\n`;
        debug += `Signalements autres communes: ${reports.length - filteredReports.length}\n`;
        debug += `Communes dans données: ${communesInData.join(', ')}\n`;
        debug += `Afficher terminés: ${showCompletedReports}\n`;
        debug += `Rôle: ${userRole || 'Non spécifié'}\n`;
        setDebugInfo(debug);
    }, [communeName, userCommune, effectiveCommuneName, communeInfo, reports, filteredReports, showCompletedReports, userRole, communesInData]);

    // Traiter les signalements pour les quartiers
    const processedReports = useMemo(() => {
        if (!filteredReports || filteredReports.length === 0) return [];

        console.log('📊 Traitement des signalements pour la carte:', filteredReports.length);

        // Grouper par quartier
        const quartiersMap = {};

        filteredReports.forEach((report, index) => {
            const quartierKey = report.quartier || report.location?.quartier || report.commune || `${effectiveCommuneName} Général`;

            if (!quartiersMap[quartierKey]) {
                quartiersMap[quartierKey] = {
                    id: quartierKey,
                    name: quartierKey,
                    reports: [],
                    active_reports: 0,
                    reports_count: 0,
                    status_counts: { PENDING: 0, IN_PROGRESS: 0, COMPLETED: 0 }
                };
            }

            quartiersMap[quartierKey].reports.push(report);
            quartiersMap[quartierKey].reports_count++;
            quartiersMap[quartierKey].status_counts[report.status] =
                (quartiersMap[quartierKey].status_counts[report.status] || 0) + 1;

            if (report.status === 'PENDING' || report.status === 'IN_PROGRESS') {
                quartiersMap[quartierKey].active_reports++;
            }
        });

        // Convertir en tableau et positionner autour du centre de la commune
        const quartiers = Object.values(quartiersMap).map((quartier, index) => {
            // Position circulaire autour du centre
            const angle = (index / Object.keys(quartiersMap).length) * 2 * Math.PI;
            const radius = 0.005; // Environ 500m
            const spread = 0.008; // Variation

            return {
                ...quartier,
                latitude: communeInfo.lat + (Math.sin(angle) * radius) + (Math.random() * spread - spread/2),
                longitude: communeInfo.lng + (Math.cos(angle) * radius) + (Math.random() * spread - spread/2),
                has_waste: quartier.active_reports > 0
            };
        });

        return quartiers;
    }, [filteredReports, effectiveCommuneName, communeInfo]);

    useEffect(() => {
        fetchMapData();
    }, [effectiveCommuneName, filteredReports, communeInfo]);

    const fetchMapData = async () => {
        console.log('🔄 Chargement carte pour la commune:', effectiveCommuneName);
        setLoadingMap(true);
        setError(null);

        try {
            if (filteredReports && filteredReports.length > 0) {
                console.log(`✅ ${filteredReports.length} signalements à afficher pour ${effectiveCommuneName}`);

                const totalReports = filteredReports.length;
                const activeReports = filteredReports.filter(r =>
                    r.status === 'PENDING' || r.status === 'IN_PROGRESS'
                ).length;
                const completedReports = filteredReports.filter(r =>
                    r.status === 'COMPLETED' || r.status === 'TERMINE'
                ).length;

                const data = {
                    commune: {
                        id: 1,
                        name: effectiveCommuneName,
                        postal_code: '00000',
                        latitude: communeInfo.lat,
                        longitude: communeInfo.lng,
                        boundaries: communeInfo.bounds,
                        quartiers_count: processedReports.length
                    },
                    quartiers: processedReports,
                    reports: filteredReports, // Utiliser filteredReports au lieu de reports
                    stats: {
                        total_reports: totalReports,
                        active_reports: activeReports,
                        completed_reports: completedReports,
                        pending_reports: filteredReports.filter(r => r.status === 'PENDING').length,
                        in_progress_reports: filteredReports.filter(r => r.status === 'IN_PROGRESS').length
                    }
                };

                setMapData(data);
                setDebugInfo(prev => prev + `Carte chargée: ✅ ${filteredReports.length} signalements (uniquement ${effectiveCommuneName})\n`);
            } else {
                // Utiliser les données de fallback centrées sur la commune
                console.log('⚠️ Aucun signalement, utilisation mode test pour:', effectiveCommuneName);
                setMapData(getFallbackData(effectiveCommuneName));
                setDebugInfo(prev => prev + `Données: ⚠️ Mode test centré sur ${effectiveCommuneName}\n`);
            }
        } catch (apiError) {
            console.error('❌ Erreur récupération données:', apiError);
            setError(apiError.message);
            setMapData(getFallbackData(effectiveCommuneName));
            setDebugInfo(prev => prev + `Données: ⚠️ Fallback (${apiError.message})\n`);
        } finally {
            setLoadingMap(false);
        }
    };

    // Données de fallback pour le développement
    const getFallbackData = (commune) => {
        const communeData = getCommuneInfo(commune);
        const quartiers = communeData.quartiers || [`${commune} Centre`, `${commune} Nord`, `${commune} Sud`];
        
        const fallbackQuartiers = quartiers.map((quartierName, index) => {
            // Position circulaire pour un affichage esthétique
            const angle = (index / quartiers.length) * 2 * Math.PI;
            const radius = 0.004; // Environ 400m
            const spread = 0.006; // Variation

            return {
                id: index + 1,
                name: quartierName,
                latitude: communeData.lat + (Math.sin(angle) * radius) + (Math.random() * spread - spread/2),
                longitude: communeData.lng + (Math.cos(angle) * radius) + (Math.random() * spread - spread/2),
                active_reports: Math.floor(Math.random() * 4),
                reports_count: Math.floor(Math.random() * 8) + 2,
                has_waste: Math.random() > 0.3,
                reports: []
            };
        });

        const activeReports = fallbackQuartiers.reduce((sum, q) => sum + q.active_reports, 0);
        const totalReports = fallbackQuartiers.reduce((sum, q) => sum + q.reports_count, 0);

        return {
            commune: {
                id: 1,
                name: commune,
                postal_code: '00000',
                latitude: communeData.lat,
                longitude: communeData.lng,
                boundaries: communeData.bounds,
                quartiers_count: fallbackQuartiers.length
            },
            quartiers: fallbackQuartiers,
            reports: [],
            stats: {
                total_reports: totalReports,
                active_reports: activeReports,
                completed_reports: totalReports - activeReports,
                pending_reports: Math.floor(activeReports * 0.6),
                in_progress_reports: Math.floor(activeReports * 0.4)
            }
        };
    };

    const getQuartierColor = (quartier) => {
        if (quartier.active_reports > 3) return '#ef4444'; // Rouge
        if (quartier.active_reports > 0) return '#f59e0b'; // Orange
        return '#10b981'; // Vert
    };

    const getQuartierRadius = (quartier) => {
        const baseRadius = 8;
        return baseRadius + (quartier.active_reports * 2);
    };

    const getReportColor = (status) => {
        switch(status) {
            case 'PENDING': return '#ef4444'; // Rouge
            case 'IN_PROGRESS': return '#3b82f6'; // Bleu
            case 'COMPLETED': return '#10b981'; // Vert
            case 'TERMINE': return '#10b981'; // Vert aussi
            default: return '#6b7280'; // Gris
        }
    };

    const getReportIcon = (status) => {
        return createCustomIcon(getReportColor(status));
    };

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

    const handleQuartierClick = async (quartierId, quartierName) => {
        console.log(`📍 Clic sur quartier: ${quartierName} (ID: ${quartierId})`);

        if (mapData) {
            const quartier = mapData.quartiers.find(q => q.id === quartierId);

            if (quartier && quartier.reports && quartier.reports.length > 0) {
                const details = {
                    quartier: quartier,
                    reports: quartier.reports,
                    stats: {
                        total: quartier.reports_count,
                        pending: quartier.status_counts?.PENDING || 0,
                        in_progress: quartier.status_counts?.IN_PROGRESS || 0,
                        completed: quartier.status_counts?.COMPLETED || 0
                    }
                };

                if (onQuartierClick) {
                    onQuartierClick(details);
                }
            } else {
                console.log('Aucun signalement dans ce quartier');
            }
        }
    };

    const handleReportClick = (report) => {
        console.log('📍 Signalement cliqué:', report.id);
        setSelectedReport(report);
    };

    // Fonction pour basculer l'affichage des signalements traités
    const toggleCompletedReports = () => {
        setShowCompletedReports(!showCompletedReports);
    };

    const refreshData = () => {
        console.log('🔄 Actualisation des données...');
        fetchMapData();
    };

    if (loadingMap) {
        return (
            <div className="flex flex-col items-center justify-center h-[500px] bg-gray-50 rounded-2xl p-8">
                <div className="text-center">
                    <div className="inline-block w-16 h-16 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                    <p className="mt-4 text-gray-600 text-lg font-medium">Chargement de la carte...</p>
                    <p className="text-sm text-gray-500 mt-2">Commune: <strong>{effectiveCommuneName}</strong></p>
                    <p className="text-sm text-gray-500">
                        Signalements reçus: {reports.length} | 
                        Filtrage: {filteredReports.length} pour {effectiveCommuneName}
                    </p>
                    {reports.length > 0 && (
                        <p className="text-sm text-amber-600 mt-1">
                            {reports.length - filteredReports.length} signalements d'autres communes seront masqués
                        </p>
                    )}
                </div>
            </div>
        );
    }

    if (error && !mapData) {
        return (
            <div className="flex flex-col items-center justify-center h-[500px] bg-gradient-to-br from-red-50 to-red-100/30 rounded-2xl border-2 border-red-200 p-8">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <span className="text-4xl text-white">⚠️</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-3">Erreur de chargement</h3>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={refreshData}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-lg transition-all duration-300"
                    >
                        Réessayer
                    </button>
                </div>
            </div>
        );
    }

    if (!mapData) {
        return (
            <div className="h-[500px] flex flex-col items-center justify-center bg-gray-100 rounded-2xl p-8">
                <p className="text-xl text-gray-700 mb-4">Aucune donnée disponible pour {effectiveCommuneName}</p>
                <button
                    onClick={refreshData}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
                >
                    Charger les données
                </button>
            </div>
        );
    }

    const center = [mapData.commune.latitude, mapData.commune.longitude];

    return (
        <div className="relative w-full">
            {/* En-tête avec informations */}
            <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-white rounded-xl shadow-sm border border-blue-100">
                <div className="flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
                                <span className="text-white text-xl">📍</span>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">
                                    Zone d'intervention : <span className="text-blue-700">{effectiveCommuneName.toUpperCase()}</span>
                                </h2>
                                <p className="text-gray-600 text-sm">
                                    Carte restreinte à votre secteur de travail • {mapData.quartiers.length} quartiers
                                </p>
                            </div>
                        </div>
                        
                        {/* Indicateurs de filtrage */}
                        <div className="flex flex-wrap gap-2 mt-2">
                            <div className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full font-medium flex items-center gap-1">
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                <span>Filtrage strict activé</span>
                            </div>
                            <div className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full font-medium flex items-center gap-1">
                                <span>🗺️</span>
                                <span>Vue communale exclusive</span>
                            </div>
                            <div className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full font-medium flex items-center gap-1">
                                <span>👷‍♂️</span>
                                <span>Secteur assigné uniquement</span>
                            </div>
                            
                            {/* Afficher si des signalements sont masqués */}
                            {reports.length > filteredReports.length && (
                                <div className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full font-medium flex items-center gap-1">
                                    <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                                    <span>{reports.length - filteredReports.length} autres communes masquées</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {/* Bouton pour masquer/afficher les signalements traités */}
                        <button
                            onClick={toggleCompletedReports}
                            className={`px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 ${
                                showCompletedReports
                                    ? 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200'
                                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                            }`}
                            title={showCompletedReports ? "Masquer les signalements traités" : "Afficher les signalements traités"}
                        >
                            <span>{showCompletedReports ? '✅' : '👁️'}</span>
                            <span className="text-sm">
                                {showCompletedReports ? 'Afficher terminés' : 'Masquer terminés'}
                            </span>
                        </button>
                        
                        <button
                            onClick={refreshData}
                            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2"
                        >
                            <span>🔄</span>
                            Actualiser
                        </button>
                    </div>
                </div>

                {/* Informations sur les signalements */}
                <div className="mt-4 grid grid-cols-4 gap-2">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-sm">En attente ({mapData.stats.pending_reports || 0})</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-sm">En cours ({mapData.stats.in_progress_reports || 0})</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${showCompletedReports ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <span className={`text-sm ${showCompletedReports ? 'text-gray-700' : 'text-gray-400'}`}>
                            Terminés ({mapData.stats.completed_reports || 0})
                        </span>
                        {!showCompletedReports && (
                            <span className="text-xs text-gray-400">(masqués)</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                        <span className="text-sm">Total ({mapData.stats.total_reports})</span>
                    </div>
                </div>
                
                {/* Indicateur du filtre actif */}
                <div className="mt-3 flex flex-col gap-1">
                    {!showCompletedReports && mapData.stats.completed_reports > 0 && (
                        <div className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-lg inline-flex items-center gap-2 w-fit">
                            <span>ℹ️</span>
                            <span>
                                {mapData.stats.completed_reports} signalement(s) traité(s) masqué(s) sur la carte
                            </span>
                        </div>
                    )}
                    
                    {reports.length > filteredReports.length && (
                        <div className="text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-lg inline-flex items-center gap-2 w-fit">
                            <span>👁️</span>
                            <span>
                                {reports.length - filteredReports.length} signalement(s) d'autres communes masqué(s)
                            </span>
                            {communesInData.length > 0 && (
                                <span className="text-xs text-gray-500">
                                    (Communes: {communesInData.filter(c => normalizeCommuneName(c) !== normalizeCommuneName(effectiveCommuneName)).join(', ')})
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Carte Leaflet */}
            <div className="h-[500px] rounded-2xl overflow-hidden border-2 border-gray-300 shadow-xl relative">
                <MapContainer
                    center={center}
                    zoom={14}
                    minZoom={13}
                    maxZoom={18}
                    className="h-full w-full"
                    scrollWheelZoom={true}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />

                    {/* Marqueurs pour les quartiers */}
                    {mapData.quartiers.map((quartier) => (
                        <CircleMarker
                            key={`quartier-${quartier.id}`}
                            center={[
                                quartier.latitude || center[0],
                                quartier.longitude || center[1]
                            ]}
                            radius={getQuartierRadius(quartier)}
                            pathOptions={{
                                fillColor: getQuartierColor(quartier),
                                color: '#1f2937',
                                weight: 2,
                                opacity: 0.8,
                                fillOpacity: 0.3
                            }}
                            eventHandlers={{
                                click: () => handleQuartierClick(quartier.id, quartier.name)
                            }}
                        >
                            <Popup>
                                <div className="p-2 min-w-[200px]">
                                    <h3 className="font-bold text-lg mb-2">{quartier.name}</h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Signalements:</span>
                                            <span className="font-bold">{quartier.reports_count}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Actifs:</span>
                                            <span className={`font-bold ${quartier.active_reports > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                {quartier.active_reports}
                                            </span>
                                        </div>
                                        {quartier.reports && quartier.reports.length > 0 && (
                                            <div className="mt-2">
                                                <p className="text-sm font-medium text-gray-700 mb-1">Derniers signalements:</p>
                                                {quartier.reports.slice(0, 3).map(report => (
                                                    <div key={report.id} className="text-xs text-gray-600 border-l-2 pl-2 mb-1"
                                                         style={{borderLeftColor: getReportColor(report.status)}}>
                                                        #{report.id} - {report.status}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Popup>
                        </CircleMarker>
                    ))}

                    {/* Marqueurs pour les signalements individuels */}
                    {mapData.reports && mapData.reports.length > 0 && mapData.reports.map((report) => (
                        (report.latitude && report.longitude) ? (
                            <Marker
                                key={`report-${report.id}`}
                                position={[report.latitude, report.longitude]}
                                icon={getReportIcon(report.status)}
                                eventHandlers={{
                                    click: () => handleReportClick(report)
                                }}
                            >
                                <Popup>
                                    <div className="p-3 min-w-[250px]">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-bold text-lg">Signalement #{report.id}</h3>
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                report.status === 'PENDING' ? 'bg-red-100 text-red-800' :
                                                report.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                                                'bg-green-100 text-green-800'
                                            }`}>
                                                {report.status}
                                            </span>
                                        </div>

                                        {report.description && (
                                            <p className="text-gray-600 text-sm mb-2">{report.description.substring(0, 100)}...</p>
                                        )}

                                        <div className="text-xs text-gray-500 mb-3">
                                            <div>📍 {report.latitude?.toFixed(6)}, {report.longitude?.toFixed(6)}</div>
                                            <div>📅 {formatDate(report.created_at)}</div>
                                            {report.reporter_name && (
                                                <div>👤 {report.reporter_name}</div>
                                            )}
                                            {report.commune && (
                                                <div className="font-medium">
                                                    🏘️ Commune: <span className="text-blue-600">{report.commune}</span>
                                                </div>
                                            )}
                                        </div>

                                        {isAgent && report.status === 'PENDING' && (
                                            <button
                                                onClick={() => onTakeMission && onTakeMission(report.id)}
                                                disabled={loading}
                                                className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                                            >
                                                ✅ Prendre en charge
                                            </button>
                                        )}

                                        {isAgent && report.status === 'IN_PROGRESS' && (
                                            <button
                                                onClick={() => onCompleteMission && onCompleteMission(report.id)}
                                                disabled={loading}
                                                className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                                            >
                                                ✓ Marquer comme terminé
                                            </button>
                                        )}
                                    </div>
                                </Popup>
                            </Marker>
                        ) : null
                    ))}
                </MapContainer>

                {/* Légende */}
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg max-w-xs border border-gray-200">
                    <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                        <span>🗺️</span> Légende - {effectiveCommuneName}
                    </h4>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-red-500 border border-gray-300"></div>
                            <span className="text-sm">Signalement en attente</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-blue-500 border border-gray-300"></div>
                            <span className="text-sm">Signalement en cours</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full border border-gray-300 ${
                                showCompletedReports ? 'bg-green-500' : 'bg-gray-300'
                            }`}></div>
                            <span className={`text-sm ${showCompletedReports ? 'text-gray-700' : 'text-gray-400'}`}>
                                Signalement terminé
                            </span>
                            {!showCompletedReports && <span className="text-xs text-gray-400">(masqué)</span>}
                        </div>
                        <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
                            <strong>Cercles:</strong> quartiers (taille = signalements actifs)<br/>
                            <strong>Points:</strong> signalements individuels<br/>
                            <strong>Zone:</strong> Commune {effectiveCommuneName} uniquement<br/>
                            <strong>Filtre:</strong> Signalements d'autres communes masqués
                        </div>
                    </div>
                </div>

                {/* Indicateurs */}
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                    {(!mapData.reports || mapData.reports.length === 0) && (
                        <div className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                            ⚠️ Mode Test
                        </div>
                    )}
                    
                    {!showCompletedReports && mapData.stats.completed_reports > 0 && (
                        <div className="bg-gray-700 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg flex items-center gap-2">
                            <span>👁️</span>
                            <span>
                                {mapData.stats.completed_reports} terminé(s) masqué(s)
                            </span>
                        </div>
                    )}
                    
                    {reports.length > filteredReports.length && (
                        <div className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg flex items-center gap-2">
                            <span>🚫</span>
                            <span>
                                {reports.length - filteredReports.length} autres communes
                            </span>
                        </div>
                    )}
                    
                    <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                        📍 {effectiveCommuneName}
                    </div>
                </div>
            </div>

            {/* Statistiques en bas */}
            <div className="mt-4 grid grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border text-center relative">
                    {reports.length > mapData.stats.total_reports && (
                        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                            {reports.length - mapData.stats.total_reports} autres communes
                        </div>
                    )}
                    <div className="text-2xl font-bold text-blue-600">{mapData.stats.total_reports}</div>
                    <div className="text-sm text-gray-600">Signalements {effectiveCommuneName}</div>
                    <div className="text-xs text-blue-400">(uniquement votre commune)</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border text-center">
                    <div className="text-2xl font-bold text-red-600">{mapData.stats.active_reports}</div>
                    <div className="text-sm text-gray-600">Nécessitent action</div>
                    <div className="text-xs text-red-400">(en attente/en cours)</div>
                </div>
                <div className={`bg-white p-4 rounded-xl shadow-sm border text-center ${
                    !showCompletedReports ? 'opacity-60' : ''
                }`}>
                    <div className="text-2xl font-bold text-green-600">{mapData.stats.completed_reports || 0}</div>
                    <div className="text-sm text-gray-600">Déjà traités</div>
                    <div className={`text-xs ${showCompletedReports ? 'text-green-400' : 'text-gray-400'}`}>
                        {showCompletedReports ? '(visibles)' : '(masqués)'}
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border text-center">
                    <div className="text-2xl font-bold text-purple-600">{mapData.quartiers.length}</div>
                    <div className="text-sm text-gray-600">Quartiers couverts</div>
                    <div className="text-xs text-purple-400">(dans {effectiveCommuneName})</div>
                </div>
            </div>

            {/* Section de débogage (optionnelle) */}
            <details className="mt-4">
                <summary className="text-sm font-medium text-gray-700 cursor-pointer">
                    ℹ️ Informations techniques (Débogage filtre commune)
                </summary>
                <pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap overflow-auto max-h-32 p-3 bg-gray-50 rounded">
                    {debugInfo}
                    === FILTRE COMMUNE ===
                    Commune demandée: {communeName || 'Non spécifiée'}
                    Commune utilisateur: {userCommune || 'Non spécifiée'}
                    Commune effective: {effectiveCommuneName}
                    Signalements totaux reçus: {reports.length}
                    Signalements après filtrage: {filteredReports.length}
                    Signalements masqués (autres communes): {reports.length - filteredReports.length}
                    Communes différentes trouvées: {
                        reports.length > 0 
                            ? [...new Set(reports.map(r => r.commune || r.location?.commune).filter(Boolean))]
                                  .filter(c => normalizeCommuneName(c) !== normalizeCommuneName(effectiveCommuneName))
                                  .join(', ') || 'Aucune'
                            : 'Aucun signalement'
                    }
                    === COORDONNÉES ===
                    Centre carte: {center[0]}, {center[1]}
                    Zoom: 14 (vue communale)
                    Filtre: {showCompletedReports ? 'Tous signalements' : 'Masquer COMPLETED'}
                </pre>
            </details>
        </div>
    );
};

export default SimpleCommuneMap;
