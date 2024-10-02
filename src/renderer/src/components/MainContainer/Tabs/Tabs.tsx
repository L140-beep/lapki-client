import { useState } from 'react';

import { twMerge } from 'tailwind-merge';

import { CodeEditor, DiagramEditor } from '@renderer/components';
import { SerialMonitorTab } from '@renderer/components/SerialMonitor';
import { useModelContext } from '@renderer/store/ModelContext';
import { useTabs } from '@renderer/store/useTabs';
import { Tab as TabType } from '@renderer/types/tabs';

import { Tab } from './Tab';

import { NotInitialized } from '../NotInitialized';

export const Tabs: React.FC = () => {
  const modelController = useModelContext();
  const [items, activeTab, setActiveTab, swapTabs, closeTab] = useTabs((state) => [
    state.items,
    state.activeTab,
    state.setActiveTab,
    state.swapTabs,
    state.closeTab,
  ]);

  const [dragId, setDragId] = useState<string | null>(null);

  const handleDrag = (tabName: string) => {
    setDragId(tabName);
  };

  const handleDrop = (tabName: string) => {
    if (tabName === 'editor' || !dragId) return;

    swapTabs(dragId, tabName);
  };
  const getCanvasBySmId = (smId: string) => {
    for (const canvasId in modelController.controllers) {
      const controller = modelController.controllers[canvasId].controller;
      if (controller.stateMachinesSub[smId]) {
        return controller.app;
      }
    }
    return null;
  };

  if (items.length === 0) {
    return <NotInitialized />;
  }

  const selectTab = (item: TabType) => {
    switch (item.type) {
      case 'editor':
        return (
          <DiagramEditor
            editor={getCanvasBySmId(item.name) ?? modelController.getCurrentCanvas()}
          />
        );
      case 'transition':
      case 'state':
      case 'code':
        return <CodeEditor initialValue={item.code} language={item.language} />;
      case 'serialMonitor':
        return <SerialMonitorTab />;
      default:
        return undefined;
    }
  };

  return (
    <>
      <section
        className="flex gap-1 overflow-x-auto break-words border-b border-border-primary bg-bg-secondary px-1 py-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-current"
        tabIndex={-1}
      >
        {items.map(({ type, name }) => (
          <Tab
            key={name}
            isActive={activeTab === name}
            isDragging={dragId === name}
            draggable={type !== 'editor'}
            type={type}
            name={name}
            showName={type !== 'editor'}
            onDragStart={() => handleDrag(name)}
            onDrop={() => handleDrop(name)}
            onMouseDown={() => {
              const canvas = getCanvasBySmId(name);
              if (!canvas) {
                return;
              }
              modelController.setHeadCanvas(canvas.id);
              modelController.model.changeCurrentSm(name);
              setActiveTab(name);
            }}
            onClose={() => closeTab(name)}
          />
        ))}
      </section>

      {items.map((item) => (
        <div
          key={item.name}
          className={twMerge('hidden h-[calc(100vh-44.19px)]', activeTab === item.name && 'block')}
        >
          {selectTab(item)}
        </div>
      ))}
    </>
  );
};
