import { Profiler, memo, useCallback } from 'react';
import BackgroundLayer from './BackgroundLayer';
import ConnectionBanner from './ConnectionBanner';
import DragOverlaySVG from './DragOverlaySVG';
import { PageNavigation } from '../components';
import DashboardGrid from '../rendering/DashboardGrid';
import ModalManager from '../rendering/ModalManager';
import PinLockModal from '../components/ui/PinLockModal';

const MemoDashboardGrid = memo(DashboardGrid);
const MemoModalManager = memo(ModalManager);

/** @param {Record<string, unknown>} props */
export default function DashboardLayout(props) {
  const {
    resolvedAppFontFamily,
    editMode,
    draggingId,
    touchPath,
    isMobile,
    gridColCount,
    dynamicGridColumns,
    isCompactCards,
    now,
    resolvedHeaderTitle,
    headerScale,
    headerSettings,
    setShowHeaderEditModal,
    t,
    sectionSpacing,
    pagesConfig,
    personStatus,
    requestSettingsAccess,
    setAddCardTargetPage,
    setShowAddCardModal,
    setConfigTab,
    isSonosActive,
    isMediaActive,
    getA,
    getEntityImageUrl,
    pages,
    activePage,
    setActivePage,
    setEditingPage,
    guardedSetEditMode,
    guardedSetShowAddCardModal,
    guardedSetShowConfigModal,
    guardedSetShowThemeSidebar,
    guardedSetShowLayoutSidebar,
    guardedSetShowHeaderEditModal,
    connected,
    updateCount,
    dashboardGridPage,
    dashboardGridMedia,
    dashboardGridGrid,
    dashboardGridCards,
    dashboardGridActions,
    modalManagerCore,
    modalManagerState,
    modalManagerAppearance,
    modalManagerLayout,
    modalManagerOnboarding,
    modalManagerPageManagement,
    modalManagerEntityHelpers,
    modalManagerAddCard,
    modalManagerCardConfig,
    mediaTick,
    showPinLockModal,
    closePinLockModal,
    handlePinSubmit,
    pinLockError,
  } = props;

  let profilingEnabled = false;
  try {
    profilingEnabled =
      typeof window !== 'undefined' &&
      window.localStorage?.getItem('tunet_profile_renders') === '1';
  } catch {
    profilingEnabled = false;
  }

  const onProfileRender = useCallback(
    (id, phase, actualDuration, baseDuration) => {
      if (!profilingEnabled || actualDuration < 8) return;
      console.warn(
        `[RenderProfile] ${id} ${phase} actual=${actualDuration.toFixed(2)}ms base=${baseDuration.toFixed(2)}ms`
      );
    },
    [profilingEnabled]
  );

  const withProfiler = useCallback(
    (id, element) => {
      if (!profilingEnabled) return element;
      return (
        <Profiler id={id} onRender={onProfileRender}>
          {element}
        </Profiler>
      );
    },
    [profilingEnabled, onProfileRender]
  );

  return (
    <div
      className="min-h-screen overflow-x-hidden font-sans transition-colors duration-500 selection:bg-[var(--accent-bg)]"
      style={{
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        '--font-sans': resolvedAppFontFamily,
        fontFamily: resolvedAppFontFamily,
      }}
    >
      <BackgroundLayer />
      {editMode && draggingId && touchPath && <DragOverlaySVG touchPath={touchPath} />}
      <div
        role="main"
        aria-label="Dashboard"
        className={`relative z-10 mx-auto w-full max-w-[1600px] py-6 md:py-10 ${
          isMobile
            ? 'mobile-grid px-2'
            : gridColCount === 1
              ? 'px-10 sm:px-16 md:px-24'
              : gridColCount === 3
                ? dynamicGridColumns
                  ? 'px-4 md:px-12'
                  : 'px-4 md:px-20'
                : 'px-6 md:px-20'
        } ${isCompactCards ? 'compact-cards' : ''}`}
      >
        <ConnectionBanner t={t} />

        {withProfiler(
          'DashboardGrid',
          <MemoDashboardGrid
            page={dashboardGridPage}
            media={dashboardGridMedia}
            grid={dashboardGridGrid}
            cards={dashboardGridCards}
            actions={dashboardGridActions}
            t={t}
          />
        )}

        <div className="mt-4 flex justify-center pb-4">
          <PageNavigation
            pages={pages}
            activePage={activePage}
            setActivePage={setActivePage}
            editMode={editMode}
            setEditMode={guardedSetEditMode}
            setEditingPage={setEditingPage}
            setShowAddCardModal={guardedSetShowAddCardModal}
            setShowConfigModal={guardedSetShowConfigModal}
            setConfigTab={setConfigTab}
            setShowThemeSidebar={guardedSetShowThemeSidebar}
            setShowLayoutSidebar={guardedSetShowLayoutSidebar}
            setShowHeaderEditModal={guardedSetShowHeaderEditModal}
            connected={connected}
            updateCount={updateCount}
            t={t}
          />
        </div>

        {withProfiler(
          'ModalManager',
          <MemoModalManager
            core={modalManagerCore}
            modalState={modalManagerState}
            appearance={modalManagerAppearance}
            layout={modalManagerLayout}
            onboarding={modalManagerOnboarding}
            pageManagement={modalManagerPageManagement}
            entityHelpers={modalManagerEntityHelpers}
            addCard={modalManagerAddCard}
            cardConfig={modalManagerCardConfig}
            mediaTick={mediaTick}
          />
        )}

        <PinLockModal
          open={showPinLockModal}
          onClose={closePinLockModal}
          onSubmit={handlePinSubmit}
          t={t}
          error={pinLockError}
        />
      </div>
    </div>
  );
}
