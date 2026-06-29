import React, { useEffect, useMemo, useState } from 'react';

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
  embedded?: false;
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
  embedded: true;
  isOpen?: never;
  close?: never;
  onSaved: () => void;
  submitRef: React.MutableRefObject<(() => void) | null>;
  onOpenActionsView: (actionIndex: number | null) => void;
  updateActionRef: React.MutableRefObject<((action: Action, idx: number | null) => void) | null>;
  getActionsRef: React.MutableRefObject<(() => Action[]) | null>;
}

type EditEventModalProps = EditEventModalStandaloneProps | EditEventModalEmbeddedProps;

// Редактор события
// Два режима:
// - standalone (по умолчанию) - новое окно
// - embedded - замена текущего контента

export const EditEventModal: React.FC<EditEventModalProps> = (props) => {
  const { smId, controller, state, event, currentEventIndex, embedded } = props;

  const modelController = useModelContext();

  const trigger = useTrigger(smId, controller, true, event?.trigger);
  const condition = useCondition(smId, controller, event?.condition);
  const actions = useActions(smId, controller, event?.do ?? null);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!embedded) return;
    trigger.parse(event?.trigger);
    condition.parse(event?.condition);
    actions.parse(smId, event?.do ?? undefined);
    setError(undefined);
  }, [embedded, event]);

  if (embedded) {
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
  }

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!state) return;

    const { selectedComponent, selectedMethod } = trigger;
    const triggerText = trigger.text.trim();

    if (
      (trigger.tabValue === 0 && (!selectedComponent || !selectedMethod)) ||
      (trigger.tabValue === 1 && !triggerText)
    ) {
      setError(`Необходимо выбрать триггер ("Когда")!`);
      return;
    }

    if (trigger.tabValue === 0 && selectedComponent === 'System') {
      const duplicated = state.data.events.findIndex(
        (val) =>
          (val.trigger as unknown as Event).component === 'System' &&
          (val.trigger as unknown as Event).method === selectedMethod
      );
      if (duplicated !== -1 && currentEventIndex !== duplicated) {
        const signalName = selectedMethod
          ? systemComponent.signals[selectedMethod]?.alias ?? selectedMethod
          : selectedMethod;
        setError(`Cистемное событие «${signalName}» уже создано! Второй раз его создать нельзя.`);
        return;
      }
    }

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

    //Проверка на наличие пустых блоков условия, если же они пустые, то форма не отправляется
    if (showCondition && show && !isElse) {
      const errors = condition.checkForErrors();
      for (const key in errors) {
        if (errors[key]) return;
      }
    }

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

    if (trigger.tabValue === 0) {
      for (const eventIdx in state.data.events) {
        if (currentEventIndex === Number(eventIdx)) continue;
        const ev = state.data.events[eventIdx];
        const trig = ev.trigger;
        const cond = ev.condition;
        if (
          typeof trig !== 'string' &&
          trig.component === selectedComponent &&
          trig.method === selectedMethod
        ) {
          const newCondition = getCondition();
          if (isEqual(cond, newCondition)) {
            setError(
              `Событие ${selectedComponent}.${selectedMethod} с таким условием уже существует!`
            );
            return;
          }
        }
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

    if (embedded) {
      props.onSaved();
    } else {
      props.close();
    }
  };

  const handleAfterClose = () => {
    trigger.clear();
    actions.clear();
    condition.clear();
    setError(undefined);
  };

  const showCondition = useMemo(
    () => trigger.selectedComponent !== 'System',
    [trigger.selectedComponent]
  );

  const content = (
    <div className="flex flex-col gap-3">
      <Trigger event={event} {...trigger} />
      {showCondition && <Condition {...condition} />}
      <Actions
        event={event}
        {...actions}
        {...(embedded
          ? {
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
            }
          : {})}
      />
      {error && <div className="text-error">{error}</div>}
    </div>
  );

  if (embedded) {
    // Пробрасываем handleSubmit в StateModal через ref
    props.submitRef.current = handleSubmit;
    return content;
  }

  return (
    <Modal
      title="Редактор события:"
      onSubmit={handleSubmit}
      isOpen={props.isOpen}
      onRequestClose={props.close}
      onAfterClose={handleAfterClose}
    >
      {content}
    </Modal>
  );
};
