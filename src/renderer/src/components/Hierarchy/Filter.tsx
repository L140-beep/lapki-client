import React, { useRef } from 'react';

import { twMerge } from 'tailwind-merge';

import { ReactComponent as ClearIcon } from '@renderer/assets/icons/close.svg';
import { ReactComponent as CollapseIcon } from '@renderer/assets/icons/collapse-all.svg';
import { ReactComponent as ExpandIcon } from '@renderer/assets/icons/expand-all.svg';

import { TextInput } from '../UI';

interface FilterProps {
  onExpandAll: () => void;
  onCollapseAll: () => void;
  search: string;
  onChangeSearch: (value: string) => void;
  disabled?: boolean;
}

export const Filter: React.FC<FilterProps> = (props) => {
  const { onExpandAll, onCollapseAll, search, onChangeSearch, disabled } = props;
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChangeSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeSearch(e.target.value);
  };

  const handleClear = () => {
    onChangeSearch('');
    inputRef.current?.focus();
  };

  return (
    <div className="mb-3 flex items-end gap-2">
      <label className="flex h-[32px] items-center rounded-lg border border-border-primary">
        <TextInput
          ref={inputRef}
          className="border-none py-[2px] pr-3"
          placeholder="Поиск..."
          value={search}
          onChange={handleChangeSearch}
          disabled={disabled}
        />
        <button
          className={twMerge(
            'invisible mr-1 cursor-pointer rounded-[3px] p-[3px] opacity-0 transition-opacity hover:bg-util-button-hover',
            search && 'visible opacity-100'
          )}
          onClick={handleClear}
          type="button"
        >
          <ClearIcon className="h-[10px] w-[10px]" />
        </button>
      </label>
    </div>
  );
};
