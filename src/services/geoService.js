const http = require('http');
const https = require('https');

// Open Location Code (OLC) Specification
const CODE_ALPHABET = '23456789CFGHJMPQRVWX';
const SEPARATOR = '+';
const SEPARATOR_POSITION = 8;
const PADDING_CHARACTER = '0';
const ENCODING_BASE = 20;
const PAIR_CODE_LENGTH = 10;
const LATITUDE_MAX = 90;
const LONGITUDE_MAX = 180;

// Centro de referencia por defecto para códigos cortos (Lima, Perú: Miraflores/Centro)
const DEFAULT_REF_LAT = -12.046374;
const DEFAULT_REF_LNG = -77.042793;

class CodeArea {
  constructor(southLatitude, westLongitude, northLatitude, eastLongitude) {
    this.southLatitude = southLatitude;
    this.westLongitude = westLongitude;
    this.northLatitude = northLatitude;
    this.eastLongitude = eastLongitude;
    this.latitudeCenter = Math.min(southLatitude + (northLatitude - southLatitude) / 2, LATITUDE_MAX);
    this.longitudeCenter = Math.min(westLongitude + (eastLongitude - westLongitude) / 2, LONGITUDE_MAX);
  }
}

function isValidCode(code) {
  if (!code || typeof code !== 'string') return false;
  const cleanCode = code.trim().toUpperCase();
  const sepIdx = cleanCode.indexOf(SEPARATOR);
  if (sepIdx === -1 || sepIdx > SEPARATOR_POSITION || sepIdx % 2 !== 0) return false;
  
  const padIdx = cleanCode.indexOf(PADDING_CHARACTER);
  if (padIdx !== -1) {
    if (padIdx % 2 !== 0 || padIdx < 2 || padIdx >= SEPARATOR_POSITION) return false;
    const padding = cleanCode.substring(padIdx, sepIdx);
    if (!/^0+$/.test(padding)) return false;
    if (cleanCode.length > sepIdx + 1) return false;
  }
  
  for (let i = 0; i < cleanCode.length; i++) {
    const char = cleanCode[i];
    if (char === SEPARATOR || char === PADDING_CHARACTER) continue;
    if (!CODE_ALPHABET.includes(char)) return false;
  }
  return true;
}

function isFullCode(code) {
  if (!isValidCode(code)) return false;
  const cleanCode = code.trim().toUpperCase();
  return cleanCode.indexOf(SEPARATOR) === SEPARATOR_POSITION;
}

function isShortCode(code) {
  if (!isValidCode(code)) return false;
  const cleanCode = code.trim().toUpperCase();
  const sepIdx = cleanCode.indexOf(SEPARATOR);
  return sepIdx >= 0 && sepIdx < SEPARATOR_POSITION;
}

/**
 * Codifica lat/lng a Plus Code completo
 */
function encode(latitude, longitude, codeLength = 10) {
  let lat = Math.min(90, Math.max(-90, latitude));
  let lng = longitude;
  while (lng < -180) lng += 360;
  while (lng >= 180) lng -= 360;

  if (lat === 90) lat = lat - 0.0000001;

  let code = '';
  lat += 90;
  lng += 180;

  let latVal = lat;
  let lngVal = lng;
  let resolution = 20.0;

  for (let i = 0; i < Math.min(codeLength, 10); i += 2) {
    const latDigit = Math.floor(latVal / resolution);
    const lngDigit = Math.floor(lngVal / resolution);
    code += CODE_ALPHABET.charAt(latDigit) + CODE_ALPHABET.charAt(lngDigit);
    latVal -= latDigit * resolution;
    lngVal -= lngDigit * resolution;
    resolution /= 20.0;
    if (code.length === SEPARATOR_POSITION) {
      code += SEPARATOR;
    }
  }

  if (code.indexOf(SEPARATOR) === -1) {
    code += SEPARATOR;
  }

  return code;
}

/**
 * Decodifica un Plus Code completo
 */
function decode(code) {
  const cleanCode = code.trim().toUpperCase().replace(SEPARATOR, '').replace(/0/g, '');
  let south = -LATITUDE_MAX;
  let west = -LONGITUDE_MAX;
  let latRes = 20.0;
  let lngRes = 20.0;

  for (let i = 0; i < Math.min(cleanCode.length, 10); i += 2) {
    const latDigit = CODE_ALPHABET.indexOf(cleanCode.charAt(i));
    const lngDigit = CODE_ALPHABET.indexOf(cleanCode.charAt(i + 1));
    south += latDigit * latRes;
    west += lngDigit * lngRes;
    latRes /= ENCODING_BASE;
    lngRes /= ENCODING_BASE;
  }

  return new CodeArea(south, west, south + latRes * ENCODING_BASE, west + lngRes * ENCODING_BASE);
}

/**
 * Recupera un código corto convirtiéndolo a código completo usando una referencia
 */
function recoverNearest(shortCode, referenceLat = DEFAULT_REF_LAT, referenceLng = DEFAULT_REF_LNG) {
  const cleanCode = shortCode.trim().toUpperCase();
  if (isFullCode(cleanCode)) return cleanCode;
  
  const sepIdx = cleanCode.indexOf(SEPARATOR);
  if (sepIdx === -1 || sepIdx > SEPARATOR_POSITION) {
    throw new Error('Código Plus no válido');
  }

  const prefixLen = SEPARATOR_POSITION - sepIdx;
  const fullRefCode = encode(referenceLat, referenceLng, 10);
  const prefix = fullRefCode.substring(0, prefixLen);
  const candidate = prefix + cleanCode;
  
  return candidate;
}

/**
 * Resuelve una URL corta de Google Maps (maps.app.goo.gl / goo.gl/maps)
 */
function resolveRedirectUrl(urlStr) {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(urlStr);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      
      const req = client.request(parsedUrl, { method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return resolve(res.headers.location);
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          // Si el HTML contiene una meta redirección o canonical URL
          const metaMatch = data.match(/url=(https:\/\/[^"'>]+)/i) || data.match(/href="(https:\/\/[^"'>]+maps[^"'>]+)"/i);
          if (metaMatch) {
            return resolve(metaMatch[1]);
          }
          resolve(urlStr);
        });
      });
      
      req.on('error', () => resolve(urlStr));
      req.setTimeout(4000, () => {
        req.destroy();
        resolve(urlStr);
      });
      req.end();
    } catch {
      resolve(urlStr);
    }
  });
}

/**
 * Extrae lat/lng de cualquier enlace de Google Maps
 */
function extractCoordsFromMapsUrl(urlStr) {
  if (!urlStr) return null;
  
  // Patrón 1: /@(-?\d+\.\d+),(-?\d+\.\d+)
  let match = urlStr.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match) {
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }

  // Patrón 2: q=(-?\d+\.\d+),(-?\d+\.\d+) o ll=(-?\d+\.\d+),(-?\d+\.\d+) o query=(-?\d+\.\d+),(-?\d+\.\d+)
  match = urlStr.match(/[?&](?:q|ll|query|destination|daddr)=(-?\d+\.\d+)[,+](-?\d+\.\d+)/);
  if (match) {
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }

  // Patrón 3: place/(-?\d+\.\d+),(-?\d+\.\d+) o !3d(-?\d+\.\d+)!4d(-?\d+\.\d+)
  match = urlStr.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (match) {
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }

  return null;
}

/**
 * Parser unificado para cualquier texto/input de localización
 */
async function parseLocationInput(input, refLat = DEFAULT_REF_LAT, refLng = DEFAULT_REF_LNG) {
  if (!input || typeof input !== 'string') {
    return { success: false, message: 'Entrada vacía' };
  }

  const trimmed = input.trim();

  // 1. Detectar si son Coordenadas directas (ej: "-12.1219, -77.0298" o "-12.1219 -77.0298")
  const coordRegex = /^(-?\d{1,2}\.\d+)[,\s]+(-?\d{1,3}\.\d+)$/;
  const coordMatch = trimmed.match(coordRegex);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return {
        success: true,
        type: 'coordinates',
        lat,
        lng,
        plusCode: encode(lat, lng, 10),
        label: `Coordenadas (${lat.toFixed(6)}, ${lng.toFixed(6)})`,
        raw: trimmed
      };
    }
  }

  // 2. Detectar si es un enlace de Google Maps
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.includes('maps.google.') || trimmed.includes('goo.gl/maps') || trimmed.includes('maps.app.goo.gl')) {
    let finalUrl = trimmed;
    if (trimmed.includes('goo.gl') || trimmed.includes('maps.app')) {
      finalUrl = await resolveRedirectUrl(trimmed);
    }
    
    const coords = extractCoordsFromMapsUrl(finalUrl);
    if (coords) {
      return {
        success: true,
        type: 'google_maps_link',
        lat: coords.lat,
        lng: coords.lng,
        plusCode: encode(coords.lat, coords.lng, 10),
        label: `Ubicación desde Google Maps`,
        url: finalUrl,
        raw: trimmed
      };
    }

    // Si la URL contiene un plus code
    const plusInUrl = finalUrl.match(/([23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3})/i);
    if (plusInUrl) {
      const pCode = plusInUrl[1].toUpperCase();
      try {
        let full = pCode;
        if (isShortCode(pCode)) {
          full = recoverNearest(pCode, refLat, refLng);
        }
        const decoded = decode(full);
        return {
          success: true,
          type: 'plus_code',
          lat: decoded.latitudeCenter,
          lng: decoded.longitudeCenter,
          plusCode: full,
          label: `Plus Code (${full})`,
          raw: trimmed
        };
      } catch (err) {
        // continuar
      }
    }
  }

  // 3. Detectar si es un Plus Code (ej: "57V5+2X" o "57V53W3M+2X" o "87G83W3M+2X" o "3W3M+2X, Miraflores")
  const plusRegex = /([23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,4})/i;
  const plusMatch = trimmed.match(plusRegex);
  if (plusMatch) {
    const rawPlus = plusMatch[1].toUpperCase();
    try {
      let fullCode = rawPlus;
      if (isShortCode(rawPlus)) {
        fullCode = recoverNearest(rawPlus, refLat, refLng);
      }
      const area = decode(fullCode);
      return {
        success: true,
        type: 'plus_code',
        lat: area.latitudeCenter,
        lng: area.longitudeCenter,
        plusCode: fullCode,
        label: `Plus Code (${fullCode})`,
        raw: trimmed
      };
    } catch (e) {
      // Continuar
    }
  }

  return {
    success: false,
    message: 'No se pudo extraer una ubicación válida. Ingrese un Plus Code, link de Google Maps o coordenadas.',
    raw: trimmed
  };
}

module.exports = {
  isValidCode,
  isFullCode,
  isShortCode,
  encode,
  decode,
  recoverNearest,
  extractCoordsFromMapsUrl,
  resolveRedirectUrl,
  parseLocationInput
};
