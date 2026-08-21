/**
 * Lista oficial de distritos de Lima Metropolitana y Callao
 * Utilizado para estandarización, autocompletado y trazabilidad de envíos
 */

const LIMA_CALLAO_DISTRICTS = [
  // Lima Centro / Moderna / Tradicional
  'Cercado de Lima',
  'Barranco',
  'Breña',
  'Jesús María',
  'La Victoria',
  'Lince',
  'Magdalena del Mar',
  'Miraflores',
  'Pueblo Libre',
  'Rímac',
  'San Borja',
  'San Isidro',
  'San Luis',
  'San Miguel',
  'Santiago de Surco',
  'Surquillo',

  // Lima Este
  'Ate',
  'Chaclacayo',
  'Cieneguilla',
  'El Agustino',
  'La Molina',
  'Lurigancho-Chosica',
  'San Juan de Lurigancho',
  'Santa Anita',

  // Lima Norte
  'Ancón',
  'Carabayllo',
  'Comas',
  'Independencia',
  'Los Olivos',
  'Puente Piedra',
  'San Martín de Porres',
  'Santa Rosa',

  // Lima Sur
  'Chorrillos',
  'Lurín',
  'Pachacámac',
  'Pucusana',
  'Punta Hermosa',
  'Punta Negra',
  'San Bartolo',
  'San Juan de Miraflores',
  'Santa María del Mar',
  'Villa El Salvador',
  'Villa María del Triunfo',

  // Provincia Constitucional del Callao
  'Callao',
  'Bellavista',
  'Carmen de la Legua Reynoso',
  'La Perla',
  'La Punta',
  'Mi Perú',
  'Ventanilla'
];

/**
 * Mapeo de alias o abreviaciones comunes a nombres oficiales
 */
const DISTRICT_SYNONYMS = {
  'lima': 'Cercado de Lima',
  'lima centro': 'Cercado de Lima',
  'cercado': 'Cercado de Lima',
  'surco': 'Santiago de Surco',
  'santiago surco': 'Santiago de Surco',
  'sjl': 'San Juan de Lurigancho',
  's.j.l.': 'San Juan de Lurigancho',
  'san juan de lurigancho': 'San Juan de Lurigancho',
  'sjm': 'San Juan de Miraflores',
  's.j.m.': 'San Juan de Miraflores',
  'san juan de miraflores': 'San Juan de Miraflores',
  'smp': 'San Martín de Porres',
  's.m.p.': 'San Martín de Porres',
  'san martin de porres': 'San Martín de Porres',
  'san martin': 'San Martín de Porres',
  'ves': 'Villa El Salvador',
  'v.e.s.': 'Villa El Salvador',
  'villa el salvador': 'Villa El Salvador',
  'vmt': 'Villa María del Triunfo',
  'v.m.t.': 'Villa María del Triunfo',
  'villa maria del triunfo': 'Villa María del Triunfo',
  'chosica': 'Lurigancho-Chosica',
  'lurigancho': 'Lurigancho-Chosica',
  'magdalena': 'Magdalena del Mar',
  'carmen de la legua': 'Carmen de la Legua Reynoso',
  'carmen de la legua reynoso': 'Carmen de la Legua Reynoso'
};

function removeAccents(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Normaliza y busca coincidencia estándar para un distrito ingresado
 * @param {string} input - Texto del distrito ingresado o pegado
 * @returns {string|null} - Nombre oficial exacto o null si no coincide
 */
function normalizeDistrict(input) {
  if (!input || typeof input !== 'string') return null;

  const clean = input.trim().toLowerCase();
  const cleanNoAccents = removeAccents(clean);

  // 1. Verificar si coincide con alias común
  if (DISTRICT_SYNONYMS[cleanNoAccents]) {
    return DISTRICT_SYNONYMS[cleanNoAccents];
  }

  // 2. Verificar coincidencia exacta ignorando mayúsculas y tildes
  for (const official of LIMA_CALLAO_DISTRICTS) {
    const officialClean = official.toLowerCase();
    const officialNoAccents = removeAccents(officialClean);

    if (cleanNoAccents === officialNoAccents) {
      return official;
    }
  }

  // 3. Verificar si contiene el nombre de un distrito principal
  for (const official of LIMA_CALLAO_DISTRICTS) {
    const officialNoAccents = removeAccents(official.toLowerCase());
    if (officialNoAccents.length > 4 && cleanNoAccents.includes(officialNoAccents)) {
      return official;
    }
  }

  return null;
}

const PERU_DEPARTMENTS = [
  'Lima',
  'Callao',
  'Amazonas',
  'Áncash',
  'Apurímac',
  'Arequipa',
  'Ayacucho',
  'Cajamarca',
  'Cusco',
  'Huancavelica',
  'Huánuco',
  'Ica',
  'Junín',
  'La Libertad',
  'Lambayeque',
  'Loreto',
  'Madre de Dios',
  'Moquegua',
  'Pasco',
  'Piura',
  'Puno',
  'San Martín',
  'Tacna',
  'Tumbes',
  'Ucayali'
];

const LIMA_PROVINCES = [
  'Lima',
  'Callao',
  'Barranca',
  'Cajatambo',
  'Canta',
  'Cañete',
  'Huaral',
  'Huarochirí',
  'Huaura',
  'Oyón',
  'Yauyos'
];

/**
 * Valida si un texto corresponde a un distrito oficial
 * @param {string} input
 * @returns {boolean}
 */
function isStandardDistrict(input) {
  return normalizeDistrict(input) !== null;
}

/**
 * Coordenadas de referencia (centroides) de los distritos de Lima y Callao
 */
const DISTRICT_CENTROIDS = {
  'Miraflores': { lat: -12.1219, lng: -77.0298 },
  'San Isidro': { lat: -12.0975, lng: -77.0345 },
  'Santiago de Surco': { lat: -12.1400, lng: -76.9950 },
  'San Borja': { lat: -12.0900, lng: -77.0000 },
  'La Molina': { lat: -12.0800, lng: -76.9400 },
  'Cercado de Lima': { lat: -12.0463, lng: -77.0427 },
  'San Miguel': { lat: -12.0750, lng: -77.0850 },
  'Magdalena del Mar': { lat: -12.0900, lng: -77.0700 },
  'Pueblo Libre': { lat: -12.0700, lng: -77.0600 },
  'Jesús María': { lat: -12.0750, lng: -77.0450 },
  'Lince': { lat: -12.0833, lng: -77.0333 },
  'La Victoria': { lat: -12.0650, lng: -77.0150 },
  'Barranco': { lat: -12.1480, lng: -77.0200 },
  'Surquillo': { lat: -12.1100, lng: -77.0150 },
  'Chorrillos': { lat: -12.1700, lng: -77.0200 },
  'San Luis': { lat: -12.0750, lng: -77.0000 },
  'Ate': { lat: -12.0250, lng: -76.9200 },
  'Santa Anita': { lat: -12.0450, lng: -76.9650 },
  'San Juan de Lurigancho': { lat: -11.9800, lng: -77.0000 },
  'San Martín de Porres': { lat: -12.0150, lng: -77.0800 },
  'Los Olivos': { lat: -11.9750, lng: -77.0700 },
  'Independencia': { lat: -11.9950, lng: -77.0550 },
  'Comas': { lat: -11.9300, lng: -77.0500 },
  'Carabayllo': { lat: -11.8700, lng: -77.0300 },
  'Puente Piedra': { lat: -11.8650, lng: -77.0750 },
  'San Juan de Miraflores': { lat: -12.1550, lng: -76.9650 },
  'Villa El Salvador': { lat: -12.2050, lng: -76.9400 },
  'Villa María del Triunfo': { lat: -12.1650, lng: -76.9300 },
  'Callao': { lat: -12.0550, lng: -77.1200 },
  'Bellavista': { lat: -12.0600, lng: -77.1000 },
  'La Perla': { lat: -12.0700, lng: -77.1100 },
  'La Punta': { lat: -12.0700, lng: -77.1600 },
  'Carmen de la Legua Reynoso': { lat: -12.0450, lng: -77.0900 },
  'Ventanilla': { lat: -11.8800, lng: -77.1300 },
  'Mi Perú': { lat: -11.8600, lng: -77.1250 },
  'Rímac': { lat: -12.0300, lng: -77.0300 },
  'Breña': { lat: -12.0550, lng: -77.0500 },
  'El Agustino': { lat: -12.0450, lng: -77.0050 },
  'Lurín': { lat: -12.2750, lng: -76.8700 },
  'Pachacámac': { lat: -12.2300, lng: -76.8600 },
  'Chaclacayo': { lat: -11.9750, lng: -76.7700 },
  'Lurigancho-Chosica': { lat: -11.9400, lng: -76.7000 },
  'Cieneguilla': { lat: -12.0950, lng: -76.7700 },
  'Ancón': { lat: -11.7700, lng: -77.1600 },
  'Santa Rosa': { lat: -11.8050, lng: -77.1550 },
  'Pucusana': { lat: -12.4800, lng: -76.7950 },
  'Punta Hermosa': { lat: -12.3350, lng: -76.8250 },
  'Punta Negra': { lat: -12.3650, lng: -76.8000 },
  'San Bartolo': { lat: -12.3900, lng: -76.7800 },
  'Santa María del Mar': { lat: -12.4050, lng: -76.7750 }
};

function getDistrictCoordinates(districtName, applyJitter = true) {
  const norm = normalizeDistrict(districtName);
  if (!norm || !DISTRICT_CENTROIDS[norm]) {
    return { lat: -12.046374, lng: -77.042793, distrito: norm || districtName };
  }

  const base = DISTRICT_CENTROIDS[norm];
  if (!applyJitter) {
    return { lat: base.lat, lng: base.lng, distrito: norm };
  }

  // Jitter controlado de +/- 400 a 800 metros para simular paradas dentro del distrito
  const jitterLat = (Math.random() - 0.5) * 0.012;
  const jitterLng = (Math.random() - 0.5) * 0.012;

  return {
    lat: parseFloat((base.lat + jitterLat).toFixed(6)),
    lng: parseFloat((base.lng + jitterLng).toFixed(6)),
    distrito: norm
  };
}

module.exports = {
  LIMA_CALLAO_DISTRICTS,
  PERU_DEPARTMENTS,
  LIMA_PROVINCES,
  DISTRICT_CENTROIDS,
  normalizeDistrict,
  isStandardDistrict,
  getDistrictCoordinates
};
