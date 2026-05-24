/**
 * Captura de la vista actual del mapa BESS para el reporte (Fase 11).
 *
 * MapLibre limpia el WebGL buffer entre frames a menos que el contexto
 * se haya creado con `preserveDrawingBuffer: true`. Como `react-map-gl`
 * no expone esa opción directamente, este helper usa el truco de capturar
 * dentro del callback `'render'` justo después de un `triggerRepaint()`.
 * Funciona en Chromium/Firefox/Safari modernos.
 *
 * Si la captura falla por cualquier motivo (mapa no montado, WebGL2 sin
 * lectura disponible, navegador raro), devuelve `null` y el reporte usa
 * el SVG esquemático como fallback.
 */

import type { MapRef } from "react-map-gl/maplibre";

let currentMapRef: { current: MapRef | null } | null = null;

export function registerMapRefForReport(ref: { current: MapRef | null }): void {
  currentMapRef = ref;
}

export function unregisterMapRefForReport(): void {
  currentMapRef = null;
}

export type MapCaptureResult = {
  /** Data URL `data:image/png;base64,...`. */
  dataUrl: string;
  width: number;
  height: number;
  capturedAt: string;
  /** Centro y zoom al momento de la captura. */
  view: {
    lng: number;
    lat: number;
    zoom: number;
    bearing: number;
    pitch: number;
  };
};

/**
 * Captura la vista actual del mapa registrado. Devuelve null si no hay mapa
 * o si la imagen sale en blanco.
 */
export function captureMapImage(): Promise<MapCaptureResult | null> {
  return new Promise((resolve) => {
    const ref = currentMapRef?.current;
    if (!ref) {
      resolve(null);
      return;
    }
    const map = ref.getMap();
    const canvas = map.getCanvas();

    let resolved = false;
    const finish = () => {
      if (resolved) return;
      resolved = true;
      try {
        const dataUrl = canvas.toDataURL("image/png");
        // Validación mínima: descartamos data URLs absurdamente cortos
        // (canvas en blanco suele dar ~100–500 bytes).
        if (!dataUrl || dataUrl.length < 1000) {
          resolve(null);
          return;
        }
        const center = map.getCenter();
        resolve({
          dataUrl,
          width: canvas.width,
          height: canvas.height,
          capturedAt: new Date().toISOString(),
          view: {
            lng: center.lng,
            lat: center.lat,
            zoom: map.getZoom(),
            bearing: map.getBearing(),
            pitch: map.getPitch(),
          },
        });
      } catch {
        resolve(null);
      }
    };

    // Timeout duro para evitar bloqueos.
    const timeoutId = setTimeout(finish, 1500);

    try {
      map.once("render", () => {
        clearTimeout(timeoutId);
        // Esperar un microtask para asegurar que el frame se completó.
        Promise.resolve().then(finish);
      });
      map.triggerRepaint();
    } catch {
      clearTimeout(timeoutId);
      finish();
    }
  });
}
