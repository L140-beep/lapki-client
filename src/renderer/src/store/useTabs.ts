import { create } from 'zustand';

import { ModelController } from '@renderer/lib/data/ModelController';
import { Tab } from '@renderer/types/tabs';

interface TabsState {
  items: Tab[];
  activeTab: string | null;
  setActiveTab: (modelController: ModelController, tabName: string) => void;
  openTab: (modelController: ModelController, tab: Tab) => void;
  closeTab: (tabName: string, modelController: ModelController) => void;
  swapTabs: (a: string, b: string) => void;
  clearTabs: () => void;
  renameTab: (oldName: string, newName: string) => void;
  nextTab: (modelController: ModelController) => void;
  prevTab: (modelController: ModelController) => void;
}

const changeHeadController = (tab: Tab, modelController: ModelController) => {
  modelController.changeHeadControllerId(tab.type === 'editor' ? tab.canvasId : '');
};

export const useTabs = create<TabsState>((set) => ({
  items: [],
  activeTab: 'editor',
  setActiveTab: (modelController, activeTab) => {
    set(({ items }) => {
      const tab = items.find(({ name }) => name === activeTab);
      if (!tab) return {};
      changeHeadController(tab, modelController);
      return { activeTab };
    });
  },
  openTab: (modelController, tab) =>
    set(({ items }) => {
      changeHeadController(tab, modelController);
      if (items.some(({ name }) => name === tab.name)) return { activeTab: tab.name };
      return { items: [...items, tab], activeTab: tab.name };
    }),
  closeTab: (tabName, modelController) =>
    set(({ items, activeTab }) => {
      const closedTabIndex = items.findIndex((tab) => tab.name === tabName);
      const activeTabIndex = items.findIndex((tab) => tab.name === activeTab);
      const newItems = items.filter((tab) => tab.name !== tabName);

      if (newItems.length === 0) {
        modelController.changeHeadControllerId('');
        return { items: newItems, activeTab: null };
      }

      let nextActiveTabName = activeTab;
      if (closedTabIndex === activeTabIndex) {
        nextActiveTabName =
          closedTabIndex === items.length - 1
            ? newItems[newItems.length - 1].name
            : newItems[closedTabIndex].name;
      }

      const nextActiveTab = newItems.find(({ name }) => name === nextActiveTabName);
      if (nextActiveTab) changeHeadController(nextActiveTab, modelController);
      return { items: newItems, activeTab: nextActiveTabName };
    }),
  swapTabs: (a, b) =>
    set(({ items }) => {
      const data = [...items];
      const aIndex = data.findIndex(({ name }) => name === a);
      const bIndex = data.findIndex(({ name }) => name === b);
      if (aIndex === -1 || bIndex === -1) return {};
      data.splice(bIndex, 0, data.splice(aIndex, 1)[0]);
      return { items: data };
    }),
  clearTabs: () => set({ items: [], activeTab: null }),
  renameTab: (oldName, newName) =>
    set(({ items, activeTab }) => {
      const index = items.findIndex(({ name }) => name === oldName);
      if (index === -1) return {};
      const newItems = [...items];
      newItems[index] = { ...newItems[index], name: newName };
      return { items: newItems, activeTab: activeTab === oldName ? newName : activeTab };
    }),
  nextTab: (modelController) =>
    set(({ items, activeTab }) => {
      if (!activeTab || items.length === 0) return {};
      const index = items.findIndex(({ name }) => name === activeTab);
      if (index === -1) return {};
      const tab = items[(index + 1) % items.length];
      changeHeadController(tab, modelController);
      return { activeTab: tab.name };
    }),
  prevTab: (modelController) =>
    set(({ items, activeTab }) => {
      if (!activeTab || items.length === 0) return {};
      const index = items.findIndex(({ name }) => name === activeTab);
      if (index === -1) return {};
      const tab = items[(index - 1 + items.length) % items.length];
      changeHeadController(tab, modelController);
      return { activeTab: tab.name };
    }),
}));
