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

module.exports = {
  LIMA_CALLAO_DISTRICTS,
  PERU_DEPARTMENTS,
  LIMA_PROVINCES,
  normalizeDistrict,
  isStandardDistrict
};
