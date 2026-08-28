import React from 'react';

import { twMerge } from 'tailwind-merge';

import { FileMenuItem, FileMenuItemId } from '@renderer/hooks/useFileMenu';

import { Badge, WithHint } from '../UI';

const compactMenuItemIds = new Set<FileMenuItemId>([
  'new',
  'open',
  'open-recent',
  'save',
  'save-as',
  'import',
  'properties',
]);

interface MenuDropdownProps {
  items: FileMenuItem[];
  variant?: 'popover' | 'start-screen';
  onItemSelect?: () => void;
}

export const MenuDropdown: React.FC<MenuDropdownProps> = ({
  items,
  variant = 'popover',
  onItemSelect,
}) => {
  const isCompact = variant === 'popover' || variant === 'start-screen';

  return (
    <section className="flex flex-col">
      {items.map(
        ({ id, text, onClick, disabled = false, hidden = false, className, badge, hint }) => {
          const isHidden = hidden || (isCompact && !compactMenuItemIds.has(id));
          const button = (
            <button
              key={id}
              className={twMerge(
                isCompact
                  ? 'h-[25px] w-full rounded-lg px-3 text-left text-xs leading-none transition-colors enabled:hover:bg-[#e4f2ff] enabled:active:bg-bg-active disabled:text-text-disabled'
                  : 'px-2 py-2 text-left indent-4 text-base transition-colors enabled:hover:bg-bg-hover enabled:active:bg-bg-active disabled:text-text-disabled',
                className
              )}
              onClick={() => {
                onClick();
                onItemSelect?.();
              }}
              disabled={disabled}
              hidden={isHidden}
            >
              <Badge show={badge ?? false}>{text}</Badge>
            </button>
          );

          return hint ? (
            <WithHint key={id} hint={hint}>
              {(hintProps) => React.cloneElement(button, hintProps)}
            </WithHint>
          ) : (
            button
          );
        }
      )}
    </section>
  );
};
