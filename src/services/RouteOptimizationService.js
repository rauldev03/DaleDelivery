const shipmentRepository = require('../repositories/ShipmentRepository');
const driverRepository = require('../repositories/DriverRepository');

// Coordenadas del Almacén / Sede Central por defecto (Lima, Perú: Centro / Lince)
const DEFAULT_HUB = {
  lat: -12.0833,
  lng: -77.0333,
  nombre: 'Almacén Central Dale Delivery'
};

class RouteOptimizationService {
  /**
   * Calcula la distancia en kilómetros entre dos coordenadas usando la fórmula Haversine
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return 99999;
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Optimiza las rutas para uno o todos los conductores asignados
   * @param {Object} options - { driverId, origin, currentUser }
   */
  async optimizeRoutes({ driverId = null, origin = DEFAULT_HUB, currentUser = null } = {}) {
    let drivers = [];
    if (driverId) {
      const driver = driverRepository.findById(driverId);
      if (!driver) throw new Error('El conductor especificado no existe.');
      drivers = [driver];
    } else {
      drivers = driverRepository.findAllActive();
    }

    const optimizationResults = [];
    const allUpdates = [];

    for (const driver of drivers) {
      const shipments = shipmentRepository.findByConductor(driver.id, true);
      if (!shipments || shipments.length === 0) {
        optimizationResults.push({
          driverId: driver.id,
          driverName: driver.nombreCompleto,
          vehiculo: driver.vehiculo,
          totalShipments: 0,
          stops: [],
          totalDistanceKm: 0,
          estimatedDurationMinutes: 0
        });
        continue;
      }

      // Separar envíos con coordenadas válidas de los que no tienen
      const validShipments = [];
      const invalidShipments = [];

      for (const s of shipments) {
        if (s.latitud !== null && s.longitud !== null && !isNaN(s.latitud) && !isNaN(s.longitud)) {
          validShipments.push(s);
        } else {
          invalidShipments.push(s);
        }
      }

      // Optimizar envíos con coordenadas usando Nearest Neighbor + Priority weighting + 2-Opt
      const optimizedValid = this.solveTSP(validShipments, origin);

      // Concatenar: primero los optimizados geográficamente, luego los pendientes de coordenadas
      const finalSequence = [...optimizedValid, ...invalidShipments];

      // Asignar número de parada correlativo (1..N)
      const stops = [];
      let currentLat = origin.lat;
      let currentLng = origin.lng;
      let totalDistanceKm = 0;

      finalSequence.forEach((shipment, index) => {
        const stopOrder = index + 1;
        shipment.ordenRuta = stopOrder;
        allUpdates.push({
          id: shipment.id,
          ordenRuta: stopOrder
        });

        let distFromPrev = 0;
        if (shipment.latitud !== null && shipment.longitud !== null) {
          distFromPrev = this.calculateDistance(currentLat, currentLng, shipment.latitud, shipment.longitud);
          totalDistanceKm += distFromPrev;
          currentLat = shipment.latitud;
          currentLng = shipment.longitud;
        }

        stops.push({
          order: stopOrder,
          shipmentId: shipment.id,
          codigoEnvio: shipment.codigoEnvio,
          destinatarioNombre: shipment.destinatarioNombre,
          direccion: shipment.direccion,
          distrito: shipment.distrito,
          prioridad: shipment.prioridad,
          lat: shipment.latitud,
          lng: shipment.longitud,
          distFromPrevKm: parseFloat(distFromPrev.toFixed(2))
        });
      });

      // Estimación de tiempo: 25 km/h promedio en ciudad + 8 mins por parada
      const estimatedDrivingMins = Math.round((totalDistanceKm / 25) * 60);
      const serviceTimeMins = stops.length * 8;
      const totalEstimatedMinutes = estimatedDrivingMins + serviceTimeMins;

      optimizationResults.push({
        driverId: driver.id,
        driverName: driver.nombreCompleto,
        vehiculo: driver.vehiculo,
        totalShipments: stops.length,
        stops,
        totalDistanceKm: parseFloat(totalDistanceKm.toFixed(2)),
        estimatedDurationMinutes: totalEstimatedMinutes
      });
    }

    // Persistir las paradas optimizadas en base de datos
    if (allUpdates.length > 0) {
      shipmentRepository.saveRouteOptimizedOrder(
        allUpdates,
        currentUser ? (currentUser.nombre || currentUser.username) : 'Optimizador'
      );
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
      results: optimizationResults
    };
  }

  /**
   * Resuelve el TSP usando Nearest Neighbor con ponderación por prioridad + 2-Opt Refinement
   */
  solveTSP(shipments, startPoint) {
    if (shipments.length <= 1) return [...shipments];

    // Agrupar por prioridad para dar preferencia a Alta prioridad
    const highPriority = shipments.filter(s => s.prioridad === 'Alta');
    const normalPriority = shipments.filter(s => s.prioridad === 'Normal');
    const lowPriority = shipments.filter(s => s.prioridad === 'Baja');

    const orderedHigh = this.nearestNeighbor(highPriority, startPoint);
    const lastHighPoint = orderedHigh.length > 0 
      ? { lat: orderedHigh[orderedHigh.length - 1].latitud, lng: orderedHigh[orderedHigh.length - 1].longitud } 
      : startPoint;

    const orderedNormal = this.nearestNeighbor(normalPriority, lastHighPoint);
    const lastNormalPoint = orderedNormal.length > 0 
      ? { lat: orderedNormal[orderedNormal.length - 1].latitud, lng: orderedNormal[orderedNormal.length - 1].longitud } 
      : lastHighPoint;

    const orderedLow = this.nearestNeighbor(lowPriority, lastNormalPoint);

    let completeRoute = [...orderedHigh, ...orderedNormal, ...orderedLow];

    // Aplicar optimización 2-Opt dentro de grupos si tienen al menos 4 puntos
    completeRoute = this.twoOptOptimization(completeRoute, startPoint);

    return completeRoute;
  }

  nearestNeighbor(points, start) {
    if (points.length === 0) return [];
    const remaining = [...points];
    const result = [];
    let currentPoint = start;

    while (remaining.length > 0) {
      let nearestIdx = 0;
      let minDistance = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const d = this.calculateDistance(
          currentPoint.lat,
          currentPoint.lng,
          remaining[i].latitud,
          remaining[i].longitud
        );
        if (d < minDistance) {
          minDistance = d;
          nearestIdx = i;
        }
      }

      const nearest = remaining.splice(nearestIdx, 1)[0];
      result.push(nearest);
      currentPoint = { lat: nearest.latitud, lng: nearest.longitud };
    }

    return result;
  }

  twoOptOptimization(route, start) {
    if (route.length < 4) return route;
    let improved = true;
    let best = [...route];
    let iterations = 0;
    const maxIterations = 50;

    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;

      for (let i = 0; i < best.length - 1; i++) {
        for (let k = i + 1; k < best.length; k++) {
          // Solo permitir intercambio 2-opt si no viola prioridad Alta antes que Baja
          if (best[i].prioridad === 'Alta' && best[k].prioridad === 'Baja') continue;

          const newRoute = this.twoOptSwap(best, i, k);
          const currentDist = this.calculateRouteDistance(best, start);
          const newDist = this.calculateRouteDistance(newRoute, start);

          if (newDist < currentDist - 0.01) { // Mejora mínima de 10 metros
            best = newRoute;
            improved = true;
            break;
          }
        }
        if (improved) break;
      }
    }

    return best;
  }

  twoOptSwap(route, i, k) {
    const part1 = route.slice(0, i);
    const part2 = route.slice(i, k + 1).reverse();
    const part3 = route.slice(k + 1);
    return [...part1, ...part2, ...part3];
  }

  calculateRouteDistance(route, start) {
    let total = 0;
    let curLat = start.lat;
    let curLng = start.lng;

    for (const item of route) {
      if (item.latitud !== null && item.longitud !== null) {
        total += this.calculateDistance(curLat, curLng, item.latitud, item.longitud);
        curLat = item.latitud;
        curLng = item.longitud;
      }
    }
    return total;
  }
}

module.exports = new RouteOptimizationService();
