export const safeVibrate = (ms) => {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (
        typeof navigator.userActivation !== 'undefined' &&
        !navigator.userActivation.hasBeenActive
      ) {
        return; // Avoid "Blocked call to navigator.vibrate" warning
      }
      navigator.vibrate(ms);
    }
  } catch (_e) {
    // Ignore blocked vibration calls
  }
};

export const createDragAndDropHandlers = ({
  editMode,
  pagesConfig,
  setPagesConfig,
  persistConfig,
  activePage,
  dragSourceRef,
  touchTargetRef,
  touchSwapCooldownRef,
  touchPath,
  setTouchPath,
  touchTargetId,
  setTouchTargetId,
  setDraggingId,
  ignoreTouchRef,
  setCardPlacementHint,
}) => {
  const pendingTouchConfigRef = { current: null };
  const touchWorkingConfigRef = { current: null };

  const getTargetPlacement = (cardElement, y) => {
    if (!cardElement || typeof y !== 'number') return 'before';
    const rect = cardElement.getBoundingClientRect();
    return y >= rect.top + rect.height / 2 ? 'after' : 'before';
  };

  const reorderPageCards = (list, sourceCardId, targetCardId, place = 'before') => {
    if (!Array.isArray(list)) return list;
    if (!sourceCardId || !targetCardId || sourceCardId === targetCardId) return list;

    const sourceIndex = list.indexOf(sourceCardId);
    const targetIndex = list.indexOf(targetCardId);
    if (sourceIndex === -1 || targetIndex === -1) return list;

    const next = [...list];
    const [movedItem] = next.splice(sourceIndex, 1);
    const targetIndexAfterRemoval = next.indexOf(targetCardId);
    const insertIndex = place === 'after' ? targetIndexAfterRemoval + 1 : targetIndexAfterRemoval;
    next.splice(Math.max(0, insertIndex), 0, movedItem);
    return next;
  };

  const getCardsInDomOrder = (sourceCardId) =>
    Array.from(document.querySelectorAll('[data-card-id]')).filter(
      (card) => card.getAttribute('data-card-id') !== sourceCardId
    );

  const resolveDropTarget = (x, y, sourceCardId) => {
    const cards = getCardsInDomOrder(sourceCardId);
    if (cards.length === 0) return null;

    const columns = new Map();
    cards.forEach((card) => {
      const cardId = card.getAttribute('data-card-id');
      const colIndex = parseInt(card.getAttribute('data-col-index') || '', 10);
      if (!cardId || !Number.isFinite(colIndex)) return;
      const rect = card.getBoundingClientRect();
      const existing = columns.get(colIndex);
      const item = { card, cardId, colIndex, rect };
      if (existing) {
        existing.cards.push(item);
        existing.left = Math.min(existing.left, rect.left);
        existing.right = Math.max(existing.right, rect.right);
        existing.centerX = (existing.left + existing.right) / 2;
      } else {
        columns.set(colIndex, {
          colIndex,
          left: rect.left,
          right: rect.right,
          centerX: rect.left + rect.width / 2,
          cards: [item],
        });
      }
    });

    const columnList = Array.from(columns.values()).sort((a, b) => a.colIndex - b.colIndex);
    if (columnList.length === 0) return null;

    let targetColumn =
      columnList.find((column) => x >= column.left && x <= column.right) || null;

    if (!targetColumn) {
      targetColumn = columnList.reduce((closest, column) => {
        if (!closest) return column;
        return Math.abs(column.centerX - x) < Math.abs(closest.centerX - x) ? column : closest;
      }, null);
    }

    if (!targetColumn) return null;

    const cardsInColumn = [...targetColumn.cards].sort((a, b) => a.rect.top - b.rect.top);
    const beforeCard = cardsInColumn.find((item) => y < item.rect.top + item.rect.height / 2);
    if (beforeCard) {
      return {
        targetId: beforeCard.cardId,
        targetColIndex: targetColumn.colIndex,
        place: 'before',
      };
    }

    const lastCard = cardsInColumn[cardsInColumn.length - 1];
    if (!lastCard) return null;
    return {
      targetId: lastCard.cardId,
      targetColIndex: targetColumn.colIndex,
      place: 'after',
    };
  };

  const saveConfig = (newConfig) => {
    if (typeof persistConfig === 'function') {
      persistConfig(newConfig);
      return;
    }
    setPagesConfig(newConfig);
    try {
      localStorage.setItem('tunet_pages_config', JSON.stringify(newConfig));
    } catch (error) {
      console.error('Failed to save pages config to localStorage:', error);
    }
  };

  const resetDragState = () => {
    setDraggingId(null);
    dragSourceRef.current = null;
    touchTargetRef.current = null;
    pendingTouchConfigRef.current = null;
    touchWorkingConfigRef.current = null;
    setTouchTargetId(null);
    setTouchPath(null);
  };

  const startTouchDrag = (cardId, index, colIndex, x, y) => {
    if (!editMode) return;
    safeVibrate(50);
    dragSourceRef.current = { index, cardId, colIndex };
    touchTargetRef.current = null;
    pendingTouchConfigRef.current = null;
    touchWorkingConfigRef.current = {
      ...pagesConfig,
      [activePage]: [...(pagesConfig[activePage] || [])],
    };
    setTouchPath({ startX: x, startY: y, x, y });
    setTouchTargetId(null);
    setDraggingId(cardId);
  };

  const moveCard = ({ source, targetId, place }) => {
    const baseConfig = touchWorkingConfigRef.current || pagesConfig;
    const newConfig = { ...baseConfig };
    const currentList = [...(newConfig[activePage] || [])];
    newConfig[activePage] = reorderPageCards(currentList, source.cardId, targetId, place);
    source.index = newConfig[activePage].indexOf(source.cardId);
    touchWorkingConfigRef.current = newConfig;

    return { newConfig, source };
  };

  const updateTouchDrag = (x, y) => {
    if (!editMode || !dragSourceRef.current) return;
    setTouchPath((prev) => (prev ? { ...prev, x, y } : { startX: x, startY: y, x, y }));
    const resolvedTarget = resolveDropTarget(x, y, dragSourceRef.current.cardId);
    if (!resolvedTarget?.targetId) return;

    const { targetId, targetColIndex, place } = resolvedTarget;
    touchTargetRef.current = { targetId, targetColIndex };
    setTouchTargetId(targetId);

    const now = Date.now();
    if (now - touchSwapCooldownRef.current <= 150) return;
    touchSwapCooldownRef.current = now;

    const { newConfig, source } = moveCard({
      source: dragSourceRef.current,
      targetId,
      place,
    });

    dragSourceRef.current = source;
    pendingTouchConfigRef.current = newConfig;
    setPagesConfig(newConfig);
    if (Number.isFinite(targetColIndex)) setCardPlacementHint?.(source.cardId, targetColIndex);
    safeVibrate(10);
  };

  const performTouchDrop = (x, y) => {
    if (!dragSourceRef.current) return;
    const resolvedTarget =
      resolveDropTarget(x, y, dragSourceRef.current.cardId) || touchTargetRef.current;

    if (!resolvedTarget?.targetId || resolvedTarget.targetId === dragSourceRef.current.cardId) {
      if (pendingTouchConfigRef.current) {
        saveConfig(pendingTouchConfigRef.current);
      }
      return;
    }

    const { targetId, targetColIndex } = resolvedTarget;
    const place = resolvedTarget.place || 'after';
    const { newConfig } = moveCard({
      source: dragSourceRef.current,
      targetId,
      place,
    });

    if (Number.isFinite(targetColIndex)) {
      setCardPlacementHint?.(dragSourceRef.current.cardId, targetColIndex);
    }
    saveConfig(newConfig);
    pendingTouchConfigRef.current = null;
    touchWorkingConfigRef.current = null;
    safeVibrate(20);
  };

  const handleTouchEnd = (e) => {
    if (!editMode || !dragSourceRef.current) return;
    const touch = e.changedTouches[0];
    const x = touch.clientX;
    const y = touch.clientY;
    performTouchDrop(x, y);
    resetDragState();
  };

  const handleTouchCancel = (e) => {
    if (!editMode || !dragSourceRef.current) return;
    if (e.cancelable) e.preventDefault();
    const x = touchPath?.x;
    const y = touchPath?.y;
    if (typeof x === 'number' && typeof y === 'number') {
      performTouchDrop(x, y);
    }
    resetDragState();
  };

  const getDragProps = ({ cardId, index, colIndex }) => ({
    draggable: editMode,
    onDragStart: (e) => {
      e.dataTransfer.setData('dragData', JSON.stringify({ index, cardId, colIndex }));
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => setDraggingId(cardId), 0);
    },
    onDragEnd: () => setDraggingId(null),
    onDragOver: (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    },
    onDrop: (e) => {
      e.stopPropagation();
      const rawData = e.dataTransfer.getData('dragData');
      if (!rawData) return;
      const source = JSON.parse(rawData);
      const resolvedTarget = resolveDropTarget(e.clientX, e.clientY, source.cardId);
      if (!resolvedTarget?.targetId) return;
      const newConfig = { ...pagesConfig };
      const currentList = [...(newConfig[activePage] || [])];
      newConfig[activePage] = reorderPageCards(
        currentList,
        source.cardId,
        resolvedTarget.targetId,
        resolvedTarget.place
      );

      if (Number.isFinite(resolvedTarget.targetColIndex)) {
        setCardPlacementHint?.(source.cardId, resolvedTarget.targetColIndex);
      }
      saveConfig(newConfig);
      setDraggingId(null);
    },
    onTouchStart: (e) => {
      if (ignoreTouchRef.current) return;
      if (!editMode) return;
      if (!e.target.closest('[data-drag-handle]')) return;
      if (e.cancelable) e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      startTouchDrag(cardId, index, colIndex, touch.clientX, touch.clientY);
    },
    onTouchMove: (e) => {
      if (ignoreTouchRef.current) return;
      if (!editMode || !dragSourceRef.current) return;
      if (e.cancelable) e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      updateTouchDrag(touch.clientX, touch.clientY);
    },
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchCancel,
    'data-card-id': cardId,
    'data-index': index,
    'data-col-index': colIndex,
  });

  const getCardStyle = ({ cardId, isHidden, isDragging }) => {
    const isTouchTarget = !!touchTargetId && touchTargetId === cardId;

    const style = {
      backgroundColor: isDragging ? 'rgba(30, 58, 138, 0.6)' : '#ffffff',
      borderColor: isDragging
        ? 'rgba(96, 165, 250, 1)'
        : editMode
          ? 'rgba(59, 130, 246, 0.2)'
          : 'var(--card-border)',
      backdropFilter: 'blur(16px)',
      borderStyle: 'solid',
      borderWidth: editMode ? '2px' : '1px',
      borderRadius: 'var(--card-border-radius, 16px)',
      opacity: isHidden && editMode ? 0.4 : 1,
      filter: isHidden && editMode ? 'grayscale(100%)' : 'none',
      transform: isDragging ? 'scale(1.08)' : 'none',
      animation:
        editMode && !isDragging ? 'editJiggle 0.3s infinite alternate ease-in-out' : 'none',
      // Randomize animation start slightly based on card char code sum so they don't sync perfectly
      animationDelay:
        editMode && !isDragging
          ? `${(cardId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 10) / -10}s`
          : '0s',
      boxShadow: isDragging
        ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        : isTouchTarget
          ? '0 0 0 2px rgba(59, 130, 246, 0.6), 0 0 30px rgba(59, 130, 246, 0.35)'
          : editMode
            ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
            : '0 2px 8px rgba(0, 0, 0, 0.07)',
      zIndex: isDragging ? 50 : 1,
      pointerEvents: isDragging ? 'none' : 'auto',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    };

    return style;
  };

  return {
    getDragProps,
    getCardStyle,
    isTouchTarget: (cardId) => !!touchTargetId && touchTargetId === cardId,
    startTouchDrag,
    updateTouchDrag,
    performTouchDrop,
    resetDragState,
  };
};
