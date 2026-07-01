import React, { useState } from 'react';

import { twMerge } from 'tailwind-merge';

import { ReactComponent as AddIcon } from '@renderer/assets/icons/add.svg';
import { ReactComponent as SubtractIcon } from '@renderer/assets/icons/subtract.svg';
import { serializeCondition, serializeEvent } from '@renderer/lib/data/GraphmlBuilder';
import { PlatformManager } from '@renderer/lib/data/PlatformManager';
import { useModelContext } from '@renderer/store/ModelContext';
import { Action, Component, Condition, EventData } from '@renderer/types/diagram';

interface EventsHierarchyProps {
  smId: string;
  platform: PlatformManager;
  events: EventData[];
  components: { [id: string]: Component };
  visual: boolean;
  selectedEventIndex: number | undefined;
  selectedActionIndex: number | null;
  onSelectEvent: (eventIndex: number) => void;
  onSelectAction: (eventIndex: number, actionIndex: number) => void;
  onAddEvent: () => void;
  onRemoveEvent: () => void;
}

// Левая панель иерархии событий и действий в StateModal.

export const EventsHierarchy: React.FC<EventsHierarchyProps> = ({
  smId,
  platform,
  events,
  components,
  visual,
  selectedEventIndex,
  selectedActionIndex,
  onSelectEvent,
  onSelectAction,
  onAddEvent,
  onRemoveEvent,
}) => {
  const modelController = useModelContext();
  const visualData = modelController.model.useData(smId, 'elements.visual');

  // Множество индексов свёрнутых событий
  const [collapsedEvents, setCollapsedEvents] = useState<Set<number>>(new Set());

  const toggleCollapsed = (eventIdx: number) => {
    setCollapsedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventIdx)) {
        next.delete(eventIdx);
      } else {
        next.add(eventIdx);
      }
      return next;
    });
  };

  const getConditionText = (condition: string | Condition | undefined) => {
    if (!condition) return '';
    if (typeof condition === 'string') return ` [${condition}]`;
    return ` [${serializeCondition(condition, platform.data, components, true)}]`;
  };

  const getTriggerText = (event: EventData) => {
    if (typeof event.trigger === 'string') return event.trigger;
    return serializeEvent(components, platform.data, event.trigger, visualData as boolean);
  };

  const getActionText = (action: Action) => `${action.component}.${action.method}`;

  const getEventActions = (event: EventData): Action[] => {
    if (!event.do || typeof event.do === 'string') return [];
    return event.do as Action[];
  };

  return (
    <div className="flex h-full flex-col">
      {/* Кнопки управления событиями */}
      <div className="mb-2 flex gap-1">
        <button
          type="button"
          className="btn-secondary p-1"
          onClick={onAddEvent}
          title="Добавить событие"
        >
          <AddIcon />
        </button>
        <button
          type="button"
          className="btn-secondary p-1"
          onClick={onRemoveEvent}
          disabled={selectedEventIndex === undefined}
          title="Удалить событие"
        >
          <SubtractIcon />
        </button>
      </div>

      {/* Список событий с действиями */}
      <div className="flex-1 overflow-y-auto rounded border border-border-primary bg-bg-secondary scrollbar-thin scrollbar-track-scrollbar-track scrollbar-thumb-scrollbar-thumb">
        {events.length === 0 ? (
          <div className="flex h-full select-none items-center justify-center p-4 text-center text-sm text-text-inactive">
            Нет событий
          </div>
        ) : (
          events.map((event, eventIdx) => {
            const isEventSelected = eventIdx === selectedEventIndex;
            const eventActions = getEventActions(event);
            const hasActions = eventActions.length > 0;
            const isCollapsed = collapsedEvents.has(eventIdx);

            return (
              <div key={eventIdx}>
                {/* Строка события */}
                <div
                  className={twMerge(
                    'flex cursor-pointer select-none items-center gap-1 px-1 py-1.5 text-sm hover:bg-bg-hover',
                    isEventSelected && selectedActionIndex === null && 'bg-bg-active'
                  )}
                >
                  {/* Кнопка сворачивания — показывается только если есть действия */}
                  <button
                    type="button"
                    className={twMerge(
                      'flex-shrink-0 rounded p-0.5 transition-transform duration-150 hover:bg-bg-hover',
                      !hasActions && 'invisible'
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCollapsed(eventIdx);
                    }}
                    tabIndex={-1}
                  >
                    <span
                      className={twMerge('block text-xs leading-none', !isCollapsed && 'rotate-90')}
                    >
                      ›
                    </span>
                  </button>

                  {/* Текст события */}
                  <div
                    className="min-w-0 flex-1 truncate"
                    onClick={() => onSelectEvent(eventIdx)}
                    title={getTriggerText(event) + getConditionText(event.condition)}
                  >
                    <span className="font-medium">{getTriggerText(event)}</span>
                    {event.condition && (
                      <span className="text-text-secondary">
                        {getConditionText(event.condition)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Действия события */}
                {!isCollapsed &&
                  eventActions.map((action, actionIdx) => (
                    <div
                      key={actionIdx}
                      className={twMerge(
                        'cursor-pointer select-none truncate py-1 pl-7 pr-2 text-xs text-text-primary hover:bg-bg-hover',
                        isEventSelected && selectedActionIndex === actionIdx && 'bg-bg-active'
                      )}
                      onClick={() => onSelectAction(eventIdx, actionIdx)}
                      title={getActionText(action)}
                    >
                      ↳ {getActionText(action)}
                    </div>
                  ))}

                <hr className="border-border-primary opacity-50" />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
