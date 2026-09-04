import { useState } from 'react';

import { twMerge } from 'tailwind-merge';

import { Hierarchy } from '@renderer/components/Hierarchy';
import { Filter } from '@renderer/components/Hierarchy/Filter';
import { PanelHeader } from '@renderer/components/UI';
import { useSettings } from '@renderer/hooks';
import { useModelContext } from '@renderer/store/ModelContext';

interface StateMachinesHierarchyProps {
  isCollapsed: () => boolean;
  togglePanel: () => void;
}

export const StateMachinesHierarchy: React.FC<StateMachinesHierarchyProps> = ({
  isCollapsed,
  togglePanel,
}) => {
  const modelController = useModelContext();
  const headControllerId = modelController.model.useData('', 'headControllerId');
  const controller = modelController.controllers[headControllerId];
  const stateMachinesIds = Object.keys(controller.useData('stateMachinesSub')).filter(
    (value) => value != ''
  );
  const [theme] = useSettings('theme');
  const [search, setSearch] = useState('');
  const [expand, setExpand] = useState(true);
  const [collapse, setCollapse] = useState(true);
  const handleChangeSearch = (value: string) => {
    if (!value) value = '';
    setSearch(value);
  };

  const onExpandAll = () => {
    setExpand(true);
    setCollapse(false);
  };

  const onCollapseAll = () => {
    setCollapse(true);
    setExpand(false);
  };

  return (
    <div className={twMerge(theme !== 'light' && 'rct-dark', 'flex h-full flex-col')}>
      <PanelHeader title="Иерархия" isCollapsed={isCollapsed} togglePanel={togglePanel} />
      <Filter
        onExpandAll={onExpandAll}
        onCollapseAll={onCollapseAll}
        search={search}
        onChangeSearch={handleChangeSearch}
        disabled={headControllerId === ''}
      />
      <div
        className={
          'overflow-y-auto scrollbar-thin scrollbar-track-scrollbar-track scrollbar-thumb-scrollbar-thumb'
        }
      >
        {headControllerId === '' ? (
          <p className="pl-[19px] text-text-inactive">Нет активной диаграммы</p>
        ) : (
          stateMachinesIds.map((smId) => (
            <Hierarchy
              key={smId}
              expand={expand}
              collapse={collapse}
              search={search}
              controller={controller}
              smId={smId}
            />
          ))
        )}
      </div>
    </div>
  );
};
