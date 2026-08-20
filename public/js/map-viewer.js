/**
 * Dale Delivery - Visor Oficial de Google Maps & Geocodificador de Alta Precisión
 * Google Maps JavaScript API + Places Autocomplete + Geocoder + Traffic
 */

// Coordenadas de Referencia: Lima, Perú (Miraflores / Centro)
const LIMA_COORDS = { lat: -12.046374, lng: -77.042793 };

// Open Location Code (Plus Code) Helper
const OLC_ALPHABET = '23456789CFGHJMPQRVWX';

function olcEncode(latitude, longitude, codeLength = 10) {
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
    code += OLC_ALPHABET.charAt(latDigit) + OLC_ALPHABET.charAt(lngDigit);
    latVal -= latDigit * resolution;
    lngVal -= lngDigit * resolution;
    resolution /= 20.0;
    if (code.length === 8) code += '+';
  }
  if (code.indexOf('+') === -1) code += '+';
  return code;
}

let googleMap = null;
let googleMarker = null;
let googleInfoWindow = null;
let googleGeocoder = null;
let googleAutocomplete = null;
let trafficLayer = null;
let isTrafficVisible = false;

document.addEventListener('DOMContentLoaded', () => {
  setupKeyAndLoadGoogleMaps();
  setupEventListeners();
});

function getActiveApiKey() {
  const inputKey = document.getElementById('google-api-key-input')?.value?.trim();
  const storedKey = localStorage.getItem('google_maps_api_key');
  return inputKey || storedKey || '';
}

function saveAndLoadGoogleMapsKey() {
  const inputEl = document.getElementById('google-api-key-input');
  const key = inputEl ? inputEl.value.trim() : '';

  if (!key) {
    alert('Por favor ingresa una API Key de Google Maps válida.');
    return;
  }

  localStorage.setItem('google_maps_api_key', key);
  loadGoogleMapsScript(key);
}

function setupKeyAndLoadGoogleMaps() {
  const storedKey = localStorage.getItem('google_maps_api_key');
  const inputEl = document.getElementById('google-api-key-input');

  if (storedKey && inputEl && !inputEl.value) {
    inputEl.value = storedKey;
  }

  const activeKey = getActiveApiKey();
  if (activeKey) {
    loadGoogleMapsScript(activeKey);
  } else {
    // Si no hay key aún, inicializar fallback de mapa mientras se ingresa la key
    initFallbackLeaflet();
  }
}

function loadGoogleMapsScript(apiKey) {
  // Ocultar banner si ya tiene key
  const banner = document.getElementById('api-key-banner');
  if (banner && apiKey) {
    banner.style.opacity = '0.7';
  }

  if (window.google && window.google.maps) {
    initGoogleMap();
    return;
  }

  // Eliminar script anterior si existía
  const existing = document.getElementById('google-maps-script');
  if (existing) existing.remove();

  const script = document.createElement('script');
  script.id = 'google-maps-script';
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&callback=initGoogleMap&loading=async`;
  script.async = true;
  script.defer = true;
  script.onerror = () => {
    console.warn('No se pudo cargar Google Maps con la API Key proporcionada. Verifique las restricciones.');
    initFallbackLeaflet();
  };
  document.head.appendChild(script);
}

window.initGoogleMap = function() {
  const container = document.getElementById('google-map-container');
  if (!container) return;

  // Limpiar contenido previo si había fallback
  container.innerHTML = '';
  container.className = '';

  googleMap = new google.maps.Map(container, {
    center: LIMA_COORDS,
    zoom: 14,
    mapTypeControl: true,
    mapTypeControlOptions: {
      style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
      position: google.maps.ControlPosition.TOP_RIGHT
    },
    streetViewControl: true,
    fullscreenControl: true,
    zoomControl: true
  });

  googleGeocoder = new google.maps.Geocoder();
  googleInfoWindow = new google.maps.InfoWindow();
  trafficLayer = new google.maps.TrafficLayer();

  // Inicializar Autocompletado de Lugares de Google en el input de búsqueda
  const searchInput = document.getElementById('location-query-input');
  if (searchInput) {
    googleAutocomplete = new google.maps.places.Autocomplete(searchInput, {
      componentRestrictions: { country: 'pe' }, // Restricción a Perú
      fields: ['address_components', 'geometry', 'icon', 'name', 'formatted_address', 'plus_code']
    });

    googleAutocomplete.addListener('place_changed', () => {
      const place = googleAutocomplete.getPlace();
      if (!place.geometry || !place.geometry.location) {
        // Si el usuario presionó enter con un texto libre o código plus
        handleSearchGoogleLocation(searchInput.value.trim());
        return;
      }

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      const plusCode = (place.plus_code && place.plus_code.global_code) || olcEncode(lat, lng, 10);

      updateActiveLocation({
        lat,
        lng,
        plusCode,
        type: 'Google Places',
        title: place.name || place.formatted_address,
        subtitle: place.formatted_address || 'Ubicación verificada por Google'
      });
    });
  }

  // Clic en el mapa para obtener dirección y Plus Code con Google Geocoder
  googleMap.addListener('click', (e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    const plusCode = olcEncode(lat, lng, 10);

    googleGeocoder.geocode({ location: { lat, lng } }, (results, status) => {
      let title = 'Punto Marcado en Google Maps';
      let subtitle = `Coordenadas: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;

      if (status === 'OK' && results[0]) {
        title = results[0].formatted_address.split(',')[0];
        subtitle = results[0].formatted_address;
      }

      updateActiveLocation({
        lat,
        lng,
        plusCode,
        type: 'Google Maps (Clic)',
        title,
        subtitle
      });
    });
  });

  // Si había una búsqueda inicial
  if (searchInput && searchInput.value.trim()) {
    handleSearchGoogleLocation(searchInput.value.trim());
  }
};

function setupEventListeners() {
  const inputQuery = document.getElementById('location-query-input');
  if (inputQuery) {
    inputQuery.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        triggerSearch();
      }
    });
  }

  const btnPaste = document.getElementById('btn-paste-clipboard');
  if (btnPaste && inputQuery) {
    btnPaste.addEventListener('click', async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const text = await navigator.clipboard.readText();
          if (text && text.trim()) {
            inputQuery.value = text.trim();
            triggerSearch();
          }
        }
      } catch (err) {
        console.warn('Portapapeles:', err);
      }
    });
  }
}

function triggerSearch() {
  const inputQuery = document.getElementById('location-query-input');
  if (inputQuery) {
    handleSearchGoogleLocation(inputQuery.value.trim());
  }
}

function toggleTrafficLayer() {
  if (!googleMap || !trafficLayer) return;

  isTrafficVisible = !isTrafficVisible;
  const btn = document.getElementById('btn-toggle-traffic');

  if (isTrafficVisible) {
    trafficLayer.setMap(googleMap);
    if (btn) {
      btn.style.background = '#FEF3C7';
      btn.style.color = '#92400E';
      btn.style.borderColor = '#FDE68A';
    }
  } else {
    trafficLayer.setMap(null);
    if (btn) {
      btn.style.background = '';
      btn.style.color = '';
      btn.style.borderColor = '';
    }
  }
}

function centerOnLima() {
  if (googleMap) {
    googleMap.panTo(LIMA_COORDS);
    googleMap.setZoom(14);
  }
}

function locateUserGPS() {
  if (!navigator.geolocation) {
    alert('Tu navegador no soporta geolocalización GPS.');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const plusCode = olcEncode(lat, lng, 10);

      updateActiveLocation({
        lat,
        lng,
        plusCode,
        type: 'GPS del Navegador',
        title: 'Tu Ubicación Actual',
        subtitle: `Precisión: ±${Math.round(pos.coords.accuracy)} metros`
      });
    },
    (err) => {
      alert('No se pudo obtener tu ubicación GPS: ' + err.message);
    }
  );
}

function setQuickInput(val) {
  const inputEl = document.getElementById('location-query-input');
  if (inputEl) {
    inputEl.value = val;
    triggerSearch();
  }
}

async function handleSearchGoogleLocation(queryStr) {
  if (!queryStr || !queryStr.trim()) {
    alert('Por favor ingresa una dirección, Código Plus o link de Google Maps.');
    return;
  }

  const trimmed = queryStr.trim();
  const btnSearch = document.getElementById('btn-search-locate');
  if (btnSearch) {
    btnSearch.disabled = true;
    btnSearch.innerHTML = '<span>Buscando en Google...</span>';
  }

  try {
    // 1. Coordenadas directas
    const coordRegex = /^(-?\d{1,2}\.\d+)[,\s]+(-?\d{1,3}\.\d+)$/;
    const coordMatch = trimmed.match(coordRegex);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      const plusCode = olcEncode(lat, lng, 10);
      updateActiveLocation({
        lat,
        lng,
        plusCode,
        type: 'Coordenadas',
        title: `Coordenadas (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
        subtitle: 'Ubicación precisa en Google Maps'
      });
      return;
    }

    // 2. Si es un Link de Google Maps, resolver primero con el backend
    if (trimmed.includes('goo.gl') || trimmed.includes('maps.app') || trimmed.includes('maps.google')) {
      const res = await fetch('/api/map/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: trimmed, refLat: LIMA_COORDS.lat, refLng: LIMA_COORDS.lng })
      });
      const data = await res.json();
      if (data.success && typeof data.lat === 'number' && typeof data.lng === 'number') {
        updateActiveLocation({
          lat: data.lat,
          lng: data.lng,
          plusCode: data.plusCode || olcEncode(data.lat, data.lng, 10),
          type: 'Link de Google Maps',
          title: data.label || 'Ubicación de Enlace',
          subtitle: data.url || 'Enlace de Maps resuelto'
        });
        return;
      }
    }

    // 3. Usar Google Geocoder Oficial
    if (googleGeocoder) {
      const geocodeQuery = trimmed.includes('Lima') || trimmed.includes('Peru') || trimmed.includes('+') ? trimmed : `${trimmed}, Lima, Peru`;
      
      googleGeocoder.geocode({ address: geocodeQuery }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const loc = results[0].geometry.location;
          const lat = loc.lat();
          const lng = loc.lng();
          const plusCode = (results[0].plus_code && results[0].plus_code.global_code) || olcEncode(lat, lng, 10);

          updateActiveLocation({
            lat,
            lng,
            plusCode,
            type: results[0].types ? results[0].types[0] : 'Google Geocoder',
            title: results[0].formatted_address.split(',')[0],
            subtitle: results[0].formatted_address
          });
        } else {
          // Fallback backend
          resolveBackendFallback(trimmed);
        }
      });
    } else {
      resolveBackendFallback(trimmed);
    }
  } catch (err) {
    console.error('Error al geocodificar:', err);
    resolveBackendFallback(trimmed);
  } finally {
    if (btnSearch) {
      btnSearch.disabled = false;
      btnSearch.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
        </svg>
        <span>Ubicar con Google Maps</span>
      `;
    }
  }
}

async function resolveBackendFallback(inputStr) {
  try {
    const res = await fetch('/api/map/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: inputStr, refLat: LIMA_COORDS.lat, refLng: LIMA_COORDS.lng })
    });
    const data = await res.json();
    if (data.success) {
      updateActiveLocation({
        lat: data.lat,
        lng: data.lng,
        plusCode: data.plusCode,
        type: data.type,
        title: data.label,
        subtitle: 'Ubicación decodificada'
      });
    } else {
      alert('Google Maps no pudo encontrar la dirección especificada. Intenta ser más específico o ingresa el Código Plus.');
    }
  } catch (e) {
    alert('Error al buscar ubicación: ' + e.message);
  }
}

function updateActiveLocation({ lat, lng, plusCode, type, title, subtitle }) {
  // Cambiar a pestaña de ubicación en el panel lateral
  switchSidebarTab('location');

  const latLng = { lat, lng };

  if (googleMap) {
    googleMap.panTo(latLng);
    googleMap.setZoom(17);

    if (googleMarker) {
      googleMarker.setMap(null);
    }

    googleMarker = new google.maps.Marker({
      position: latLng,
      map: googleMap,
      animation: google.maps.Animation.DROP,
      title: title
    });

    const infoContent = `
      <div style="font-family: inherit; padding: 4px; max-width: 240px;">
        <div style="font-weight: 800; font-size: 14px; color: #FF5A00; margin-bottom: 2px;">${title}</div>
        <div style="font-size: 12px; color: #475569; margin-bottom: 6px;">${subtitle || ''}</div>
        <div style="font-size: 11px; background: #F8FAFC; padding: 4px; border-radius: 4px; font-family: monospace; margin-bottom: 8px;">
          📍 Plus: <strong>${plusCode || 'N/D'}</strong><br>
          🌐 Coords: ${lat.toFixed(5)}, ${lng.toFixed(5)}
        </div>
        <div style="display: flex; gap: 4px;">
          <a href="https://www.google.com/maps/search/?api=1&query=${lat},${lng}" target="_blank" style="flex: 1; text-align: center; background: #10B981; color: white; padding: 5px 6px; border-radius: 4px; font-size: 11px; text-decoration: none; font-weight: 600;">Google Maps</a>
          <a href="https://waze.com/ul?ll=${lat},${lng}&navigate=yes" target="_blank" style="flex: 1; text-align: center; background: #0284C7; color: white; padding: 5px 6px; border-radius: 4px; font-size: 11px; text-decoration: none; font-weight: 600;">Waze</a>
        </div>
      </div>
    `;

    googleInfoWindow.setContent(infoContent);
    googleInfoWindow.open(googleMap, googleMarker);

    googleMarker.addListener('click', () => {
      googleInfoWindow.open(googleMap, googleMarker);
    });
  }

  // Actualizar Panel Lateral
  const emptyState = document.getElementById('location-empty-state');
  const infoPanel = document.getElementById('location-info-panel');
  if (emptyState) emptyState.style.display = 'none';
  if (infoPanel) infoPanel.style.display = 'block';

  const typeBadge = document.getElementById('loc-type-badge');
  const titleEl = document.getElementById('loc-title');
  const subEl = document.getElementById('loc-subtitle');
  const coordsEl = document.getElementById('loc-coords-text');
  const plusEl = document.getElementById('loc-pluscode-text');

  if (typeBadge) typeBadge.innerText = '📍 ' + (type || 'UBICACIÓN').toUpperCase();
  if (titleEl) titleEl.innerText = title;
  if (subEl) subEl.innerText = subtitle || '';
  if (coordsEl) coordsEl.innerText = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  if (plusEl) plusEl.innerText = plusCode || 'N/D';

  // Botones de acción externa
  const gmapsBtn = document.getElementById('btn-open-gmaps');
  const wazeBtn = document.getElementById('btn-open-waze');
  const waBtn = document.getElementById('btn-share-whatsapp');

  if (gmapsBtn) gmapsBtn.href = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  if (wazeBtn) wazeBtn.href = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  if (waBtn) {
    const waText = encodeURIComponent(`📍 Destino Dale Delivery:\n📌 ${title}\n🌐 Coordenadas: ${lat.toFixed(6)}, ${lng.toFixed(6)}\n🧭 Google Maps: https://www.google.com/maps/search/?api=1&query=${lat},${lng}\n🚗 Waze: https://waze.com/ul?ll=${lat},${lng}&navigate=yes`);
    waBtn.href = `https://wa.me/?text=${waText}`;
  }
}

function switchSidebarTab(tabName) {
  const tabLocation = document.getElementById('tab-content-location');
  const tabShipments = document.getElementById('tab-content-shipments');
  const btnLocation = document.getElementById('tab-btn-location');
  const btnShipments = document.getElementById('tab-btn-shipments');

  if (tabName === 'location') {
    if (tabLocation) tabLocation.style.display = 'block';
    if (tabShipments) tabShipments.style.display = 'none';
    if (btnLocation) btnLocation.classList.add('active');
    if (btnShipments) btnShipments.classList.remove('active');
  } else {
    if (tabLocation) tabLocation.style.display = 'none';
    if (tabShipments) tabShipments.style.display = 'block';
    if (btnLocation) btnLocation.classList.remove('active');
    if (btnShipments) btnShipments.classList.add('active');
  }
}

function filterShipmentsList() {
  const query = (document.getElementById('shipment-filter-box')?.value || '').toLowerCase().trim();
  const items = document.querySelectorAll('.shipment-item-card');

  items.forEach(card => {
    const code = (card.getAttribute('data-code') || '').toLowerCase();
    const dest = (card.getAttribute('data-dest') || '').toLowerCase();
    const addr = (card.getAttribute('data-addr') || '').toLowerCase();
    const dist = (card.getAttribute('data-dist') || '').toLowerCase();

    if (code.includes(query) || dest.includes(query) || addr.includes(query) || dist.includes(query)) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
}

function selectShipmentFromList(cardEl) {
  document.querySelectorAll('.shipment-item-card').forEach(c => c.classList.remove('active'));
  cardEl.classList.add('active');

  const addr = cardEl.getAttribute('data-addr');
  const dist = cardEl.getAttribute('data-dist');
  const plus = cardEl.getAttribute('data-plus');
  const maps = cardEl.getAttribute('data-maps');

  const inputEl = document.getElementById('location-query-input');

  if (plus && plus.trim()) {
    if (inputEl) inputEl.value = plus.trim();
    handleSearchGoogleLocation(plus.trim());
  } else if (maps && maps.trim()) {
    if (inputEl) inputEl.value = maps.trim();
    handleSearchGoogleLocation(maps.trim());
  } else {
    const fullAddr = `${addr}, ${dist}, Lima, Peru`;
    if (inputEl) inputEl.value = fullAddr;
    handleSearchGoogleLocation(fullAddr);
  }
}

function copyToClipboard(text, successMsg = 'Copiado al portapapeles') {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      alert(successMsg);
    }).catch(() => {
      prompt('Copia este valor:', text);
    });
  } else {
    prompt('Copia este valor:', text);
  }
}

function initFallbackLeaflet() {
  const container = document.getElementById('google-map-container');
  if (!container || window.google) return;

  // Si aún no hay API Key de Google Maps, renderizar un mensaje claro con botón
  container.innerHTML = `
    <div style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #F8FAFC; color: #475569; padding: 24px; text-align: center;">
      <div style="width: 64px; height: 64px; background: #FFF7ED; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; border: 2px solid #FFEDD5;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FF5A00" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
      </div>
      <h3 style="font-size: 18px; font-weight: 800; color: #0F172A; margin-bottom: 8px;">Conecta tu Google Maps API Key</h3>
      <p style="font-size: 14px; max-width: 480px; line-height: 1.5; margin-bottom: 16px;">
        Pega tu API Key de Google Cloud en el campo superior o en tu archivo <code>.env</code> como <code>GOOGLE_MAPS_API_KEY=tu_clave</code> para activar el mapa satelital, autocompletado y cálculo de tráfico en tiempo real.
      </p>
      <div style="font-size: 12px; background: #EFF6FF; border: 1px solid #BFDBFE; color: #1E40AF; padding: 8px 16px; border-radius: 8px; font-weight: 600;">
        💡 Recuerda: Google te regala $200 USD mensuales gratis (~28,000 cargas de mapa al mes).
      </div>
    </div>
  `;
}
