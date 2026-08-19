export type Language = 'xml' | 'json' | 'txt' | 'cpp';

export interface CodeTab {
  type: 'code' | 'transition' | 'state';
  name: string;
  language: Language;
  code: string;
}

export interface SerialMonitorTab {
  type: 'serialMonitor';
  name: string;
  isOpen: boolean;
}

export interface ManagerMSTab {
  type: 'managerMS';
  name: string;
}

export type Tab = CodeTab | SerialMonitorTab | ManagerMSTab;
