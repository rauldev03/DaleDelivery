/**
 * Dale Delivery - Route Optimizer Engine
 * Google Maps Integration, Drag & Drop Assignment, Multi-driver Routing & TSP Rendering
 */

const LIMA_COORDS = { lat: -12.046374, lng: -77.042793 };
const DRIVER_COLORS = [
  '#2563EB', // Azul
  '#DC2626', // Rojo
  '#16A34A', // Verde
  '#9333EA', // Púrpura
  '#EA580C', // Naranja
  '#0891B2', // Cian
  '#DB2777', // Rosa
  '#4F46E5', // Índigo
  '#CA8A04'  // Ámbar
];

let gMap = null;
let markers = [];
let routePolylines = [];
let directionsRenderers = [];
let currentDraggedShipmentId = null;
let driversData = [];
let shipmentsData = [];
let driverColorMap = {};

document.addEventListener('DOMContentLoaded', () => {
  initApiKeyStatus();
  loadGoogleMapsScript();
  fetchInitialData();
});

// --- 1. MANEJO DE API KEY ---

function getStoredApiKey() {
  return localStorage.getItem('google_maps_api_key') || window.SERVER_GOOGLE_MAPS_KEY || '';
}

function initApiKeyStatus() {
  const activeKey = getStoredApiKey();
  const labelEl = document.getElementById('apikey-btn-label');
  const inputEl = document.getElementById('google-maps-apikey-input');

  if (activeKey) {
    if (labelEl) labelEl.textContent = 'API Key Activa ✓';
    if (inputEl) inputEl.value = activeKey;
  }
}

function openApiKeyModal() {
  const modal = document.getElementById('modal-apikey');
  if (modal) modal.classList.add('show');
}

function closeApiKeyModal() {
  const modal = document.getElementById('modal-apikey');
  if (modal) modal.classList.remove('show');
}

function saveGoogleMapsApiKey() {
  const input = document.getElementById('google-maps-apikey-input');
  const key = input ? input.value.trim() : '';

  if (!key) {
    alert('Por favor ingresa una API Key de Google Maps válida.');
    return;
  }

  localStorage.setItem('google_maps_api_key', key);
  closeApiKeyModal();
  initApiKeyStatus();
  loadGoogleMapsScript(true);
}

function loadGoogleMapsScript(forceReload = false) {
  const apiKey = getStoredApiKey();
  if (!apiKey) {
    initFallbackMapUI('Para habilitar el mapa satelital y cálculo de rutas, presiona el botón "🔑 API Key Google Maps" en la barra superior.');
    return;
  }

  if (window.google && window.google.maps && !forceReload) {
    initGoogleMap();
    return;
  }

  // Si ya existía un script, removerlo
  const oldScript = document.getElementById('google-maps-script-tag');
  if (oldScript) oldScript.remove();

  const script = document.createElement('script');
  script.id = 'google-maps-script-tag';
  script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places,geometry&callback=initGoogleMap`;
  script.async = true;
  script.defer = true;
  script.onerror = () => {
    initFallbackMapUI('No se pudo conectar con Google Maps. Verifica tu API Key.');
  };
  document.head.appendChild(script);
}

function initGoogleMap() {
  const mapContainer = document.getElementById('google-map-optimizer');
  if (!mapContainer) return;

  try {
    gMap = new google.maps.Map(mapContainer, {
      center: LIMA_COORDS,
      zoom: 12,
      mapTypeId: 'roadmap',
      mapTypeControl: true,
      fullscreenControl: true,
      streetViewControl: false,
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }
      ]
    });

    renderMapData();
  } catch (err) {
    console.error('Error al inicializar Google Maps:', err);
    initFallbackMapUI('Error al inicializar mapa con la clave proporcionada.');
  }
}

function initFallbackMapUI(message) {
  const container = document.getElementById('google-map-optimizer');
  if (!container) return;

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #94A3B8; text-align: center; padding: 20px; background: #0F172A;">
      <div style="font-size: 3rem; margin-bottom: 12px;">🗺️</div>
      <h3 style="color: #F8FAFC; margin-bottom: 8px;">Visor de Rutas Operativo</h3>
      <p style="max-width: 420px; font-size: 0.88rem; line-height: 1.5; margin-bottom: 16px;">${message}</p>
      <button type="button" class="btn-primary-gradient" onclick="openApiKeyModal()">
        🔑 Configurar Google Maps API Key
      </button>
    </div>
  `;
}

// --- 2. CARGA DE DATOS Y RENDERIZADO DE MAPA ---

async function fetchInitialData() {
  try {
    const [resDrivers, resShipments] = await Promise.all([
      fetch('/api/rutas/conductores').then(r => r.json()),
      fetch('/api/rutas/envios').then(r => r.json())
    ]);

    if (resDrivers.success) {
      driversData = resDrivers.drivers || [];
      assignDriverColors();
      updateLegendUI();
    }

    if (resShipments.success) {
      shipmentsData = resShipments.shipments || [];
    }

    if (gMap) {
      renderMapData();
    }
  } catch (error) {
    console.error('Error al cargar datos iniciales:', error);
  }
}

function assignDriverColors() {
  driverColorMap = {};
  driversData.forEach((driver, idx) => {
    driverColorMap[driver.id] = DRIVER_COLORS[idx % DRIVER_COLORS.length];
  });
}

function updateLegendUI() {
  const legendList = document.getElementById('legend-drivers-list');
  if (!legendList) return;

  if (driversData.length === 0) {
    legendList.innerHTML = '<span style="color: var(--text-muted);">Sin conductores registrados</span>';
    return;
  }

  legendList.innerHTML = driversData.map(d => {
    const color = driverColorMap[d.id] || '#3B82F6';
    const count = (d.shipments || []).length;
    return `
      <div class="legend-driver-row">
        <span class="legend-color-dot" style="background: ${color};"></span>
        <span style="font-weight: 600;">${d.nombreCompleto || d.nombre}</span>
        <span style="color: rgba(255,255,255,0.6); font-size: 0.72rem;">(${count} envíos)</span>
      </div>
    `;
  }).join('');
}

function clearMapOverlays() {
  markers.forEach(m => m.setMap(null));
  markers = [];

  routePolylines.forEach(p => p.setMap(null));
  routePolylines = [];

  directionsRenderers.forEach(dr => dr.setMap(null));
  directionsRenderers = [];
}

function renderMapData(selectedDriverId = 'ALL') {
  if (!gMap || !window.google || !window.google.maps) return;

  clearMapOverlays();

  const bounds = new google.maps.LatLngBounds();
  let hasValidCoords = false;

  // Filtrar envíos según conductor seleccionado
  const filteredShipments = shipmentsData.filter(s => {
    if (!s.conductorId) return false;
    if (selectedDriverId !== 'ALL' && String(s.conductorId) !== String(selectedDriverId)) return false;
    return true;
  });

  // Agrupar envíos por conductor para trazar rutas
  const shipmentsByDriver = {};

  filteredShipments.forEach(s => {
    if (!shipmentsByDriver[s.conductorId]) {
      shipmentsByDriver[s.conductorId] = [];
    }
    shipmentsByDriver[s.conductorId].push(s);

    if (s.latitud && s.longitud) {
      hasValidCoords = true;
      const pos = { lat: parseFloat(s.latitud), lng: parseFloat(s.longitud) };
      bounds.extend(pos);

      const color = driverColorMap[s.conductorId] || '#3B82F6';
      const stopNumber = s.ordenRuta && s.ordenRuta > 0 ? String(s.ordenRuta) : '•';

      // Crear marcador personalizado numerado
      const marker = createCustomMarker(pos, stopNumber, color, s);
      markers.push(marker);
    }
  });

  // Dibujar rutas reales por carretera/calles para cada conductor
  Object.keys(shipmentsByDriver).forEach(driverId => {
    const dShipments = shipmentsByDriver[driverId].sort((a, b) => {
      const orderA = a.ordenRuta > 0 ? a.ordenRuta : 9999;
      const orderB = b.ordenRuta > 0 ? b.ordenRuta : 9999;
      return orderA - orderB;
    });

    const color = driverColorMap[driverId] || '#3B82F6';
    drawRoadRouteForDriver(driverId, dShipments, color);
  });

  if (hasValidCoords) {
    gMap.fitBounds(bounds);
    if (filteredShipments.length === 1) {
      gMap.setZoom(15);
    }
  } else {
    gMap.setCenter(LIMA_COORDS);
    gMap.setZoom(12);
  }
}

function drawRoadRouteForDriver(driverId, dShipments, color) {
  const pathCoords = dShipments
    .filter(s => s.latitud && s.longitud)
    .map(s => ({ lat: parseFloat(s.latitud), lng: parseFloat(s.longitud) }));

  if (pathCoords.length < 2) return;

  // Si Google DirectionsService está disponible
  if (window.google && window.google.maps && google.maps.DirectionsService) {
    const directionsService = new google.maps.DirectionsService();

    const origin = pathCoords[0];
    const destination = pathCoords[pathCoords.length - 1];
    
    // Google Directions API admite hasta 23 waypoints intermedios por solicitud
    const waypoints = pathCoords.slice(1, -1).slice(0, 23).map(coord => ({
      location: new google.maps.LatLng(coord.lat, coord.lng),
      stopover: true
    }));

    const request = {
      origin: new google.maps.LatLng(origin.lat, origin.lng),
      destination: new google.maps.LatLng(destination.lat, destination.lng),
      waypoints: waypoints,
      travelMode: google.maps.TravelMode.DRIVING,
      optimizeWaypoints: false // Respetar el orden optimizado de paradas
    };

    directionsService.route(request, (response, status) => {
      if (status === google.maps.DirectionsStatus.OK && response.routes && response.routes[0]) {
        // Trazar el camino real por pistas/calles con overview_path
        const overviewPath = response.routes[0].overview_path;

        // Borde oscuro exterior para realce visual de ruta GPS
        const outlinePolyline = new google.maps.Polyline({
          path: overviewPath,
          geodesic: true,
          strokeColor: '#0F172A',
          strokeOpacity: 0.45,
          strokeWeight: 7,
          map: gMap
        });
        routePolylines.push(outlinePolyline);

        // Línea principal de color distintivo del conductor
        const mainPolyline = new google.maps.Polyline({
          path: overviewPath,
          geodesic: true,
          strokeColor: color,
          strokeOpacity: 0.95,
          strokeWeight: 4,
          map: gMap
        });
        routePolylines.push(mainPolyline);
      } else {
        // Fallback a línea directa si la API de Directions no estuviese habilitada en la key
        drawFallbackPolyline(pathCoords, color);
      }
    });
  } else {
    drawFallbackPolyline(pathCoords, color);
  }
}

function drawFallbackPolyline(pathCoords, color) {
  const polyline = new google.maps.Polyline({
    path: pathCoords,
    geodesic: true,
    strokeColor: color,
    strokeOpacity: 0.85,
    strokeWeight: 4,
    map: gMap
  });
  routePolylines.push(polyline);
}

function createCustomMarker(position, labelText, color, shipment) {
  // Generar icono SVG numerado dinámicamente
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44">
      <path d="M17 0C7.6 0 0 7.6 0 17C0 29.8 17 44 17 44S34 29.8 34 17C34 7.6 26.4 0 17 0Z" fill="${color}" stroke="#FFFFFF" stroke-width="2"/>
      <circle cx="17" cy="16" r="11" fill="#FFFFFF"/>
      <text x="17" y="21" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="${color}" text-anchor="middle">${labelText}</text>
    </svg>
  `;

  const marker = new google.maps.Marker({
    position,
    map: gMap,
    title: `${shipment.codigoEnvio} - ${shipment.destinatarioNombre}`,
    icon: {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgIcon),
      scaledSize: new google.maps.Size(34, 44),
      anchor: new google.maps.Point(17, 44)
    }
  });

  const infoWindow = new google.maps.InfoWindow({
    content: `
      <div style="font-family: sans-serif; padding: 6px; max-width: 240px; color: #1E293B;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <strong style="color: ${color}; font-size: 13px;">${shipment.codigoEnvio}</strong>
          <span style="font-size: 11px; background: #E2E8F0; padding: 2px 6px; border-radius: 4px;">Parada #${labelText}</span>
        </div>
        <div style="font-weight: 600; font-size: 13px;">${shipment.destinatarioNombre}</div>
        <div style="font-size: 12px; color: #64748B; margin: 2px 0;">${shipment.direccion}, ${shipment.distrito}</div>
        <div style="font-size: 11px; margin-top: 4px; padding-top: 4px; border-top: 1px solid #E2E8F0;">
          <strong>Conductor:</strong> ${shipment.conductorNombre || 'Asignado'}<br>
          <strong>Prioridad:</strong> ${shipment.prioridad} | <strong>Estado:</strong> ${shipment.estado}
        </div>
      </div>
    `
  });

  marker.addListener('click', () => {
    infoWindow.open(gMap, marker);
  });

  return marker;
}

function filterMapByDriver(driverId) {
  renderMapData(driverId);
}

function focusShipmentOnMap(id, lat, lng) {
  if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
    alert('Este envío no tiene coordenadas geográficas registradas todavía.');
    return;
  }

  if (gMap) {
    const pos = { lat: parseFloat(lat), lng: parseFloat(lng) };
    gMap.panTo(pos);
    gMap.setZoom(16);

    const targetMarker = markers.find(m => m.getPosition().lat() === pos.lat && m.getPosition().lng() === pos.lng);
    if (targetMarker) {
      google.maps.event.trigger(targetMarker, 'click');
    }
  }
}

// --- 3. OPTIMIZACIÓN DE RUTAS (BOTÓN PRINCIPAL) ---

async function runRouteOptimization() {
  const btn = document.getElementById('btn-optimize-routes');
  const originalText = btn.innerHTML;

  try {
    btn.disabled = true;
    btn.innerHTML = '<span>⏳ Optimizando...</span>';

    const response = await fetch('/api/rutas/optimizar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    const data = await response.json();

    if (!data.success) {
      alert('Error al optimizar rutas: ' + (data.message || 'Error desconocido'));
      return;
    }

    // Refrescar datos y mapa
    await fetchInitialData();
    updateOperationalTable();

    // Mensaje de éxito con resumen
    const totalStops = data.results.reduce((acc, r) => acc + r.totalShipments, 0);
    const totalDist = data.results.reduce((acc, r) => acc + r.totalDistanceKm, 0).toFixed(1);
    
    alert(`✅ ¡Rutas optimizadas con éxito!\n\n• Conductores procesados: ${data.results.length}\n• Paradas ordenadas: ${totalStops}\n• Distancia estimada total: ${totalDist} km`);
  } catch (error) {
    console.error('Error al ejecutar optimización:', error);
    alert('Ocurrió un error de red al optimizar rutas.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

// --- 4. DRAG & DROP Y ASIGNACIÓN DE ENVÍOS ---

function handleDragStart(event, shipmentId) {
  currentDraggedShipmentId = shipmentId;
  event.dataTransfer.setData('text/plain', shipmentId);
}

function handleDragOver(event) {
  event.preventDefault();
  const card = event.currentTarget;
  card.classList.add('drag-over');
}

function handleDragLeave(event) {
  const card = event.currentTarget;
  card.classList.remove('drag-over');
}

async function handleDrop(event, driverId) {
  event.preventDefault();
  const card = event.currentTarget;
  card.classList.remove('drag-over');

  const shipmentId = currentDraggedShipmentId || event.dataTransfer.getData('text/plain');
  if (!shipmentId) return;

  await assignShipmentToDriver(shipmentId, driverId);
}

async function assignShipmentDirectly(shipmentId, driverId) {
  if (!driverId) return;
  await assignShipmentToDriver(shipmentId, driverId);
}

async function assignShipmentToDriver(shipmentId, driverId) {
  try {
    const response = await fetch('/api/rutas/asignar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shipmentId, driverId })
    });

    const res = await response.json();
    if (!res.success) {
      alert('No se pudo asignar el envío: ' + (res.message || 'Error'));
      return;
    }

    // Actualizar datos
    await fetchInitialData();
    updateOperationalTable();
    updateSidebarLists();
  } catch (err) {
    console.error('Error al asignar:', err);
  }
}

async function unassignShipment(shipmentId) {
  if (!confirm('¿Deseas desasignar este envío del conductor?')) return;

  try {
    const response = await fetch('/api/rutas/desasignar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shipmentId })
    });

    const res = await response.json();
    if (!res.success) {
      alert('Error al desasignar: ' + (res.message || ''));
      return;
    }

    await fetchInitialData();
    updateOperationalTable();
    updateSidebarLists();
  } catch (err) {
    console.error('Error al desasignar:', err);
  }
}

async function handleTableDriverChange(shipmentId, driverId) {
  if (!driverId) {
    await unassignShipment(shipmentId);
  } else {
    await assignShipmentToDriver(shipmentId, driverId);
  }
}

// --- 5. ACTUALIZACIÓN DINÁMICA DE LA UI ---

function updateSidebarLists() {
  // Actualizar conteo de conductores y no asignados
  const unassigned = shipmentsData.filter(s => !s.conductorId);
  const countUnassigned = document.getElementById('count-unassigned');
  if (countUnassigned) countUnassigned.textContent = unassigned.length;

  const countDrivers = document.getElementById('count-drivers');
  if (countDrivers) countDrivers.textContent = driversData.length;

  // Reconstruir lista de no asignados
  const unassignedContainer = document.getElementById('unassigned-list-container');
  if (unassignedContainer) {
    if (unassigned.length === 0) {
      unassignedContainer.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.85rem;">🎉 No hay envíos pendientes por asignar.</div>';
    } else {
      unassignedContainer.innerHTML = unassigned.map(s => `
        <div class="pending-shipment-card" id="unassigned-card-${s.id}" draggable="true" ondragstart="handleDragStart(event, ${s.id})">
          <div class="pending-shipment-header">
            <span style="color: var(--primary);">${s.codigoEnvio}</span>
            <span class="badge ${s.prioridad === 'Alta' ? 'badge-danger' : 'badge-info'}" style="font-size: 0.68rem;">${s.prioridad}</span>
          </div>
          <div style="font-weight: 600; font-size: 0.82rem; margin: 2px 0; color: var(--text-main);">${s.destinatarioNombre}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${s.direccion} - <strong>${s.distrito}</strong></div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
            <span style="font-size: 0.7rem; color: var(--text-muted);">${s.peso} kg</span>
            <select class="form-control-custom" style="padding: 2px 6px; font-size: 0.75rem; width: auto;" onchange="assignShipmentDirectly(${s.id}, this.value)">
              <option value="">Asignar a...</option>
              ${driversData.map(d => `<option value="${d.id}">${d.nombreCompleto || d.nombre}</option>`).join('')}
            </select>
          </div>
        </div>
      `).join('');
    }
  }

  // Reconstruir pills de conductores
  driversData.forEach(d => {
    const dShipments = shipmentsData.filter(s => s.conductorId === d.id);
    const pillsContainer = document.getElementById(`driver-pills-${d.id}`);
    const badgeCount = document.querySelector(`#driver-badge-${d.id} .shipment-count`);

    if (badgeCount) badgeCount.textContent = dShipments.length;

    if (pillsContainer) {
      if (dShipments.length === 0) {
        pillsContainer.innerHTML = '<span style="font-size: 0.72rem; color: var(--text-muted); font-style: italic;">Arrastra envíos aquí o usa el botón asignar</span>';
      } else {
        pillsContainer.innerHTML = dShipments.map(s => `
          <div class="shipment-pill" id="pill-${s.id}" title="${s.destinatarioNombre} - ${s.distrito}">
            ${s.ordenRuta > 0 ? `<strong>#${s.ordenRuta}</strong>` : ''}
            <span>${s.codigoEnvio}</span>
            <span class="pill-remove" onclick="unassignShipment(${s.id})" title="Quitar asignación">&times;</span>
          </div>
        `).join('');
      }
    }
  });
}

function updateOperationalTable() {
  const tbody = document.getElementById('shipments-table-body');
  if (!tbody) return;

  if (shipmentsData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 20px; color: var(--text-muted);">No hay envíos registrados.</td></tr>';
    return;
  }

  tbody.innerHTML = shipmentsData.map(s => {
    const stopBadge = s.ordenRuta > 0 ? `<span class="badge-stop-order">${s.ordenRuta}</span>` : `<span style="color: var(--text-muted);">-</span>`;
    const priorityBadgeClass = s.prioridad === 'Alta' ? 'badge-danger' : (s.prioridad === 'Baja' ? 'badge-secondary' : 'badge-info');
    const statusBadgeClass = s.estado === 'Entregado' ? 'badge-success' : (s.estado === 'En ruta' || s.estado === 'En proceso' ? 'badge-warning' : (s.estado === 'Asignado' ? 'badge-info' : 'badge-secondary'));

    return `
      <tr id="row-shipment-${s.id}" data-status="${s.estado}" data-driver-id="${s.conductorId || ''}" data-code="${s.codigoEnvio}" data-client="${s.clienteNombre || ''}" data-dest="${s.destinatarioNombre}" data-dist="${s.distrito}">
        <td>${stopBadge}</td>
        <td><strong style="color: var(--primary);">${s.codigoEnvio}</strong></td>
        <td>${s.clienteNombre || 'S/C'}</td>
        <td>
          <div style="font-weight: 600;">${s.destinatarioNombre}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${s.destinatarioTelefono || ''}</div>
        </td>
        <td>
          <div>${s.direccion}</div>
          <small style="color: var(--text-muted); font-weight: 600;">${s.distrito}</small>
        </td>
        <td>
          <select class="form-control-custom" style="padding: 4px 8px; font-size: 0.8rem; min-width: 150px;" onchange="handleTableDriverChange(${s.id}, this.value)">
            <option value="">-- Sin Conductor --</option>
            ${driversData.map(d => `<option value="${d.id}" ${s.conductorId === d.id ? 'selected' : ''}>${d.vehiculoIcon || '🚗'} ${d.nombreCompleto || d.nombre}</option>`).join('')}
          </select>
        </td>
        <td><span class="badge ${priorityBadgeClass}">${s.prioridad}</span></td>
        <td><span class="badge ${statusBadgeClass}">${s.estado}</span></td>
        <td>${s.peso} kg</td>
        <td style="text-align: right; white-space: nowrap;">
          <button class="btn-secondary-custom" style="padding: 4px 8px; font-size: 0.75rem;" title="Centrar en Mapa" onclick="focusShipmentOnMap(${s.id}, ${s.latitud}, ${s.longitud})">
            📍 Ver
          </button>
          ${s.conductorId ? `<button class="btn-secondary-custom" style="padding: 4px 8px; font-size: 0.75rem; color: #EF4444;" title="Quitar asignación" onclick="unassignShipment(${s.id})">✖</button>` : ''}
        </td>
      </tr>
    `;
  }).join('');
}

// --- 6. FILTROS Y BÚSQUEDAS EN TABLA ---

function filterShipmentsTable() {
  const query = (document.getElementById('shipment-table-search')?.value || '').toLowerCase();
  const activePill = document.querySelector('.filter-pill-btn.active')?.getAttribute('data-filter') || 'ALL';
  const rows = document.querySelectorAll('#shipments-table-body tr');

  rows.forEach(row => {
    const code = (row.getAttribute('data-code') || '').toLowerCase();
    const client = (row.getAttribute('data-client') || '').toLowerCase();
    const dest = (row.getAttribute('data-dest') || '').toLowerCase();
    const dist = (row.getAttribute('data-dist') || '').toLowerCase();
    const status = (row.getAttribute('data-status') || '').toUpperCase();
    const driverId = row.getAttribute('data-driver-id');

    const matchText = code.includes(query) || client.includes(query) || dest.includes(query) || dist.includes(query);
    
    let matchPill = true;
    if (activePill === 'PENDIENTE') matchPill = !driverId || status === 'REGISTRADO' || status === 'PENDIENTE';
    else if (activePill === 'ASIGNADO') matchPill = !!driverId && status === 'ASIGNADO';
    else if (activePill === 'EN_RUTA') matchPill = status === 'EN RUTA' || status === 'EN PROCESO';
    else if (activePill === 'ENTREGADO') matchPill = status === 'ENTREGADO';

    row.style.display = (matchText && matchPill) ? '' : 'none';
  });
}

function setTableFilter(filter) {
  document.querySelectorAll('.filter-pill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-filter') === filter);
  });
  filterShipmentsTable();
}

function switchSidebarTab(tab) {
  document.getElementById('tab-btn-drivers').classList.toggle('active', tab === 'drivers');
  document.getElementById('tab-btn-unassigned').classList.toggle('active', tab === 'unassigned');
  document.getElementById('tab-body-drivers').style.display = tab === 'drivers' ? 'flex' : 'none';
  document.getElementById('tab-body-unassigned').style.display = tab === 'unassigned' ? 'flex' : 'none';
}

// --- 7. MODALES CRUD CONDUCTOR & ENVÍO ---

function openNewDriverModal() {
  document.getElementById('form-driver').reset();
  document.getElementById('driver-id').value = '';
  document.getElementById('modal-driver-title').textContent = '+ Nuevo Conductor';
  document.getElementById('modal-driver').classList.add('show');
}

function closeDriverModal() {
  document.getElementById('modal-driver').classList.remove('show');
}

async function editDriver(driverId) {
  const driver = driversData.find(d => d.id === driverId);
  if (!driver) return;

  document.getElementById('driver-id').value = driver.id;
  document.getElementById('driver-nombre').value = driver.nombre;
  document.getElementById('driver-apellidos').value = driver.apellidos || '';
  document.getElementById('driver-documento').value = driver.documento;
  document.getElementById('driver-telefono').value = driver.telefono || '';
  document.getElementById('driver-vehiculo').value = driver.vehiculo;
  document.getElementById('driver-placa').value = driver.placa || '';
  document.getElementById('driver-capacidad').value = driver.capacidad || 30;
  document.getElementById('driver-estado').value = driver.estado;

  document.getElementById('modal-driver-title').textContent = '✏️ Editar Conductor';
  document.getElementById('modal-driver').classList.add('show');
}

async function deleteDriver(driverId) {
  if (!confirm('¿Estás seguro de eliminar este conductor? Sus envíos pasarán a estado no asignado.')) return;

  try {
    const res = await fetch(`/api/rutas/conductores/${driverId}`, { method: 'DELETE' }).then(r => r.json());
    if (!res.success) {
      alert('Error al eliminar conductor: ' + (res.message || ''));
      return;
    }

    await fetchInitialData();
    window.location.reload();
  } catch (err) {
    console.error('Error:', err);
  }
}

async function handleDriverFormSubmit(event) {
  event.preventDefault();
  const id = document.getElementById('driver-id').value;
  const data = {
    nombre: document.getElementById('driver-nombre').value,
    apellidos: document.getElementById('driver-apellidos').value,
    documento: document.getElementById('driver-documento').value,
    telefono: document.getElementById('driver-telefono').value,
    vehiculo: document.getElementById('driver-vehiculo').value,
    placa: document.getElementById('driver-placa').value,
    capacidad: document.getElementById('driver-capacidad').value,
    estado: document.getElementById('driver-estado').value
  };

  const url = id ? `/api/rutas/conductores/${id}` : '/api/rutas/conductores';
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => r.json());

    if (!res.success) {
      alert('Error al guardar conductor:\n' + (res.errors ? res.errors.join('\n') : res.message));
      return;
    }

    closeDriverModal();
    window.location.reload();
  } catch (err) {
    console.error('Error al guardar conductor:', err);
  }
}

function openNewShipmentModal() {
  document.getElementById('form-shipment').reset();
  document.getElementById('modal-shipment').classList.add('show');
}

function closeShipmentModal() {
  document.getElementById('modal-shipment').classList.remove('show');
}

async function handleShipmentFormSubmit(event) {
  event.preventDefault();

  const data = {
    clienteId: document.getElementById('shipment-cliente').value,
    prioridad: document.getElementById('shipment-prioridad').value,
    destinatarioNombre: document.getElementById('shipment-destinatario').value,
    destinatarioTelefono: document.getElementById('shipment-telefono').value,
    direccion: document.getElementById('shipment-direccion').value,
    distrito: document.getElementById('shipment-distrito').value,
    referencia: document.getElementById('shipment-referencia').value,
    plusCode: document.getElementById('shipment-pluscode').value,
    conductorId: document.getElementById('shipment-conductor').value || null,
    peso: document.getElementById('shipment-peso').value,
    cantidadPaquetes: document.getElementById('shipment-paquetes').value,
    fechaRegistro: new Date().toISOString().split('T')[0]
  };

  try {
    const res = await fetch('/api/rutas/envios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => r.json());

    if (!res.success) {
      alert('Error al registrar envío: ' + (res.message || ''));
      return;
    }

    closeShipmentModal();
    await fetchInitialData();
    window.location.reload();
  } catch (err) {
    console.error('Error al registrar envío:', err);
  }
}
