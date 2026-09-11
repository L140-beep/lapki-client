import React, { useLayoutEffect, useRef, useState } from 'react';

import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
  ImperativePanelHandle,
} from 'react-resizable-panels';

import { useModelContext } from '@renderer/store/ModelContext';

import { StateMachineComponentList } from './StateMachineComponentList';
import { StateMachinesHierarchy } from './StateMachinesHierarchy';

import { StateMachinesList } from '../StateMachinesTab';

const defaultCollapsedSize = 6;
const expandedMinSize = 20;
const defaultExpandedSizes = {
  stateMachines: 25.5,
  components: 38.2,
  hierarchy: 36.3,
};

type ExplorerPanelId = keyof typeof defaultExpandedSizes;

const nearestPanel: Record<ExplorerPanelId, ExplorerPanelId> = {
  stateMachines: 'components',
  components: 'stateMachines',
  hierarchy: 'components',
};

export const Explorer: React.FC = () => {
  const modelController = useModelContext();
  const isInitialized = modelController.model.useData('', 'isInitialized');
  const headControllerId = modelController.model.useData('', 'headControllerId');
  const stateMachinesIds = Object.keys(
    modelController.controllers[headControllerId].useData('stateMachinesSub')
  ).filter(Boolean);

  const stateMachinesPanelRef = useRef<ImperativePanelHandle>(null);
  const componentPanelRef = useRef<ImperativePanelHandle>(null);
  const hierarchyPanelRef = useRef<ImperativePanelHandle>(null);
  const explorerRef = useRef<HTMLElement>(null);
  const expandedSizesRef = useRef(defaultExpandedSizes);
  const adjustingPanelsRef = useRef(false);

  const [collapsedSize, setCollapsedSize] = useState(defaultCollapsedSize);
  const [collapsedPanels, setCollapsedPanels] = useState<Record<ExplorerPanelId, boolean>>({
    stateMachines: false,
    components: false,
    hierarchy: false,
  });

  const [selectedSm, setSmSelected] = useState<string | null>(null);
  const activeSm = stateMachinesIds[0];
  const displayedSm =
    selectedSm && stateMachinesIds.includes(selectedSm) ? selectedSm : stateMachinesIds[0];

  useLayoutEffect(() => {
    const explorer = explorerRef.current;
    const panelGroup = explorer?.querySelector<HTMLElement>('[data-panel-group]');
    const panelHeader = explorer?.querySelector<HTMLElement>('[data-panel-header]');

    if (!panelGroup || !panelHeader) return;

    const updateCollapsedSize = () => {
      const resizeHandlesHeight = Array.from(
        panelGroup.querySelectorAll<HTMLElement>('[data-panel-resize-handle-id]')
      ).reduce((height, handle) => height + handle.offsetHeight, 0);
      const panelsHeight = panelGroup.clientHeight - resizeHandlesHeight;

      if (panelsHeight <= 0) return;

      const nextCollapsedSize = (panelHeader.offsetHeight / panelsHeight) * 100;
      setCollapsedSize((currentSize) =>
        Math.abs(currentSize - nextCollapsedSize) > 0.01 ? nextCollapsedSize : currentSize
      );
    };

    updateCollapsedSize();

    const resizeObserver = new ResizeObserver(updateCollapsedSize);
    resizeObserver.observe(panelGroup);
    resizeObserver.observe(panelHeader);

    return () => resizeObserver.disconnect();
  }, [isInitialized]);

  const panelRefs: Record<ExplorerPanelId, React.RefObject<ImperativePanelHandle>> = {
    stateMachines: stateMachinesPanelRef,
    components: componentPanelRef,
    hierarchy: hierarchyPanelRef,
  };

  const setPanelCollapsed = (panelId: ExplorerPanelId, collapsed: boolean) => {
    setCollapsedPanels((currentPanels) => ({ ...currentPanels, [panelId]: collapsed }));
  };

  const expandPanel = (panelId: ExplorerPanelId) => {
    panelRefs[panelId].current?.resize(
      Math.max(expandedMinSize, expandedSizesRef.current[panelId])
    );
  };

  const togglePanel = (panelId: ExplorerPanelId) => {
    const panel = panelRefs[panelId].current;
    if (!panel) return;

    adjustingPanelsRef.current = true;

    try {
      if (collapsedPanels[panelId]) {
        expandPanel(panelId);
        return;
      }

      const expandedPanels = Object.values(collapsedPanels).filter((collapsed) => !collapsed);

      if (expandedPanels.length === 1) {
        expandPanel(nearestPanel[panelId]);
      }

      panel.collapse();
    } finally {
      adjustingPanelsRef.current = false;
    }
  };

  const rememberExpandedSize = (panelId: ExplorerPanelId, size: number) => {
    if (!adjustingPanelsRef.current && size > collapsedSize + 0.01) {
      expandedSizesRef.current = { ...expandedSizesRef.current, [panelId]: size };
    }
  };

  return (
    <section ref={explorerRef} className="flex h-full min-h-0 flex-col">
      {!isInitialized ? (
        <div className="p-4 text-text-inactive">
          <em>Недоступно до открытия документа</em>
        </div>
      ) : (
        <PanelGroup direction="vertical" className="min-h-0 flex-1">
          <Panel
            ref={stateMachinesPanelRef}
            id="panel0"
            collapsible
            minSize={expandedMinSize}
            collapsedSize={collapsedSize}
            defaultSize={defaultExpandedSizes.stateMachines}
            onCollapse={() => setPanelCollapsed('stateMachines', true)}
            onExpand={() => setPanelCollapsed('stateMachines', false)}
            onResize={(size) => rememberExpandedSize('stateMachines', size)}
            className="min-h-0 overflow-hidden px-[12px]"
          >
            <StateMachinesList
              activeSm={activeSm ?? null}
              selectedSm={selectedSm}
              setSmSelected={setSmSelected}
              isCollapsed={() => collapsedPanels.stateMachines}
              togglePanel={() => togglePanel('stateMachines')}
            />
          </Panel>

          <PanelResizeHandle className="group relative h-px shrink-0">
            <div className="absolute left-0 right-0 top-1/2 h-[1px] -translate-y-1/2 bg-border-primary transition-colors group-hover:h-1 group-hover:bg-primary group-active:h-1 group-active:bg-primary [[data-theme=light]_&]:bg-[#eeeeee]"></div>
          </PanelResizeHandle>

          <Panel
            ref={componentPanelRef}
            id="panel1"
            collapsible
            minSize={expandedMinSize}
            collapsedSize={collapsedSize}
            defaultSize={defaultExpandedSizes.components}
            onCollapse={() => setPanelCollapsed('components', true)}
            onExpand={() => setPanelCollapsed('components', false)}
            onResize={(size) => rememberExpandedSize('components', size)}
            className="min-h-0 overflow-hidden px-[12px]"
          >
            <StateMachineComponentList
              smId={displayedSm ?? ''}
              isCollapsed={() => collapsedPanels.components}
              togglePanel={() => togglePanel('components')}
            />
          </Panel>

          <PanelResizeHandle className="group relative h-px shrink-0">
            <div className="absolute left-0 right-0 top-1/2 h-[1px] -translate-y-1/2 bg-border-primary transition-colors group-hover:h-1 group-hover:bg-primary group-active:h-1 group-active:bg-primary [[data-theme=light]_&]:bg-[#eeeeee]"></div>
          </PanelResizeHandle>

          <Panel
            id="panel2"
            ref={hierarchyPanelRef}
            collapsible
            minSize={expandedMinSize}
            collapsedSize={collapsedSize}
            defaultSize={defaultExpandedSizes.hierarchy}
            onCollapse={() => setPanelCollapsed('hierarchy', true)}
            onExpand={() => setPanelCollapsed('hierarchy', false)}
            onResize={(size) => rememberExpandedSize('hierarchy', size)}
            className="min-h-0 overflow-hidden px-[12px]"
          >
            {isInitialized ? (
              <StateMachinesHierarchy
                isCollapsed={() => collapsedPanels.hierarchy}
                togglePanel={() => togglePanel('hierarchy')}
              />
            ) : (
              <div className="px-4">Недоступно до открытия документа</div>
            )}
          </Panel>
        </PanelGroup>
      )}
    </section>
  );
};
