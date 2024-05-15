import React, { useEffect, useState } from 'react';

import { EventsModal, EventsModalData } from '@renderer/components';
import { Modal, ColorInput } from '@renderer/components/UI';
import { useModal } from '@renderer/hooks/useModal';
import { DEFAULT_TRANSITION_COLOR } from '@renderer/lib/constants';
import { operatorSet } from '@renderer/lib/data/PlatformManager';
import { State, Transition } from '@renderer/lib/drawable';
import { useEditorContext } from '@renderer/store/EditorContext';
import {
  Action,
  Condition as ConditionData,
  Event,
  Event as StateEvent,
  Variable as VariableData,
  Transition as TransitionData,
} from '@renderer/types/diagram';

import { Condition } from './Condition';
import { EventsBlock } from './EventsBlock';
import { useCondition } from './hooks/useCondition';
import { useTrigger } from './hooks/useTrigger';
import { Trigger } from './Trigger';

export const TransitionModal: React.FC = () => {
  const editor = useEditorContext();

  const [isOpen, open, close] = useModal(false);

  const [transition, setTransition] = useState<Transition | null>(null);
  const [newTransition, setNewTransition] = useState<{ source: State; target: State } | null>();

  const [formState, setFormState] = useState<'submitted' | 'default'>('default');

  const [isEventsModalOpen, openEventsModal, closeEventsModal] = useModal(false);
  const [eventsModalData, setEventsModalData] = useState<EventsModalData>();

  // Данные формы
  const trigger = useTrigger(false);
  const condition = useCondition(formState);
  const [events, setEvents] = useState<Action[]>([]);
  const [color, setColor] = useState(DEFAULT_TRANSITION_COLOR);

  const handleAddEvent = () => {
    setEventsModalData(undefined);
    openEventsModal();
  };
  const handleChangeEvent = (event: Action) => {
    setEventsModalData(event && { event, isEditingEvent: false });
    openEventsModal();
  };
  const handleDeleteEvent = (index: number) => {
    setEvents((p) => p.filter((_, i) => index !== i));
  };

  const handleEventsModalSubmit = (data: Event) => {
    if (eventsModalData) {
      setEvents((p) => {
        const { component, method } = eventsModalData.event;
        const prevEventIndex = p.findIndex((v) => v.component === component && v.method === method);

        if (prevEventIndex === -1) return p;

        const newEvents = [...p];

        newEvents[prevEventIndex] = data;

        return newEvents;
      });
    } else {
      setEvents((p) => [...p, data]);
    }

    closeEventsModal();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    setFormState('submitted');

    const { selectedComponent, selectedMethod } = trigger;

    if (!selectedComponent || !selectedMethod) return;

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
    } = condition;

    //Проверка на наличие пустых блоков условия, если же они пустые, то форма не отправляется
    if (show) {
      const errors = condition.checkForErrors();

      for (const key in errors) {
        if (errors[key]) return;
      }
    }

    const resultCondition = !show
      ? undefined
      : {
          type: conditionOperator!,
          value: [
            {
              type: isParamOneInput1 ? 'component' : 'value',
              value: isParamOneInput1
                ? {
                    component: selectedComponentParam1!,
                    method: selectedMethodParam1!,
                    args: {},
                  }
                : argsParam1!,
            },
            {
              type: isParamOneInput2 ? 'component' : 'value',
              value: isParamOneInput2
                ? {
                    component: selectedComponentParam2!,
                    method: selectedMethodParam2!,
                    args: {},
                  }
                : argsParam2!,
            },
          ],
        };

    const resultTrigger =
      selectedComponent && selectedMethod
        ? { component: selectedComponent, method: selectedMethod }
        : undefined;

    if (transition) {
      editor.controller.transitions.changeTransition({
        id: transition.id,
        source: transition.data.source,
        target: transition.data.target,
        color,
        label: {
          trigger: resultTrigger,
          condition: resultCondition,
          do: [],
        },
      });

      close();
    }

    if (newTransition) {
      editor.controller.transitions.createTransition({
        source: newTransition.source.id,
        target: newTransition.target.id,
        color,
        label: {
          trigger: resultTrigger,
          condition: resultCondition,
          do: [],
        },
      });
    }

    close();
  };

  // Сброс формы после закрытия
  const handleAfterClose = () => {
    trigger.setSelectedComponent(null);
    trigger.setSelectedMethod(null);

    condition.setSelectedComponentParam1('');
    condition.setSelectedComponentParam2('');
    condition.setArgsParam1('');
    condition.setConditionOperator('');
    condition.setSelectedMethodParam1('');
    condition.setSelectedMethodParam2('');
    condition.setArgsParam2('');
    condition.handleChangeConditionShow(false);
    condition.handleParamOneInput1(true);
    condition.handleParamOneInput2(true);
    condition.setErrors({});

    setEvents([]);

    setColor(DEFAULT_TRANSITION_COLOR);

    setTransition(null);
    setNewTransition(null);

    setFormState('default');
  };

  useEffect(() => {
    editor.controller.transitions.on('changeTransition', (target) => {
      // if (editor.textMode) return;

      const { data: initialData } = target;

      if (initialData.label?.trigger && typeof initialData.label.trigger !== 'string') {
        trigger.setSelectedComponent(initialData.label.trigger.component);
        trigger.setSelectedMethod(initialData.label.trigger.method);
      }

      setColor(initialData?.color ?? DEFAULT_TRANSITION_COLOR);

      //Позволяет найти начальные значения условия(условий), если таковые имеются
      const tryGetCondition = () => {
        const c = initialData.label?.condition;
        if (!c) return undefined;
        condition.handleChangeConditionShow(true);
        const operator = c.type;
        if (!operatorSet.has(operator) || !Array.isArray(c.value) || c.value.length != 2) {
          console.warn('👽 got condition from future (not comparsion)', c);
          return undefined;
        }
        const param1 = c.value[0];
        const param2 = c.value[1];
        if (Array.isArray(param1.value) || Array.isArray(param2.value)) {
          console.warn('👽 got condition from future (non-value operands)', c);
          return undefined;
        }

        if (
          param1.type == 'value' &&
          (typeof param1.value === 'string' || typeof param1.value === 'number')
        ) {
          condition.handleParamOneInput1(false);
          condition.setArgsParam1(param1.value);
        } else if (param1.type == 'component') {
          const compoName = (param1.value as VariableData).component;
          const methodName = (param1.value as VariableData).method;
          condition.handleParamOneInput1(true);
          condition.setSelectedComponentParam1(compoName);
          condition.setSelectedMethodParam1(methodName);
          //eventVar1 = [compoEntry(compoName), conditionEntry(methodName, compoName)];
        } else {
          console.warn('👽 got condition from future (strange operand 1)', c);
          return undefined;
        }

        if (
          param2.type == 'value' &&
          (typeof param2.value === 'string' || typeof param2.value === 'number')
        ) {
          condition.handleParamOneInput2(false);
          condition.setArgsParam2(param2.value);
        } else if (param2.type == 'component') {
          const compoName = (param2.value as VariableData).component;
          const methodName = (param2.value as VariableData).method;
          condition.handleParamOneInput2(true);
          condition.setSelectedComponentParam2(compoName);
          condition.setSelectedMethodParam2(methodName);
        } else {
          console.warn('👽 got condition from future (strange operand 2)', c);
          return undefined;
        }
        return condition.setConditionOperator(operator);
      };

      tryGetCondition();

      setEvents(target.data.label?.do ?? []);
      setTransition(target);
      open();
    });

    editor.controller.transitions.on('createTransition', ({ source, target }) => {
      setNewTransition({ source, target });
      setEvents([]);
      open();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Modal
      title="Редактор соединения"
      onSubmit={handleSubmit}
      isOpen={isOpen}
      onRequestClose={close}
      onAfterClose={handleAfterClose}
    >
      <div className="flex flex-col gap-3">
        <Trigger {...trigger} />

        <Condition {...condition} />

        <EventsBlock
          events={events}
          setEvents={setEvents}
          onAddEvent={handleAddEvent}
          onChangeEvent={handleChangeEvent}
          onDeleteEvent={handleDeleteEvent}
        />

        <div className="flex items-center gap-2">
          <p className="font-bold">Цвет:</p>
          <ColorInput value={color} onChange={setColor} />
        </div>
      </div>

      <EventsModal
        initialData={eventsModalData}
        onSubmit={handleEventsModalSubmit}
        isOpen={isEventsModalOpen}
        onClose={closeEventsModal}
      />
    </Modal>
  );
};
