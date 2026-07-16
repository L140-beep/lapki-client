import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';

import { isEqual } from 'lodash';
import { toast } from 'sonner';

import { Modal } from '@renderer/components/UI';
import { CanvasController } from '@renderer/lib/data/ModelController/CanvasController';
import { systemComponent } from '@renderer/lib/data/PlatformManager';
import { State } from '@renderer/lib/drawable';
import { useModelContext } from '@renderer/store/ModelContext';
import { Action, Event, EventData } from '@renderer/types/diagram';

import { Actions, Trigger, Condition } from './components';
import { useTrigger, useActions, useCondition } from './hooks';

interface EditEventModalBaseProps {
  smId: string;
  controller: CanvasController;
  state: State | null;
  event: EventData | null | undefined;
  currentEventIndex: number | undefined;
}

interface EditEventModalStandaloneProps extends EditEventModalBaseProps {
  isOpen: boolean;
  close: () => void;
  submitRef?: never;
  onSaved?: never;
  onOpenActionsView?: never;
  updateActionRef?: never;
  getActionsRef?: never;
}

// Отображение контента без создания нового модального окна
interface EditEventModalEmbeddedProps extends EditEventModalBaseProps {
  isOpen?: never;
  close?: never;
  onSaved: () => void;
  submitRef: React.MutableRefObject<(() => void) | null>;
  onOpenActionsView: (actionIndex: number | null) => void;
  updateActionRef: React.MutableRefObject<((action: Action, idx: number | null) => void) | null>;
  getActionsRef: React.MutableRefObject<(() => Action[]) | null>;
}

type EditEventModalProps = EditEventModalEmbeddedProps;

export const EditEventModal: React.FC<EditEventModalProps> = (props) => {
  const { smId, controller, state, event, currentEventIndex } = props;

  const modelController = useModelContext();

  const trigger = useTrigger(smId, controller, true, event?.trigger);
  const condition = useCondition(smId, controller, event?.condition);
  const actions = useActions(smId, controller, event?.do ?? null);
  const [error, setError] = useState<string | undefined>(undefined);
  const [warning, setWarning] = useState<string | undefined>(undefined);

  useEffect(() => {
    trigger.parse(event?.trigger);
    condition.parse(event?.condition);
    actions.parse(smId, event?.do ?? undefined);
    setError(undefined);
    setWarning(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);

  useEffect(() => {
    if (!props.updateActionRef || !props.submitRef) return;
    props.submitRef.current = handleSubmit;
    props.updateActionRef.current = (action: Action, idx: number | null) => {
      actions.setActions((prev) => {
        const next = [...prev];
        if (idx !== null) {
          next[idx] = action;
        } else {
          next.push(action);
        }
        return next;
      });
    };
    props.getActionsRef.current = () => actions.actions;
  }, [actions, props.updateActionRef, props.submitRef]);

  const showCondition = useMemo(
    () => trigger.selectedComponent !== 'System',
    [trigger.selectedComponent]
  );

  const { selectedComponent, selectedMethod } = trigger;

  const {
    show,
    isParamOneInput1,
    selectedComponentParam1,
    selectedMethodParam1,
    isParamOneInput2,
    selectedComponentParam2,
    selectedMethodParam2,
    argsParam1,
    argsParam2,
    conditionOperator,
    isElse,
  } = condition;

  // Собирает условие в том же формате, в котором оно хранится в state.data.events, чтобы можно было сравнивать
  const getCondition = () => {
    if (!show || !showCondition) return undefined;
    if (isElse) return 'else';
    if (condition.tabValue === 0) {
      // Тут много as string потому что проверка на null в checkForErrors
      return {
        type: conditionOperator as string,
        value: [
          {
            type: isParamOneInput1 ? 'component' : 'value',
            value: isParamOneInput1
              ? {
                  component: selectedComponentParam1 as string,
                  method: selectedMethodParam1 as string,
                  args: {},
                }
              : (argsParam1 as string),
          },
          {
            type: isParamOneInput2 ? 'component' : 'value',
            value: isParamOneInput2
              ? {
                  component: selectedComponentParam2 as string,
                  method: selectedMethodParam2 as string,
                  args: {},
                }
              : (argsParam2 as string),
          },
        ],
      };
    }
    return condition.text.trim() || undefined;
  };

  // Проверка событий на конфликты
  const validateEventConflict = (): { type: 'error' | 'warning'; message: string } | undefined => {
    if (!state) return undefined;
    if (trigger.tabValue !== 0 || !selectedComponent || !selectedMethod) return undefined;

    if (selectedComponent === 'System') {
      const duplicated = state.data.events.findIndex(
        (val) =>
          (val.trigger as unknown as Event).component === 'System' &&
          (val.trigger as unknown as Event).method === selectedMethod
      );
      if (duplicated !== -1 && currentEventIndex !== duplicated) {
        const signalName = systemComponent.signals[selectedMethod]?.alias ?? selectedMethod;
        return {
          type: 'error',
          message: `Cистемное событие «${signalName}» уже создано! Второй раз его создать нельзя.`,
        };
      }
      return undefined;
    }

    const newCondition = getCondition();
    for (const eventIdx in state.data.events) {
      if (currentEventIndex === Number(eventIdx)) continue;
      const ev = state.data.events[eventIdx];
      const trig = ev.trigger;
      if (
        typeof trig === 'string' ||
        trig.component !== selectedComponent ||
        trig.method !== selectedMethod
      ) {
        continue;
      }

      if (isEqual(ev.condition, newCondition)) {
        return {
          type: 'error',
          message: `Событие ${selectedComponent}.${selectedMethod} с таким условием уже существует!`,
        };
      }

      const otherHasCondition = ev.condition !== undefined;
      const thisHasCondition = newCondition !== undefined;
      if (otherHasCondition !== thisHasCondition) {
        return {
          type: 'warning',
          message: `Событие ${selectedComponent}.${selectedMethod} уже существует ${
            otherHasCondition ? 'с условием' : 'без условия'
          }. Одновременное наличие события с условием и без условия может работать некорректно.`,
        };
      }
    }
    return undefined;
  };

  // Динамическая проверка конфликтов без нажатия кнопки сохранения
  useLayoutEffect(() => {
    const conflict = validateEventConflict();
    setError(conflict?.type === 'error' ? conflict.message : undefined);
    setWarning(conflict?.type === 'warning' ? conflict.message : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedComponent,
    selectedMethod,
    show,
    isElse,
    isParamOneInput1,
    selectedComponentParam1,
    selectedMethodParam1,
    isParamOneInput2,
    selectedComponentParam2,
    selectedMethodParam2,
    argsParam1,
    argsParam2,
    conditionOperator,
    condition.tabValue,
    condition.text,
  ]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!state) return;

    const triggerText = trigger.text.trim();

    if (
      (trigger.tabValue === 0 && (!selectedComponent || !selectedMethod)) ||
      (trigger.tabValue === 1 && !triggerText)
    ) {
      setError(`Необходимо выбрать триггер ("Когда")!`);
      return;
    }

    const conflict = validateEventConflict();
    if (conflict?.type === 'error') {
      setError(conflict.message);
      return;
    }

    //Проверка на наличие пустых блоков условия, если же они пустые, то форма не отправляется
    if (showCondition && show && !isElse) {
      const errors = condition.checkForErrors();
      for (const key in errors) {
        if (errors[key]) return;
      }
    }

    const getTrigger = () => {
      if (trigger.tabValue === 0)
        return { component: selectedComponent as string, method: selectedMethod as string };
      return triggerText;
    };

    const getActions = () => (actions.tabValue === 0 ? actions.actions : actions.text.trim());

    const getEvents = () => {
      const currentEvent = { trigger: getTrigger(), condition: getCondition(), do: getActions() };
      if (currentEventIndex !== undefined && currentEventIndex >= state.data.events.length) {
        return [...state.data.events, currentEvent];
      }
      if (currentEventIndex !== undefined) {
        return state.data.events.map((e, i) => (i === currentEventIndex ? currentEvent : e));
      }
      return [...state.data.events, currentEvent];
    };

    modelController.changeState({ smId, id: state.id, events: getEvents() });
    toast.success('Событие сохранено!');

    props.onSaved();
  };

  const handleAfterClose = () => {
    trigger.clear();
    actions.clear();
    condition.clear();
    setError(undefined);
    setWarning(undefined);
  };

  const content = (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <Trigger event={event} {...trigger} />
      {showCondition && <Condition {...condition} />}
      <div className="min-h-0 flex-1">
        <Actions
          event={event}
          {...actions}
          disabled={!!error}
          {...{
            onAddAction: () => props.onOpenActionsView(null),
            onChangeAction: (action) => {
              const idx = actions.actions.findIndex(
                (a) =>
                  a.component === action.component &&
                  a.method === action.method &&
                  JSON.stringify(a.args) === JSON.stringify(action.args)
              );
              props.onOpenActionsView(idx !== -1 ? idx : null);
            },
          }}
        />
      </div>
      {error && <div className="text-error">{error}</div>}
    </div>
  );
  return content;
};
