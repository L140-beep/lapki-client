import { Controller, UseFormReturn } from 'react-hook-form';

import { Modal, Select } from '@renderer/components/UI';
import { useModelContext } from '@renderer/store/ModelContext';

import { ComponentFormFieldLabel } from './ComponentFormFieldLabel';

interface StateMachineEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: StateMachineData) => void;
  submitLabel: string;
  sideLabel: string | undefined;
  onSide: (() => void) | undefined;
  form: UseFormReturn<StateMachineData>;
  platformList: string[];
}

// TODO (Roundabout1): наверное стоит перенести этот тип данных в другое место?
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
  platformList,
}) => {
  const { handleSubmit: hookHandleSubmit, control, reset } = form;
  const modelController = useModelContext();
  const editor = modelController.getCurrentCanvas();

  const makeOption = (x) => {
    return { label: x, value: x };
  };
  const platformOptions = platformList.map(makeOption);

  // Сброс к начальному состоянию после закрытия
  const handleAfterClose = () => {
    editor.focus();
  };

  const handleSubmit = hookHandleSubmit((data) => {
    onSubmit(data);
    reset({ name: '', platform: '' });
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
      <div className="flex flex-col gap-2">
        <Controller
          name="name"
          control={control}
          render={({ field: { onChange, value } }) => (
            <ComponentFormFieldLabel
              label="Название"
              placeholder="Введите название..."
              onChange={onChange}
              value={value ?? ''}
            ></ComponentFormFieldLabel>
          )}
        />
        <Controller
          name="platform"
          control={control}
          render={({ field: { onChange, value } }) => (
            <ComponentFormFieldLabel label="Платформа">
              <Select
                className="w-[250px]"
                isSearchable={false}
                placeholder="Выберите платформу..."
                options={platformOptions}
                value={value == '' || value == undefined ? undefined : makeOption(value)} // при undefined показывает placeholader
                onChange={(opt) => {
                  onChange(opt?.value);
                }}
              />
            </ComponentFormFieldLabel>
          )}
        />
      </div>
    </Modal>
  );
};
