import { memo, useRef, useEffect, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import useScooterData from '../../hooks/useScooterData';

// ── Provider logos ────────────────────────────────────────────────────────────
// Drop your SVGs into src/assets/scooters/ and uncomment the imports below.
// Vite will bundle them as data URLs automatically.
//
import voiLogo from '../../assets/scooters/voi.svg';
import rydeLogo from '../../assets/scooters/ryde.svg';
import boltLogo from '../../assets/scooters/bolt.svg';

const PROVIDER_LOGOS = {
  voi: voiLogo,
  ryde: rydeLogo,
  bolt: boltLogo,
};
// ─────────────────────────────────────────────────────────────────────────────

const PROVIDER_COLORS = {
  voi: '#F26961',
  ryde: '#6CC24A',
  bolt: '#2B9C64',
  other: '#94A3B8',
};

const PROVIDER_LABELS = {
  voi: 'V',
  ryde: 'R',
  bolt: 'B',
  other: '·',
};

function makeScooterIcon(providerKey) {
  const color = PROVIDER_COLORS[providerKey] || PROVIDER_COLORS.other;
  const logo = PROVIDER_LOGOS[providerKey];
  const label = PROVIDER_LABELS[providerKey] || '·';

  const inner = logo
    ? `<img src="${logo}" style="width:14px;height:14px;object-fit:contain;" />`
    : `<span style="font-weight:700;font-size:13px;font-family:sans-serif;color:#fff;">${label}</span>`;

  return L.divIcon({
    className: '',
    html: `<div style="
      background:${color};
      width:30px;height:30px;
      border-radius:50%;
      border:3.5px solid #fff;
      display:flex;align-items:center;justify-content:center;
    ">${inner}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    tooltipAnchor: [15, 0],
  });
}

function makeHomeIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:#3b82f6;
      width:10px;height:10px;
      border-radius:50%;
      border:2px solid #fff;
      box-shadow:0 0 8px rgba(59,130,246,0.7);
    "></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
}

const ScooterCard = memo(function ScooterCard({
  cardId,
  dragProps,
  controls,
  cardStyle,
  editMode,
  cardSettings,
  settingsKey,
}) {
  const settings = cardSettings[settingsKey] || cardSettings[cardId] || {};
  const lat = settings.lat ? parseFloat(settings.lat) : null;
  const lon = settings.lon ? parseFloat(settings.lon) : null;
  const range = settings.range ? parseInt(settings.range, 10) : 500;
  const offsetX = parseInt(settings.offsetX, 10) || 0;
  const offsetY = parseInt(settings.offsetY, 10) || 0;

  const mapStyle = settings.mapStyle || 'auto';

  // Read theme once and track it via MutationObserver so we don't re-read the
  // DOM on every render (which would produce a new tileUrl string every render,
  // causing the map effect to re-fire and rebuild the map in a hot loop).
  const [isLightTheme, setIsLightTheme] = useState(
    () => typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light'
  );
  useEffect(() => {
    if (mapStyle !== 'auto') return;
    const observer = new MutationObserver(() => {
      setIsLightTheme(document.documentElement.dataset.theme === 'light');
    });
    observer.observe(document.documentElement, { attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, [mapStyle]);

  const tileUrl = useMemo(() => {
    switch (mapStyle) {
      case 'voyager':
        return 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      case 'positron':
        return 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
      case 'dark':
        return 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      case 'osm':
        return 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
      case 'auto':
      default:
        return isLightTheme
          ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    }
  }, [mapStyle, isLightTheme]);

  const cardRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markerRefs = useRef([]);
  const homeMarkerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  const { vehicles, loading } = useScooterData({
    lat,
    lon,
    range,
    enabled: isVisible && !!lat && !!lon,
  });

  // Only poll when the card is actually in the viewport
  useEffect(() => {
    if (!cardRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  // Init / reinit map when lat/lon available
  useEffect(() => {
    if (!lat || !lon || !mapRef.current) return undefined;

    const timer = setTimeout(() => {
      if (!mapRef.current) return;

      if (!mapInstanceRef.current) {
        const map = L.map(mapRef.current, {
          // Fully static — no interaction at all
          zoomControl: false,
          attributionControl: false,
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          touchZoom: false,
          boxZoom: false,
          keyboard: false,
          tap: false,
          trackResize: false,
          // No animation loops
          fadeAnimation: false,
          zoomAnimation: false,
          markerZoomAnimation: false,
          // Canvas renderer — much lighter than SVG with many markers
          preferCanvas: true,
        }).setView([lat, lon], 17.5);

        tileLayerRef.current = L.tileLayer(tileUrl, {
          subdomains: 'abcd',
          maxZoom: 19,
        }).addTo(map);

        mapInstanceRef.current = map;
        setTimeout(() => {
          map.invalidateSize();
          if (offsetX !== 0 || offsetY !== 0) map.panBy([offsetX, offsetY], { animate: false });
          setMapReady(true);
        }, 100);
      } else {
        const hasDifferentLayer = tileLayerRef.current?._url !== tileUrl;
        if (hasDifferentLayer) {
          tileLayerRef.current?.remove();
          tileLayerRef.current = L.tileLayer(tileUrl, {
            subdomains: 'abcd',
            maxZoom: 19,
          }).addTo(mapInstanceRef.current);
        }
        mapInstanceRef.current.setView([lat, lon]);
        if (offsetX !== 0 || offsetY !== 0)
          mapInstanceRef.current.panBy([offsetX, offsetY], { animate: false });
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [lat, lon, tileUrl, offsetX, offsetY]);

  // Update scooter markers on vehicles change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Remove old markers
    markerRefs.current.forEach((m) => m.remove());
    markerRefs.current = [];

    vehicles.forEach((v) => {
      const marker = L.marker([v.lat, v.lon], { icon: makeScooterIcon(v.providerKey) })
        .bindTooltip(v.systemName || v.providerKey, { direction: 'top', offset: [0, -4] })
        .addTo(mapInstanceRef.current);
      markerRefs.current.push(marker);
    });
  }, [vehicles, mapReady]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      markerRefs.current.forEach((m) => m.remove());
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={cardRef}
      key={cardId}
      {...dragProps}
      className="relative h-full w-full overflow-hidden rounded-3xl border border-[var(--glass-border)]"
      style={cardStyle}
    >
      {controls}

      {/* Map container — isolation:isolate creates its own stacking context so
          Leaflet's internal pane z-indexes (200-800) don't bleed over the edit controls */}
      <div ref={mapRef} className="h-full w-full" style={{ isolation: 'isolate' }} />

      {/* Loading badge */}
      {loading && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-bold tracking-wider text-white backdrop-blur-sm">
          …
        </div>
      )}

      {/* No lat/lon configured overlay */}
      {(!lat || !lon) && (
        <div className="pointer-events-none absolute inset-0 z-[1000] flex flex-col items-center justify-center gap-2 bg-[var(--glass-bg)] text-center">
          <p className="text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase">
            Scooter-kart
          </p>
          <p className="text-[11px] text-[var(--text-muted)]">
            Konfigurer posisjon i kortinnstillinger
          </p>
        </div>
      )}
    </div>
  );
});

export default ScooterCard;
