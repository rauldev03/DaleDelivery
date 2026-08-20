/**
 * DALE DELIVERY - INTERACTIVE LANDING PAGE JS
 * Manejo de interacciones, mapa tecnológico y simulador de tracking.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Navbar Scroll Effect
  const navbar = document.querySelector('.land-navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar?.classList.add('scrolled');
    } else {
      navbar?.classList.remove('scrolled');
    }
  });

  // 2. Mobile Menu Toggle
  const mobileToggle = document.getElementById('mobileToggle');
  const navMenu = document.getElementById('navMenu');

  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
    });

    // Cerrar menú al hacer click en enlaces
    navMenu.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
      });
    });
  }

  // 3. Mapa Logístico Interactivo del Perú
  const cityNodes = document.querySelectorAll('.node-point');
  const telemetryRoute = document.getElementById('telemetryActiveRoute');
  const telemetryStatus = document.getElementById('telemetryActiveStatus');
  const telemetryTransitCount = document.getElementById('telemetryTransitCount');

  const cityData = {
    'lima': { name: 'Lima (HUB Central)', status: 'HUB OPERATIVO 24/7', routes: 18, inTransit: 420 },
    'callao': { name: 'Callao (Aeropuerto & Puerto)', status: 'HUB ADUANAS & CARGA', routes: 12, inTransit: 280 },
    'tumbes': { name: 'Tumbes (Frontera Norte)', status: 'ENLACE NORTE', routes: 3, inTransit: 36 },
    'piura': { name: 'Piura (Norte)', status: 'EN RUTA NORTE', routes: 6, inTransit: 110 },
    'chiclayo': { name: 'Chiclayo (Lambayeque)', status: 'DISTRIBUCIÓN NORTE', routes: 5, inTransit: 95 },
    'trujillo': { name: 'Trujillo (La Libertad)', status: 'RECEPCIÓN ACTIVA', routes: 7, inTransit: 148 },
    'chimbote': { name: 'Chimbote (Áncash)', status: 'CONEXIÓN COSTERA', routes: 4, inTransit: 62 },
    'huaraz': { name: 'Huaraz (Callejón de Huaylas)', status: 'COBERTURA SIERRA', routes: 3, inTransit: 45 },
    'cajamarca': { name: 'Cajamarca (Sierra Norte)', status: 'DISTRIBUCIÓN ANDINA', routes: 4, inTransit: 52 },
    'huanuco': { name: 'Huánuco (Puerta de la Selva)', status: 'ENLACE SELVA CENTRAL', routes: 4, inTransit: 48 },
    'huancayo': { name: 'Huancayo (Junín)', status: 'CENTRO LOGÍSTICO', routes: 5, inTransit: 85 },
    'ica': { name: 'Ica (Costa Sur)', status: 'DESPACHO DIARIO', routes: 5, inTransit: 92 },
    'ayacucho': { name: 'Ayacucho (Sierra)', status: 'DISTRIBUCIÓN REGIONAL', routes: 4, inTransit: 54 },
    'arequipa': { name: 'Arequipa (Sur)', status: 'DISTRIBUCIÓN SUR', routes: 8, inTransit: 215 },
    'cusco': { name: 'Cusco (Sierra Sur)', status: 'ENTREGAS EN CURSO', routes: 6, inTransit: 128 },
    'puno': { name: 'Puno / Juliaca', status: 'FRONTERA & ALTIPLANO', routes: 4, inTransit: 68 },
    'moquegua': { name: 'Moquegua (Sur)', status: 'CORREDOR SUR', routes: 3, inTransit: 41 },
    'tacna': { name: 'Tacna (Frontera Sur)', status: 'HUB SUR', routes: 4, inTransit: 74 },
    'tarapoto': { name: 'Tarapoto (San Martín)', status: 'CONEXIÓN NORORIENTAL', routes: 4, inTransit: 58 },
    'iquitos': { name: 'Iquitos (Oriente Aéreo)', status: 'CONEXIÓN AÉREA', routes: 3, inTransit: 52 },
    'pucallpa': { name: 'Pucallpa (Selva Central)', status: 'RUTA FLUVIAL/TERRESTRE', routes: 4, inTransit: 71 },
    'maldonado': { name: 'Pto. Maldonado (Madre de Dios)', status: 'RUTA AMAZÓNICA SUR', routes: 3, inTransit: 42 },
    'ptomaldonado': { name: 'Pto. Maldonado (Madre de Dios)', status: 'RUTA AMAZÓNICA SUR', routes: 3, inTransit: 42 }
  };

  // Interactividad en Nodos de Ciudades
  cityNodes.forEach(node => {
    node.addEventListener('mouseenter', () => {
      const cityKey = node.getAttribute('data-city');
      const data = cityData[cityKey];
      if (data) {
        if (telemetryRoute) telemetryRoute.textContent = data.name;
        if (telemetryStatus) telemetryStatus.textContent = data.status;
        if (telemetryTransitCount) telemetryTransitCount.textContent = `${data.inTransit} pqts`;
      }
    });

    node.addEventListener('click', () => {
      const cityKey = node.getAttribute('data-city');
      const data = cityData[cityKey];
      if (data && telemetryRoute) {
        telemetryRoute.textContent = `${data.name} (Seleccionado)`;
      }
    });
  });

  // Interactividad en Formas Departamentales
  const deptPaths = document.querySelectorAll('.dept-path');
  deptPaths.forEach(dept => {
    dept.addEventListener('mouseenter', () => {
      const deptName = dept.getAttribute('data-department');
      if (deptName && telemetryRoute) {
        telemetryRoute.textContent = `Dpto: ${deptName}`;
        if (telemetryStatus) telemetryStatus.textContent = 'COBERTURA ACTIVA';
      }
    });
  });

  // 4. Simulador Interactivo de Tracking
  const trackingPresets = {
    'DD-89421': { origin: 'Lima (Hub Central)', dest: 'Arequipa', status: 'EN RUTA', progress: '76%', eta: 'Hoy, 18:30 hrs', badgeClass: 'orange' },
    'DD-52104': { origin: 'Trujillo', dest: 'Piura', status: 'EN REPARTO', progress: '90%', eta: 'Hoy, 16:15 hrs', badgeClass: 'cyan' },
    'DD-10293': { origin: 'Lima (Hub Central)', dest: 'Cusco', status: 'EN TRÁNSITO', progress: '48%', eta: 'Mañana, 09:00 hrs', badgeClass: 'orange' },
    'DD-33821': { origin: 'Lima (Hub Central)', dest: 'Ica', status: 'ENTREGADO', progress: '100%', eta: 'Completado', badgeClass: 'green' }
  };

  const sampleButtons = document.querySelectorAll('.tracking-sample-btn');
  const mockupId = document.getElementById('mockupShipmentId');
  const mockupOrigin = document.getElementById('mockupOrigin');
  const mockupDest = document.getElementById('mockupDest');
  const mockupStatus = document.getElementById('mockupStatus');
  const mockupProgressVal = document.getElementById('mockupProgressVal');
  const mockupProgressBar = document.getElementById('mockupProgressBar');
  const mockupEta = document.getElementById('mockupEta');

  function updateMockup(code) {
    const data = trackingPresets[code] || {
      origin: 'Lima (Hub)', dest: 'Destino Nacional', status: 'EN REVISIÓN', progress: '35%', eta: 'En proceso', badgeClass: 'orange'
    };

    if (mockupId) mockupId.innerHTML = `ENVÍO #<span>${code}</span>`;
    if (mockupOrigin) mockupOrigin.textContent = data.origin;
    if (mockupDest) mockupDest.textContent = data.dest;
    if (mockupStatus) mockupStatus.textContent = data.status;
    if (mockupProgressVal) mockupProgressVal.textContent = data.progress;
    if (mockupProgressBar) mockupProgressBar.style.width = data.progress;
    if (mockupEta) mockupEta.textContent = data.eta;
  }

  sampleButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      sampleButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const code = btn.getAttribute('data-code');
      if (code) updateMockup(code);
    });
  });
});
