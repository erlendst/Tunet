import { useEffect } from 'react';

/**
 * Custom hook that switches between two themes based on a Home Assistant
 * binary sensor: sensor off → original theme, sensor on → second theme.
 *
 * @param {Object} params
 * @param {boolean} params.enabled - Whether auto theme switching is active
 * @param {string} params.sensorId - Entity id of the binary sensor/switch that drives the theme
 * @param {string} params.originalTheme - Theme key applied when the sensor is off
 * @param {string} params.secondTheme - Theme key applied when the sensor is on
 * @param {Object} params.entities - Home Assistant entities
 * @param {string} params.currentTheme - Current theme name
 * @param {Function} params.setCurrentTheme - Setter for the current theme
 */
export function useAutoTheme({
  enabled,
  sensorId,
  originalTheme,
  secondTheme,
  entities,
  currentTheme,
  setCurrentTheme,
}) {
  const sensorState = enabled && sensorId ? entities?.[sensorId]?.state : undefined;

  useEffect(() => {
    if (!enabled || !sensorId) return;
    // Only react to clear on/off states; ignore unavailable/unknown so we
    // don't fight the user's manual choice when the sensor isn't reporting.
    if (sensorState !== 'on' && sensorState !== 'off') return;

    const target = sensorState === 'on' ? secondTheme : originalTheme;
    if (target && target !== currentTheme) {
      setCurrentTheme(target);
    }
  }, [enabled, sensorId, sensorState, originalTheme, secondTheme, currentTheme, setCurrentTheme]);
}
