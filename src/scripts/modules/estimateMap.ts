/**
 * Leaflet map for the /estimate zone step — loaded lazily, only on that page,
 * following the countup.js/swiper pattern. CARTO's Dark Matter basemap sits
 * close to the site's navy; the three zone polygons are the same real
 * municipal boundaries as `data/zoneGeometry.json` documents.
 */
import type { Map as LeafletMap, Polygon, PathOptions } from 'leaflet';

export interface EstimateMapOptions {
  /** [lon, lat] rings per zone key, straight from zoneGeometry.json. */
  geometry: Record<string, Array<[number, number]>>;
  /** Localized display name per zone key, for the permanent labels. */
  names: Record<string, string>;
  onPick: (zone: string) => void;
}

export interface EstimateMapApi {
  setSelected: (zone: string | null) => void;
  destroy: () => void;
}

const BASE: PathOptions = { color: '#c2c7cf', weight: 1.3, fillColor: '#c2c7cf', fillOpacity: 0.08 };
const HOVER: PathOptions = { fillOpacity: 0.2 };
const SELECTED: PathOptions = { weight: 2, fillOpacity: 0.55 };

export async function initEstimateMap(
  container: HTMLElement,
  options: EstimateMapOptions,
): Promise<EstimateMapApi> {
  const [{ default: L }] = await Promise.all([
    import('leaflet'),
    import('leaflet/dist/leaflet.css'),
  ]);

  const map: LeafletMap = L.map(container, {
    zoomControl: true,
    scrollWheelZoom: false,
    attributionControl: true,
  });

  // Esri's Dark Gray Canvas needs no API key (CARTO's raster basemaps now
  // watermark keyless requests). Base carries the geometry, Reference the
  // street and place labels.
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 16,
    attribution: 'Esri, HERE, Garmin &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 16,
    pane: 'shadowPane',
  }).addTo(map);

  let selected: string | null = null;
  const layers = new Map<string, Polygon>();

  Object.entries(options.geometry).forEach(([key, ring]) => {
    const latlngs = ring.map(([lon, lat]) => [lat, lon] as [number, number]);
    const polygon = L.polygon(latlngs, { ...BASE, className: 'estimate-zone-path' })
      .bindTooltip(options.names[key] ?? key, {
        permanent: true,
        direction: 'center',
        className: 'estimate-zone-tip',
      })
      .on('mouseover', () => {
        if (selected !== key) polygon.setStyle(HOVER);
      })
      .on('mouseout', () => {
        polygon.setStyle(selected === key ? SELECTED : BASE);
      })
      .on('click', () => options.onPick(key))
      .addTo(map);
    layers.set(key, polygon);
  });

  const bounds = L.latLngBounds(
    Object.values(options.geometry)
      .flat()
      .map(([lon, lat]) => [lat, lon] as [number, number]),
  );
  map.fitBounds(bounds, { padding: [28, 28] });

  return {
    setSelected(zone: string | null): void {
      selected = zone;
      layers.forEach((polygon, key) => {
        polygon.setStyle(key === zone ? SELECTED : BASE);
        const tip = polygon.getTooltip()?.getElement();
        if (tip) tip.classList.toggle('is-selected', key === zone);
      });
    },
    destroy(): void {
      map.remove();
    },
  };
}
