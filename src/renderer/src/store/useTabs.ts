import { create } from 'zustand';

import { Tab } from '@renderer/types/tabs';

interface TabsState {
  items: Tab[];
  activeTab: string | null;
  setActiveTab: (tabName: string) => void;
}

export const useTabs = create<TabsState>((set) => ({
  items: [],
  activeTab: 'editor',
  setActiveTab: (activeTab) => {
    set(({ items }) => {
      const tab = items.find(({ name }) => name === activeTab);
      if (!tab) return {};
      return { activeTab: activeTab };
    });
  },
}));
