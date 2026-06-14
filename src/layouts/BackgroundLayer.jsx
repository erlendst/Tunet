import AuroraBackground from '../components/effects/AuroraBackground';
import { useConfig } from '../contexts';

/**
 * BackgroundLayer — renders the animated aurora or static gradient background.
 */
export default function BackgroundLayer() {
  const { bgMode } = useConfig();

  if (bgMode === 'animated') {
    return <AuroraBackground />;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Deep static gradient base */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 0%, var(--bg-gradient-from), var(--bg-primary) 70%, var(--bg-gradient-to))',
        }}
      />
    </div>
  );
}
