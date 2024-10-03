import React, { useState } from 'react';

import { useForm } from 'react-hook-form';

import { ReactComponent as AddIcon } from '@renderer/assets/icons/new transition.svg';
import {
  StateMachineData,
  StateMachineEditModal,
} from '@renderer/components/StateMachineEditModal';
import { useStateMachines } from '@renderer/hooks';
import { useModelContext } from '@renderer/store/ModelContext';

import { Component } from '../Explorer/Component';

export const StateMachinesList: React.FC = () => {
  const modelController = useModelContext();

  const editor = modelController.getCurrentCanvas();
  const isInitialized = modelController.model.useData('', 'canvas.isInitialized', editor.id);
  const elements = modelController.model.useData('', 'elements.stateMachines');
  console.log(elements);
  const [selectedSm, setSmSelected] = useState<string | null>(null);
  const editForm = useForm<StateMachineData>();
  const addForm = useForm<StateMachineData>();
  const {
    addProps,
    editProps,
    deleteProps,
    // onSwapStateMachines
    onRequestAddStateMachine,
    onRequestEditStateMachine,
    onRequestDeleteStateMachine,
  } = useStateMachines();
  const onSubmitEdit = (data: StateMachineData) => {
    editProps.onEdit(editProps.idx, data);
  };
  const onEditDelete = () => {
    onRequestDeleteStateMachine(editProps.idx);
  };
  const onSubmitAdd = (data: StateMachineData) => {
    // TODO: добавление новой машины состояния
    console.log(`Add new state machine ${data}`);
  };
  const onEdit = (idx: string, smId: string) => {
    onRequestEditStateMachine(idx, smId);
    console.log('data', editProps.data);
    editForm.reset(elements[idx]);
  };
  return (
    <section>
      <h3 className="mx-4 mb-3 border-b border-border-primary py-2 text-center text-lg">
        Машины состояний
      </h3>
      <div className="px-4">
        <button
          type="button"
          className="btn-primary mb-2 flex w-full items-center justify-center gap-3"
          disabled={!isInitialized}
          onClick={onRequestAddStateMachine}
        >
          <AddIcon className="shrink-0" />
          Добавить...
        </button>
        <div className="max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-track-scrollbar-track scrollbar-thumb-scrollbar-thumb">
          {[...Object.entries(elements)].map(([id, sm]) => (
            <Component
              key={id}
              name={sm.name || id}
              icon={undefined}
              description={undefined}
              isSelected={(sm.name || id) === selectedSm}
              onSelect={() => setSmSelected(sm.name || id)}
              onEdit={() => onEdit(id, id)}
              onDelete={() => onRequestDeleteStateMachine(id)}
              // TODO: Доделать свап машин состояний
              onDragStart={() => console.log('setDragState')}
              onDrop={() => console.log('onDrop')}
              isDragging={id === ''}
            />
          ))}
        </div>
      </div>
      <StateMachineEditModal
        form={editForm}
        isOpen={editProps.isOpen}
        onClose={editProps.onClose}
        onSubmit={onSubmitEdit}
        submitLabel="Применить"
        onSide={onEditDelete}
        sideLabel="Удалить"
      />
      <StateMachineEditModal
        form={addForm}
        isOpen={addProps.isOpen}
        onClose={addProps.onClose}
        onSubmit={onSubmitAdd}
        submitLabel="Добавить"
        onSide={undefined}
        sideLabel={undefined}
      />
    </section>
  );
};
