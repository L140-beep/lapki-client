import React from 'react';

import ReactSelect, { GroupBase, MenuListProps, Props } from 'react-select';
import { twMerge } from 'tailwind-merge';

import { ScrollArea } from '../ScrollArea';

import './style.css';

export interface ParameterSelectOption<Value extends string | number = string | number> {
  value: Value;
  label: React.ReactNode;
}

const ParameterMenuList = <
  Value extends string | number,
  Group extends GroupBase<ParameterSelectOption<Value>> = GroupBase<ParameterSelectOption<Value>>
>({
  children,
  innerRef,
  innerProps,
  maxHeight,
}: MenuListProps<ParameterSelectOption<Value>, false, Group>) => {
  const { style, ...otherInnerProps } = innerProps;

  return (
    <ScrollArea
      {...otherInnerProps}
      ref={innerRef}
      className="ParameterSelect__menu-list"
      style={{ ...style, maxHeight }}
    >
      {children}
    </ScrollArea>
  );
};

type ParameterSelectProps<
  Value extends string | number,
  Group extends GroupBase<ParameterSelectOption<Value>> = GroupBase<ParameterSelectOption<Value>>
> = Omit<Props<ParameterSelectOption<Value>, false, Group>, 'isMulti'> & {
  error?: string;
  containerClassName?: string;
};

/** Compact select used for parameters with a fixed set of allowed values. */
export function ParameterSelect<
  Value extends string | number,
  Group extends GroupBase<ParameterSelectOption<Value>> = GroupBase<ParameterSelectOption<Value>>
>({ error, containerClassName, className, ...props }: ParameterSelectProps<Value, Group>) {
  return (
    <div className={twMerge('w-full', containerClassName)}>
      <ReactSelect
        placeholder="Выберите..."
        isClearable={false}
        isSearchable={false}
        {...props}
        menuPortalTarget={document.body}
        menuPosition="fixed"
        styles={{
          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
          menu: (base) => ({ ...base, right: 0, left: 'auto', width: '75px' }),
          control: (base) => ({ ...base, minHeight: '32px', height: '32px' }),
        }}
        components={{ MenuList: ParameterMenuList }}
        className={twMerge('w-full', className, error && 'error')}
        classNamePrefix="ParameterSelect"
      />
      <p className={twMerge('text-sm text-error', error && 'mt-1')}>{error}</p>
    </div>
  );
}
