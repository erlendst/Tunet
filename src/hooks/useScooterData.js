import { useState, useEffect, useRef } from 'react';

const POLL_INTERVAL_MS = 30_000;
const ENTUR_GRAPHQL_URL = 'https://api.entur.io/mobility/v2/graphql';
const ENTUR_CLIENT_NAME = 'tunet-scootercard';

const QUERY = `
  query Scooters($lat: Float!, $lon: Float!, $range: Int!) {
    vehicles(lat: $lat, lon: $lon, range: $range, count: 200, formFactors: [SCOOTER, SCOOTER_STANDING, SCOOTER_SEATED]) {
      id
      lat
      lon
      system {
        name {
          translation {
            language
            value
          }
        }
      }
    }
  }
`;

function getProviderKey(systemName) {
  if (!systemName) return 'other';
  const lower = systemName.toLowerCase();
  if (lower.includes('voi')) return 'voi';
  if (lower.includes('ryde')) return 'ryde';
  if (lower.includes('bolt')) return 'bolt';
  return 'other';
}

function getSystemName(system) {
  const translations = system?.name?.translation;
  if (!Array.isArray(translations) || translations.length === 0) return null;
  const en = translations.find((t) => t.language === 'en');
  return (en || translations[0])?.value || null;
}

/**
 * Fetches e-scooter locations near a given lat/lon from Entur's GraphQL API.
 * Polls every 90 seconds. Returns { vehicles, loading, error }.
 */
export default function useScooterData({ lat, lon, range = 500, enabled = true }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!enabled || !lat || !lon) {
      setVehicles([]);
      return undefined;
    }

    let cancelled = false;

    const fetchVehicles = async () => {
      // Abort previous in-flight request
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      try {
        const res = await fetch(ENTUR_GRAPHQL_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ET-Client-Name': ENTUR_CLIENT_NAME,
          },
          body: JSON.stringify({
            query: QUERY,
            variables: { lat, lon, range: Math.round(range) },
          }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        if (cancelled) return;

        const rawVehicles = json?.data?.vehicles ?? [];

        setVehicles(
          rawVehicles.map((v) => {
            const systemName = getSystemName(v.system);
            return {
              id: v.id,
              lat: v.lat,
              lon: v.lon,
              systemName,
              providerKey: getProviderKey(systemName),
            };
          })
        );
        setError(null);
      } catch (err) {
        if (err.name === 'AbortError' || cancelled) return;
        setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchVehicles();
    const interval = setInterval(fetchVehicles, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [enabled, lat, lon, range]);

  return { vehicles, loading, error };
}
