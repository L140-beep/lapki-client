import { create } from 'zustand';

interface DocState {
  isOpen: boolean;
  activeView: 'documentation' | 'tasks';
  onDocumentationToggle: () => void;
  openDocumentation: () => void;
  openTasks: () => void;
  setActiveView: (view: 'documentation' | 'tasks') => void;
  toggleOpen: () => void;
  close: () => void;
}

export const useDoc = create<DocState>((set) => ({
  isOpen: false,
  activeView: 'documentation',
  onDocumentationToggle: () =>
    set(({ isOpen, activeView }) => ({
      isOpen: activeView === 'documentation' ? !isOpen : true,
      activeView: 'documentation',
    })),
  openDocumentation: () => set({ isOpen: true, activeView: 'documentation' }),
  openTasks: () => set({ isOpen: true, activeView: 'tasks' }),
  setActiveView: (activeView) => set({ activeView, isOpen: true }),
  toggleOpen: () => set(({ isOpen }) => ({ isOpen: !isOpen })),
  close: () => set({ isOpen: false }),
}));
