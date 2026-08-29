import React from 'react';

import { Props } from 'react-modal';
import { twMerge } from 'tailwind-merge';

import { ReactComponent as Close } from '@renderer/assets/icons/close.svg';

import './style.css';
import { Window } from './MovingWindow';

interface ModalProps extends Omit<Props, 'className' | 'overlayClassName'> {
  id: string;
  title: string;
  cancelLabel?: string;
  submitLabel?: string;
  extraLabel?: string;
  sideLabel?: string;
  middleLabel?: string;
  children: React.ReactNode;
  onMiddle?: React.FormEventHandler;
  onExtra?: React.FormEventHandler;
  onSide?: React.FormEventHandler;
  onSubmit?: React.FormEventHandler;
  submitDisabled?: boolean;
  className?: string;
  overlayClassName?: string;
  cancelClassName?: string;
  submitClassName?: string;
  extraClassName?: string;
  sideClassName?: string;
  middleClassName?: string;
  hideCancelButton?: boolean;
  onCancel?: () => void;
}

export const MovingModal: React.FC<ModalProps> = ({
  children,
  title,
  onSubmit,
  cancelLabel,
  submitLabel,
  extraLabel,
  sideLabel,
  middleLabel,
  onMiddle,
  onExtra,
  onSide,
  submitDisabled,
  className,
  overlayClassName,
  cancelClassName,
  submitClassName,
  extraClassName,
  sideClassName,
  middleClassName,
  hideCancelButton,
  onCancel,
  ...props
}) => {
  const handleCancel = (e: React.MouseEvent) => {
    // debugger;
    if (onCancel) return onCancel();

    if (props.onRequestClose) return props.onRequestClose(e);
    // removeWindow(props.id);
  };

  return (
    <Window
      {...props}
      id={props.id}
      className={twMerge(
        'rounded-lg bg-bg-primary p-6 outline-none scrollbar-thin scrollbar-track-transparent scrollbar-thumb-current',
        className
      )}
      header={
        <div className="relative mb-6 flex w-full items-center justify-between border-b border-border-primary pb-3">
          <h1 className="text-sm font-medium">{title}</h1>
          <button
            className="rounded-full p-1 transition-colors hover:bg-bg-hover active:bg-bg-active"
            onClick={props.onRequestClose}
          >
            <Close className="h-3 w-3 fill-black text-black" />
          </button>
        </div>
      }
    >
      <form onSubmit={onSubmit} className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1">{children}</div>

        <div className="flex items-center justify-end gap-2 pt-3">
          <button
            type="button"
            className={
              sideClassName ?? 'rounded px-4 py-2 text-red-400 transition-colors hover:text-red-200'
            }
            onClick={onSide}
            hidden={!sideLabel}
          >
            {sideLabel}
          </button>
          <button
            type="button"
            className={middleClassName ?? 'btn-secondary'}
            onClick={onMiddle}
            hidden={!middleLabel}
          >
            {middleLabel}
          </button>
          <div className="flex-grow"></div>
          <button
            type="button"
            className={cancelClassName ?? 'btn-secondary'}
            onClick={handleCancel}
            hidden={hideCancelButton}
          >
            {cancelLabel ?? 'Закрыть'}
          </button>
          <button
            type="button"
            className={extraClassName ?? 'btn-primary'}
            hidden={!extraLabel}
            onClick={onExtra}
          >
            {extraLabel ?? ''}
          </button>
          <button
            type="submit"
            className={submitClassName ?? 'btn-primary'}
            hidden={!onSubmit}
            disabled={submitDisabled}
          >
            {submitLabel ?? 'Сохранить'}
          </button>
        </div>
      </form>
    </Window>
  );
};
