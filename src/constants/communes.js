/**
 * Coordonnées et informations des communes de Kinshasa
 * Pour afficher uniquement la commune spécifique du ramasseur
 */

export const COMMUNES_COORDINATES = {
    'Lemba': { 
        lat: -4.3920, 
        lng: 15.3350,
        bounds: [
            [-4.42, 15.32], // sud-ouest
            [-4.37, 15.35]  // nord-est
        ],
        quartiers: [
            'Lemba Centre',
            'Lemba Terminus', 
            'Lemba Université',
            'Lemba Maternité',
            'Lemba Mbanza',
            'Lemba Kabinda'
        ]
    },
    'Gombe': { 
        lat: -4.3052, 
        lng: 15.3004,
        bounds: [
            [-4.32, 15.29],
            [-4.29, 15.31]
        ],
        quartiers: [
            'Gombe Centre',
            'Kinshasa',
            'Kintambo',
            'Lingwala',
            'Barumbu',
            'Ngaliema'
        ]
    },
     // Ajoutez cette entrée dans COMMUNES_COORDINATES
'Ngaliema': {
    lat: -4.3316,  // Coordonnées approximatives de Ngaliema
    lng: 15.2567,
    bounds: [
        [-4.35, 15.24], // sud-ouest
        [-4.31, 15.28]  // nord-est
    ],
    quartiers: [
        'Ngaliema Centre',
        'Binza',
        'Kintambo',
        'Kinsuka',
        'Bandal',
        'Momo'
    ]
},
    'Limete': { 
        lat: -4.3800, 
        lng: 15.3500,
        bounds: [
            [-4.40, 15.34],
            [-4.36, 15.36]
        ],
        quartiers: [
            'Limete Centre',
            'Limete Industriel',
            'Limete Kinsuka',
            'Limete Gare'
        ]
    },
    'Ngaba': { 
        lat: -4.3700, 
        lng: 15.3600,
        bounds: [
            [-4.38, 15.35],
            [-4.36, 15.37]
        ],
        quartiers: [
            'Ngaba Centre',
            'Ngaba Moke',
            'Ngaba Monene'
        ]
    },
    'Mont-Ngafula': { 
        lat: -4.4500, 
        lng: 15.2500,
        bounds: [
            [-4.48, 15.24],
            [-4.42, 15.26]
        ],
        quartiers: [
            'Mont-Ngafula Centre',
            'Kimbondo',
            'Mikondo'
        ]
    },
    'Kimbanseke': { 
        lat: -4.4200, 
        lng: 15.3800,
        bounds: [
            [-4.45, 15.36],
            [-4.39, 15.40]
        ],
        quartiers: [
            'Kimbanseke Centre',
            'Mikonga',
            'Mwene-Ditu'
        ]
    },
    'Masina': { 
        lat: -4.3800, 
        lng: 15.4200,
        bounds: [
            [-4.40, 15.40],
            [-4.36, 15.44]
        ],
        quartiers: [
            'Masina Centre',
            'Masina Maziba',
            'Masina Kilo'
        ]
    },
    'Matete': { 
        lat: -4.3900, 
        lng: 15.3300,
        bounds: [
            [-4.41, 15.32],
            [-4.37, 15.34]
        ],
        quartiers: [
            'Matete Centre',
            'Matete Monseigneur',
            'Matete Gare'
        ]
    },
    'Bandalungwa': { 
        lat: -4.3600, 
        lng: 15.2900,
        bounds: [
            [-4.37, 15.28],
            [-4.35, 15.30]
        ],
        quartiers: [
            'Bandalungwa Centre',
            'Bandalungwa Poids Lourds'
        ]
    },
    'Bumbu': { 
        lat: -4.3500, 
        lng: 15.3100,
        bounds: [
            [-4.36, 15.30],
            [-4.34, 15.32]
        ],
        quartiers: [
            'Bumbu Centre',
            'Bumbu Lemba'
        ]
    },
    'Kalamu': { 
        lat: -4.3400, 
        lng: 15.2800,
        bounds: [
            [-4.35, 15.27],
            [-4.33, 15.29]
        ],
        quartiers: [
            'Kalamu Centre',
            'Kalamu Mabanga'
        ]
    },
    'Kasa-Vubu': { 
        lat: -4.3300, 
        lng: 15.2700,
        bounds: [
            [-4.34, 15.26],
            [-4.32, 15.28]
        ],
        quartiers: [
            'Kasa-Vubu Centre'
        ]
    },
    'Kinshasa': { 
        lat: -4.3224, 
        lng: 15.3070,
        bounds: [
            [-4.35, 15.29],
            [-4.30, 15.32]
        ],
        quartiers: [
            'Kinshasa Centre',
            'Kinshasa Plateau'
        ]
    }
};

/**
 * Obtient les informations d'une commune spécifique
 * @param {string} communeName - Nom de la commune
 * @returns {Object} Informations de la commune
 */
export const getCommuneInfo = (communeName) => {
    return COMMUNES_COORDINATES[communeName] || COMMUNES_COORDINATES['Lemba'];
};

/**
 * Liste des noms de communes disponibles
 */
export const COMMUNES_LIST = Object.keys(COMMUNES_COORDINATES);
