import React, { useLayoutEffect, useState } from 'react';

import { UseFormReturn } from 'react-hook-form';

import { Modal } from '@renderer/components/UI';
import { useModelContext } from '@renderer/store/ModelContext';

import { ComponentFormFieldLabel } from './ComponentFormFieldLabel';
import { StateMachineFormFields } from './StateMachineFormFields';

interface StateMachineEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: StateMachineData) => void;
  submitLabel: string;
  sideLabel: string | undefined;
  onSide: (() => void) | undefined;
  form: UseFormReturn<StateMachineData>;
}

// TODO: наверное стоит перенести этот тип данных в другое место?
export type StateMachineData = {
  name: string;
  platform: string;
};

export const StateMachineEditModal: React.FC<StateMachineEditModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  submitLabel,
  sideLabel,
  onSide,
  form,
}) => {
  const { handleSubmit: hookHandleSubmit, register } = form;
  const modelController = useModelContext();
  const editor = modelController.getCurrentCanvas();

  // Сброс к начальному состоянию после закрытия
  const handleAfterClose = () => {
    editor.focus();
  };

  const handleSubmit = hookHandleSubmit((data) => {
    onSubmit(data);
    onClose();
  });

  const handleDelete = () => {
    if (onSide == undefined) return;
    onSide();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      onAfterClose={handleAfterClose}
      title="Машина состояний"
      submitLabel={submitLabel}
      onSubmit={handleSubmit}
      sideLabel={sideLabel}
      onSide={handleDelete ?? undefined}
    >
      <ComponentFormFieldLabel
        label="Название:"
        hint={'Название машины состояний'}
        {...register('name')}
      />
      <ComponentFormFieldLabel
        label="Платформа:"
        hint={'Платформа машины состояний'}
        {...register('platform')}
      />
    </Modal>
  );
};
