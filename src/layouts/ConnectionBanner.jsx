import { AlertTriangle } from '../icons';
import { useHomeAssistant, useModalState } from '../contexts';

/**
 * ConnectionBanner — shows a warning when HA is unavailable or OAuth has expired.
 */
export default function ConnectionBanner({ t }) {
  const { haUnavailableVisible, oauthExpired } = useHomeAssistant();
  const { setShowConfigModal, setConfigTab } = useModalState();

  if (!haUnavailableVisible) return null;

  const handleReconnect = () => {
    setShowConfigModal(true);
    setConfigTab('connection');
  };

  return (
    <div className="mb-6 flex items-center gap-3 rounded-2xl border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-4 py-4 text-[var(--status-warning-fg)] sm:px-6">
      <AlertTriangle className="h-5 w-5 text-[var(--status-warning-fg)]" />
      <div className="text-sm font-semibold">
        {oauthExpired ? t('system.oauth.expired') : t('ha.unavailable')}
      </div>
      {oauthExpired && (
        <button
          onClick={handleReconnect}
          className="ml-auto rounded-lg border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-3 py-1.5 text-xs font-bold tracking-wider text-[var(--status-warning-fg)] uppercase transition-colors hover:opacity-90"
        >
          {t('system.oauth.loginButton')}
        </button>
      )}
    </div>
  );
}
