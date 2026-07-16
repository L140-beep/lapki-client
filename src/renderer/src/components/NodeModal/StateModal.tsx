import React, { useEffect, useRef, useState } from 'react';

import { useModal } from '@renderer/hooks/useModal';
import { CanvasController } from '@renderer/lib/data/ModelController/CanvasController';
import { PlatformManager } from '@renderer/lib/data/PlatformManager';
import { State } from '@renderer/lib/drawable';
import { useModelContext } from '@renderer/store/ModelContext';
import { Action, Component, EventData } from '@renderer/types/diagram';

import { ActionsModal, ActionsModalData } from './ActionsModal/ActionsModal';
import { ColorField } from './components';
import { EventsHierarchy } from './components/EventsHierarchy';
import { EditEventModal } from './EditEventModal';
import { useViewStack } from './hooks/useViewStack';

import { MovingModal } from '../UI/Modal/MovingModal';

interface StateModalProps {
  smId: string;
  controller: CanvasController;
}

type StateView = 'editEvent' | 'actions';

/**
 * Модальное окно редактирования состояния
 */
export const StateModal: React.FC<StateModalProps> = ({ smId, controller }) => {
  const modelController = useModelContext();
  const components = modelController.model.useData(smId, 'elements.components') as {
    [id: string]: Component;
  };
  const visual = modelController.model.useData(smId, 'elements.visual') as boolean;
  modelController.model.useData(smId, 'elements.states');
  const platforms = controller.useData('platform') as { [id: string]: PlatformManager };
  const platform = platforms[smId];

  const [isOpen, open, close] = useModal(false);
  const [state, setState] = useState<State | null>(null);
  const [currentEventIndex, setCurrentEventIndex] = useState<number | undefined>();
  const [currentEvent, setCurrentEvent] = useState<EventData | null>(null);
  const [color, setColor] = useState<string | undefined>();

  // Индекс выбранного действия в иерархии (только для подсветки, не влияет на экран)
  const [selectedActionIndex, setSelectedActionIndex] = useState<number | null>(null);

  const [actionsIdx, setActionsIdx] = useState<number | null>(null);
  const [actionsData, setActionsData] = useState<ActionsModalData | undefined>();

  const viewStack = useViewStack<StateView>({ view: 'editEvent', title: 'Редактор события' });

  const editEventSubmitRef = useRef<(() => void) | null>(null);
  const actionsSubmitRef = useRef<(() => void) | null>(null);
  const updateActionRef = useRef<((action: Action, idx: number | null) => void) | null>(null);
  const getActionsRef = useRef<(() => Action[]) | null>(null);

  const stateName = state?.data.name ?? '';

  useEffect(() => {
    const handler = (s: State) => {
      console.log('CHANGE STATE EVENT');
      setState(s);
      setColor(s.data.color);
      // Сразу выбираем первое событие если оно есть
      if (s.data.events.length > 0) {
        setCurrentEventIndex(0);
        setCurrentEvent(s.data.events[0]);
      } else {
        setCurrentEventIndex(undefined);
        setCurrentEvent(null);
      }
      setSelectedActionIndex(null);
      viewStack.reset({ view: 'editEvent', title: 'Редактор события' });
      open();
    };

    controller.states.on('changeState', handler);
    return () => controller.states.off('changeState', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAfterClose = () => {
    if (state && state.data.color !== color) {
      modelController.changeState({ ...state.data, color, smId, id: state.id });
    }
    debugger;
    setColor(undefined);
    setState(null);
    setCurrentEvent(null);
    setCurrentEventIndex(undefined);
    setSelectedActionIndex(null);
    viewStack.reset({ view: 'editEvent', title: 'Редактор события' });
    close();
  };

  const addEvent = () => {
    if (!state) return;
    const newIndex = state.data.events.length;
    setCurrentEventIndex(newIndex);
    setCurrentEvent({ trigger: { component: 'System', method: 'onEnter' }, do: [] });
    setSelectedActionIndex(null);
    viewStack.reset({ view: 'editEvent', title: 'Редактор события' });
  };

  const removeEvent = () => {
    if (!state || currentEventIndex === undefined) return;
    const events =
      state.data.events.length === 1
        ? []
        : [
            ...state.data.events.slice(0, currentEventIndex),
            ...state.data.events.slice(currentEventIndex + 1),
          ];
    modelController.changeState({ smId, id: state.id, events }, true);
    // Выбираем соседнее событие после удаления
    setCurrentEvent(currentEventIndex !== undefined ? events[currentEventIndex - 1] : null);
    setSelectedActionIndex(null);
    viewStack.reset({ view: 'editEvent', title: 'Редактор события' });
  };

  // Клик по событию в иерархии
  const handleSelectEvent = (eventIndex: number) => {
    console.log('HANDLE SELECT ACTION');
    if (!state) return;
    setCurrentEventIndex(eventIndex);
    setCurrentEvent(state.data.events[eventIndex]);
    setSelectedActionIndex(null);
    console.log('before reset');
    viewStack.reset({ view: 'editEvent', title: 'Редактор события' });
    console.log('after reset');
  };

  useEffect(() => {
    console.log('view changed', viewStack.currentView);
  }, [viewStack.currentView]);

  // Клик по действию в иерархии
  const handleSelectAction = (eventIndex: number, actionIndex: number) => {
    if (!state) return;
    debugger;
    setCurrentEventIndex(eventIndex);
    setCurrentEvent(state.data.events[eventIndex]);
    setSelectedActionIndex(actionIndex);

    const actions = state.data.events[eventIndex].do;
    const action = Array.isArray(actions) ? actions[actionIndex] : undefined;
    console.log(action);
    setActionsIdx(actionIndex);
    setActionsData(action ? { smId, action, isEditingEvent: false } : undefined);
    viewStack.reset({ view: 'actions', title: 'Выберите действие' });
  };

  // Переход на экран actions из EditEventContent
  const handleOpenActionsView = (actionIndex: number | null) => {
    debugger;
    setActionsIdx(actionIndex);
    setSelectedActionIndex(actionIndex);

    const currentActions = getActionsRef.current?.() ?? [];
    setActionsData(
      actionIndex !== null && currentActions[actionIndex]
        ? { smId, action: currentActions[actionIndex], isEditingEvent: false }
        : undefined
    );
    viewStack.reset({ view: 'actions', title: 'Выберите действие' });
  };

  const handleActionsSubmit = (data: Action, idx: number | null) => {
    updateActionRef.current?.(data, idx);
    debugger;
    setSelectedActionIndex(null);
    viewStack.pop();
    setTimeout(() => editEventSubmitRef.current?.(), 0);
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (viewStack.currentView === 'editEvent') editEventSubmitRef.current?.();
    if (viewStack.currentView === 'actions') actionsSubmitRef.current?.();
  };

  return (
    <MovingModal
      id="shit"
      title={`Редактор состояния: ${stateName}`}
      isOpen={isOpen}
      onRequestClose={close}
      onAfterClose={handleAfterClose}
      onSubmit={currentEventIndex !== undefined ? handleModalSubmit : undefined}
      submitLabel="Сохранить"
      cancelLabel="Отмена"
      onCancel={viewStack.canGoBack ? viewStack.pop : undefined}
      hideCancelButton={!viewStack.canGoBack}
      className="h-[440px] w-[830px]"
    >
      <div className="flex h-full gap-4">
        {/* Левая панель: иерархия событий */}
        <div className="w-[284px] flex-shrink-0">
          <EventsHierarchy
            smId={smId}
            platform={platform}
            events={state?.data.events ?? []}
            components={components}
            visual={visual}
            selectedEventIndex={currentEventIndex}
            selectedActionIndex={selectedActionIndex}
            onSelectEvent={handleSelectEvent}
            onSelectAction={handleSelectAction}
            onAddEvent={addEvent}
            onRemoveEvent={removeEvent}
          />
        </div>

        {/* Правая панель: редактор */}
        <div className="h-[290px] min-w-0 flex-1">
          {currentEventIndex === undefined ? (
            <div className="flex h-full items-center justify-center text-text-inactive">
              Выберите событие или создайте новое
            </div>
          ) : (
            <div className="h-full">
              <div className="h-full" hidden={viewStack.currentView !== 'editEvent'}>
                <EditEventModal
                  smId={smId}
                  controller={controller}
                  state={state}
                  event={currentEvent}
                  currentEventIndex={currentEventIndex}
                  onSaved={() => {}}
                  submitRef={editEventSubmitRef}
                  onOpenActionsView={handleOpenActionsView}
                  updateActionRef={updateActionRef}
                  getActionsRef={getActionsRef}
                />
              </div>

              <div hidden={viewStack.currentView !== 'actions'}>
                <ActionsModal
                  embedded
                  smId={smId}
                  controller={controller}
                  initialData={actionsData}
                  idx={actionsIdx}
                  onSubmit={handleActionsSubmit}
                  submitRef={actionsSubmitRef}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </MovingModal>
  );
};
