import React, { useEffect, useRef, useState } from 'react';

import { ReactComponent as AddIcon } from '@renderer/assets/icons/add.svg';
import { ReactComponent as EditIcon } from '@renderer/assets/icons/edit.svg';
import { ReactComponent as SubtractIcon } from '@renderer/assets/icons/subtract.svg';
import { Modal } from '@renderer/components/UI';
import { useModal } from '@renderer/hooks/useModal';
import { serializeCondition, serializeEvent } from '@renderer/lib/data/GraphmlBuilder';
import { CanvasController } from '@renderer/lib/data/ModelController/CanvasController';
import { PlatformManager } from '@renderer/lib/data/PlatformManager';
import { State } from '@renderer/lib/drawable';
import { useModelContext } from '@renderer/store/ModelContext';
import { Action, Component, Condition, EventData } from '@renderer/types/diagram';

import { ActionsModal, ActionsModalData } from './ActionsModal/ActionsModal';
import { ColorField, Event as EventPicto } from './components';
import { EditEventModal } from './EditEventModal';
import { useViewStack } from './hooks/useViewStack';

interface StateModalProps {
  smId: string;
  controller: CanvasController;
}

type StateView = 'state' | 'editEvent' | 'actions';

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

  // Данные для экрана actions
  const [actionsIdx, setActionsIdx] = useState<number | null>(null);
  const [actionsData, setActionsData] = useState<ActionsModalData | undefined>();

  const viewStack = useViewStack<StateView>({ view: 'state', title: '' });

  const editEventSubmitRef = useRef<(() => void) | null>(null);
  const actionsSubmitRef = useRef<(() => void) | null>(null);

  const updateActionRef = useRef<((action: Action, idx: number | null) => void) | null>(null);
  const getActionsRef = useRef<(() => Action[]) | null>(null);

  const stateName = state?.data.name ?? '';

  const titles: Record<StateView, string> = {
    state: `Редактор состояния: ${stateName}`,
    editEvent: 'Редактор события',
    actions: 'Выберите действие',
  };

  useEffect(() => {
    const handler = (s: State) => {
      setState(s);
      setColor(s.data.color);
      viewStack.reset({ view: 'state', title: `Редактор состояния: ${s.data.name}` });
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
    setColor(undefined);
    setState(null);
    setCurrentEvent(null);
    setCurrentEventIndex(undefined);
    viewStack.reset({ view: 'state', title: '' });
    close();
  };

  const addEvent = () => {
    if (!state) return;
    setCurrentEventIndex(state.data.events.length);
    setCurrentEvent({ trigger: { component: 'System', method: 'onEnter' }, do: [] });
    viewStack.push({ view: 'editEvent', title: 'Редактор события' });
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
    setCurrentEventIndex(undefined);
  };

  const openEditEvent = () => {
    if (currentEventIndex === undefined) return;
    viewStack.push({ view: 'editEvent', title: 'Редактор события' });
  };

  // Переход на экран actions из EditEventContent
  const handleOpenActionsView = (actionIndex: number | null) => {
    setActionsIdx(actionIndex);

    // Читаем текущие actions из EditEventContent
    const currentActions = getActionsRef.current?.() ?? [];
    setActionsData(
      actionIndex !== null && currentActions[actionIndex]
        ? { smId, action: currentActions[actionIndex], isEditingEvent: false }
        : undefined
    );

    viewStack.push({ view: 'actions', title: 'Выберите действие' });
  };

  // Возврат из ActionsContent и запись действия в EditEventContent
  const handleActionsSubmit = (data: Action, idx: number | null) => {
    updateActionRef.current?.(data, idx);
    viewStack.pop();
  };

  // Кнопка "Сохранить" или "Выбрать" делегируется дочернему экрану
  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (viewStack.currentView === 'editEvent') editEventSubmitRef.current?.();
    if (viewStack.currentView === 'actions') actionsSubmitRef.current?.();
  };

  const getCondition = (condition: string | Condition | undefined) => {
    if (!condition) return '';
    if (typeof condition === 'string') return `[${condition}]`;
    return `[${serializeCondition(condition, platform.data, components, true)}]`;
  };

  // Конфигурация кнопок в зависимости от текущего экрана
  const isStateView = viewStack.currentView === 'state';
  const modalProps = isStateView
    ? {
        onSubmit: undefined as React.FormEventHandler | undefined,
        cancelLabel: 'Закрыть',
        onCancel: undefined as (() => void) | undefined,
      }
    : {
        onSubmit: handleModalSubmit,
        submitLabel: viewStack.currentView === 'actions' ? 'Выбрать' : 'Сохранить',
        cancelLabel: 'Отмена',
        onCancel: viewStack.pop,
      };

  return (
    <Modal
      title={titles[viewStack.currentView]}
      isOpen={isOpen}
      onRequestClose={close}
      onAfterClose={handleAfterClose}
      {...modalProps}
    >
      {/* Экран списка событий состояния */}
      <div hidden={!isStateView}>
        <div className="flex flex-col gap-3">
          <div className="flex">
            <div
              onDoubleClick={addEvent}
              className="ml-11 mr-3 h-96 w-full overflow-y-auto break-words rounded border border-border-primary bg-bg-secondary scrollbar-thin scrollbar-track-scrollbar-track scrollbar-thumb-scrollbar-thumb"
            >
              {state &&
                (state.data.events.length === 0 ? (
                  <div className="flex h-full w-full select-none flex-row items-center justify-center text-center align-middle text-text-inactive">
                    <span className="mr-2">Чтобы добавить событие, нажмите</span>
                    <div>
                      <AddIcon className="btn-secondary h-5 w-5 cursor-default border-text-inactive p-[0.5px]" />
                    </div>
                  </div>
                ) : (
                  state.data.events.map((event, key) => (
                    <EventPicto
                      smId={smId}
                      onDoubleClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openEditEvent();
                      }}
                      key={key}
                      event={event.trigger}
                      isSelected={key === currentEventIndex}
                      platform={platform}
                      condition={event.condition}
                      text={`↳ ${
                        typeof event.trigger !== 'string'
                          ? serializeEvent(components, platform.data, event.trigger, visual)
                          : event.trigger
                      }${getCondition(event.condition)}/`}
                      onClick={() => {
                        setCurrentEventIndex(key);
                        setCurrentEvent(state.data.events[key]);
                      }}
                    />
                  ))
                ))}
            </div>
            <div className="flex flex-col gap-2">
              <button type="button" className="btn-secondary border-red p-1" onClick={addEvent}>
                <AddIcon />
              </button>
              <button
                type="button"
                className="btn-secondary p-1"
                onClick={removeEvent}
                disabled={currentEventIndex === undefined}
              >
                <SubtractIcon />
              </button>
              <button
                type="button"
                className="btn-secondary p-1"
                onClick={openEditEvent}
                disabled={currentEventIndex === undefined}
              >
                <EditIcon />
              </button>
            </div>
          </div>
          <ColorField label="Цвет обводки:" value={color} onChange={setColor} />
        </div>
      </div>

      {/*
        Экраны 2 и 3 всегда смонтированы, скрыты через hidden
      */}
      <div hidden={viewStack.currentView !== 'editEvent'}>
        <EditEventModal
          embedded
          smId={smId}
          controller={controller}
          state={state}
          event={currentEvent}
          currentEventIndex={currentEventIndex}
          onSaved={() => viewStack.pop()}
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
    </Modal>
  );
};
