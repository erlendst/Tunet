import { useState } from 'react';
import { Plus, Edit2, Check } from '../../icons';
import { getIconComponent } from '../../icons';
import { useModalState, usePages } from '../../contexts';
import SettingsDropdown from '../ui/SettingsDropdown';

/**
 * PageNavigation - Round icon-only navigation buttons + edit/settings controls
 */
export default function PageNavigation({
  pages,
  activePage,
  setActivePage,
  editMode,
  setEditMode,
  setEditingPage,
  setShowAddCardModal,
  setShowConfigModal,
  setConfigTab,
  setShowThemeSidebar,
  setShowLayoutSidebar,
  setShowHeaderEditModal,
  connected,
  updateCount,
  t,
}) {
  const { pagesConfig, persistConfig, pageSettings } = usePages();
  const { setShowAddPageModal } = useModalState();
  const [dragOverId, setDragOverId] = useState(null);
  const pageOrder = pagesConfig?.pages || [];
  const isSinglePage = pages.length === 1;

  const movePage = (sourceId, targetId) => {
    if (!persistConfig) return;
    if (!sourceId || !targetId || sourceId === targetId) return;
    const nextPages = [...pageOrder];
    const fromIndex = nextPages.indexOf(sourceId);
    const toIndex = nextPages.indexOf(targetId);
    if (fromIndex < 0 || toIndex < 0) return;
    nextPages.splice(fromIndex, 1);
    nextPages.splice(toIndex, 0, sourceId);
    persistConfig({ ...pagesConfig, pages: nextPages });
  };

  const handleToggleEdit = () => {
    const currentSettings = pageSettings[activePage];
    if (currentSettings?.hidden) setActivePage('home');
    if (editMode && typeof window !== 'undefined') {
      window.dispatchEvent(new window.CustomEvent('tunet:edit-done'));
    }
    if (setEditMode) setEditMode(!editMode);
  };

  const roundBtn =
    'flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] transition-all hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]';

  return (
    <div className="mt-4 flex items-center gap-3">
      {/* Page icon buttons — scrollable */}
      <div className="scrollbar-hide flex min-w-0 items-center gap-3 overflow-x-auto">
        {pages.map((page) => {
          const settings = pageSettings[page.id] || {};
          const isHidden = settings.hidden;
          const hideSinglePagePill = settings.hideSinglePagePill === true;
          const Icon = settings.icon ? getIconComponent(settings.icon) || page.icon : page.icon;
          const isDragOver = dragOverId === page.id;

          if (!editMode && isHidden) return null;
          if (!editMode && isSinglePage && hideSinglePagePill) return null;

          return (
            <button
              key={page.id}
              draggable={editMode}
              onClick={() => (editMode ? setEditingPage(page.id) : setActivePage(page.id))}
              onDragStart={(event) => {
                if (!editMode) return;
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', page.id);
              }}
              onDragOver={(event) => {
                if (!editMode) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                setDragOverId(page.id);
              }}
              onDragLeave={() => {
                if (!editMode) return;
                setDragOverId(null);
              }}
              onDrop={(event) => {
                if (!editMode) return;
                event.preventDefault();
                const sourceId = event.dataTransfer.getData('text/plain');
                setDragOverId(null);
                movePage(sourceId, page.id);
              }}
              onDragEnd={() => setDragOverId(null)}
              className={`relative flex h-12 w-12 items-center justify-center rounded-full border transition-all ${
                activePage === page.id
                  ? 'border-transparent bg-[var(--accent-color)] text-[var(--accent-foreground)]'
                  : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
              } ${editMode && isHidden ? 'scale-95 opacity-50' : ''} ${editMode ? 'cursor-move' : ''} ${isDragOver ? 'ring-2 ring-[var(--accent-color)]' : ''}`}
              title={settings.label || page.label}
            >
              <Icon className={`h-5 w-5 ${editMode && isHidden ? 'animate-pulse' : ''}`} />
              {editMode && (
                <Edit2 className="absolute -top-0.5 -right-0.5 h-3 w-3 text-[var(--accent-color)]" />
              )}
            </button>
          );
        })}

        {/* Add page button (edit mode only) */}
        {editMode && (
          <button
            type="button"
            onClick={() => setShowAddPageModal(true)}
            className={roundBtn}
            title={t('nav.addPage')}
          >
            <Plus className="h-5 w-5" />
          </button>
        )}
      </div>
      {/* end scrollable page icons */}

      {/* Controls — outside overflow so dropdown isn't clipped */}
      <div className="flex shrink-0 items-center gap-3">
        {/* Separator */}
        <div className="h-6 w-px bg-[var(--glass-border)]" />

        {/* Add Card button (edit mode only) */}
        {editMode && setShowAddCardModal && (
          <button
            type="button"
            onClick={() => setShowAddCardModal(true)}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-transparent bg-[var(--accent-bg)] text-[var(--accent-color)] transition-all hover:bg-[var(--accent-color)] hover:text-[var(--accent-foreground)]"
            title={t('nav.addCard')}
          >
            <Plus className="h-5 w-5" />
          </button>
        )}

        {/* Edit / Done toggle */}
        {setEditMode && (
          <button
            type="button"
            onClick={handleToggleEdit}
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition-all ${
              editMode
                ? 'border-[var(--accent-color)] bg-[var(--accent-bg)] text-[var(--accent-color)]'
                : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
            }`}
            title={editMode ? t('nav.done') : t('menu.edit')}
          >
            {editMode ? <Check className="h-5 w-5" /> : <Edit2 className="h-5 w-5" />}
          </button>
        )}

        {/* Settings dropdown */}
        {setShowConfigModal && (
          <div className="relative">
            <SettingsDropdown
              upward
              buttonClassName={`flex h-12 w-12 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] transition-all hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]`}
              onOpenSettings={() => {
                setShowConfigModal(true);
                if (setConfigTab) setConfigTab('connection');
              }}
              onOpenTheme={() => setShowThemeSidebar && setShowThemeSidebar(true)}
              onOpenLayout={() => setShowLayoutSidebar && setShowLayoutSidebar(true)}
              onOpenHeader={() => setShowHeaderEditModal && setShowHeaderEditModal(true)}
              t={t}
            />
            {updateCount > 0 && (
              <div className="pointer-events-none absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[var(--card-bg)] bg-gray-600 shadow-sm">
                <span className="pt-[1px] text-[11px] leading-none font-bold text-white">
                  {updateCount}
                </span>
              </div>
            )}
            {connected === false && (
              <div className="pointer-events-none absolute -right-1 -bottom-1 h-3 w-3 rounded-full border-2 border-[var(--card-bg)] bg-red-500" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
