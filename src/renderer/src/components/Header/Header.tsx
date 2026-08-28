import React, { Dispatch, useEffect, useRef, useState } from 'react';

import { useSettings } from '@renderer/hooks';
import { useFlasherHooks } from '@renderer/hooks/useFlasherHooks';
import { useFileMenu } from '@renderer/hooks/useFileMenu';
import { useModal } from '@renderer/hooks/useModal';
import { useDoc } from '@renderer/store/useDoc';
import { useManagerMS } from '@renderer/store/useManagerMS';
import { CompilerResult } from '@renderer/types/CompilerTypes';

import { Flasher } from '../Modules/Flasher';
import { CompilerSelectModal } from '../serverSelect/CompilerSelectModal';
import {
  FlasherSelectModal,
  FlasherSelectModalFormValues,
} from '../serverSelect/FlasherSelectModal';
import { CompilerTab } from '../Sidebar/Compiler';
import { History } from '../Sidebar/History';
import { Setting } from '../Sidebar/Setting';

import { MenuDropdown } from './MenuDropdown';

export interface HeaderCallbacks {
  onRequestNewFile: () => void;
  onRequestOpenFile: () => void;
  onRequestSaveFile: () => void;
  onRequestSaveAsFile: () => void;
  onRequestImportFile: (
    setOpenData: Dispatch<[boolean, string | null, string | null, string]>
  ) => void;
}

interface HeaderProps {
  callbacks: HeaderCallbacks;
  openImportError: (error: string) => void;
  renderStartScreen?: (fileMenu: React.ReactNode) => React.ReactNode;
}

type HeaderMenu = 'files' | 'settings' | 'history' | null;

export const Header: React.FC<HeaderProps> = ({
  callbacks: {
    onRequestNewFile,
    onRequestOpenFile,
    onRequestSaveFile,
    onRequestSaveAsFile,
    onRequestImportFile,
  },
  openImportError,
  renderStartScreen,
}) => {
  const rootRef = useRef<HTMLElement>(null);
  const [openMenu, setOpenMenu] = useState<HeaderMenu>(null);
  const [isCompilerOpen, openCompilerSettings, closeCompilerSettings] = useModal(false);
  const [flasherSetting, setFlasherSetting] = useSettings('flasher');
  const [isFlasherSettingsOpen, openFlasherSettings, closeFlasherSettings] = useModal(false);
  const [openData, setOpenData] = useState<
    [boolean, string | null, string | null, string] | undefined
  >(undefined);
  const [compilerData, setCompilerData] = useState<CompilerResult | undefined>(undefined);
  const [compilerStatus, setCompilerStatus] = useState('Не подключен.');
  const { setCompilerData: setCompilerDataMS } = useManagerMS();
  const [onDocumentationToggle, isDocOpen] = useDoc((state) => [
    state.onDocumentationToggle,
    state.isOpen,
  ]);
  const { items: fileMenuItems, modals: fileMenuModals } = useFileMenu({
    onRequestNewFile,
    onRequestOpenFile,
    onRequestSaveFile,
    onRequestSaveAsFile,
    onRequestImport: onRequestImportFile,
    compilerStatus,
    setOpenData,
  });

  useFlasherHooks();

  useEffect(() => {
    setCompilerDataMS(compilerData);
  }, [compilerData, setCompilerDataMS]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenMenu(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenu(null);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const closeFlasherModal = () => {
    Flasher.freezeReconnectTimer(false);
    closeFlasherSettings();
  };

  const openLoaderSettings = () => {
    Flasher.freezeReconnectTimer(true);
    openFlasherSettings();
  };

  const handleFlasherModalSubmit = (data: FlasherSelectModalFormValues) => {
    if (!flasherSetting) return;
    setFlasherSetting({ ...flasherSetting, ...data });
  };

  const toggleMenu = (menu: Exclude<HeaderMenu, null>) => {
    setOpenMenu((current) => (current === menu ? null : menu));
  };

  const menuButtonClass =
    'h-full rounded-lg px-3 text-xs text-text-primary transition-colors hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary';
  const popoverClass =
    'absolute left-0 top-full z-[110] max-h-[calc(100vh-25px)] min-w-[260px] overflow-y-auto border border-border-primary bg-bg-secondary shadow-[0_2px_4px_rgba(0,0,0,0.2)]';
  const filePopoverClass =
    'absolute left-0 top-full z-[110] w-[144px] rounded-lg bg-white py-1 shadow-[0_2px_14px_rgba(0,0,0,0.25)]';
  const fileMenu = (variant: 'popover' | 'start-screen' = 'popover', onItemSelect?: () => void) => (
    <MenuDropdown variant={variant} onItemSelect={onItemSelect} items={fileMenuItems} />
  );

  return (
    <>
      <header
        ref={rootRef}
        className="relative z-[100] flex h-[25px] shrink-0 bg-white shadow-[0_2px_4px_rgba(0,0,0,0.25)]"
      >
        <div className="relative h-full">
          <button
            type="button"
            className={menuButtonClass}
            aria-expanded={openMenu === 'files'}
            onClick={() => toggleMenu('files')}
          >
            Файл
          </button>
          <div className={`${filePopoverClass} ${openMenu !== 'files' ? 'hidden' : ''}`}>
            {fileMenu('popover', () => setOpenMenu(null))}
          </div>
        </div>

        <div className="relative h-full">
          <button
            type="button"
            className={menuButtonClass}
            aria-expanded={openMenu === 'settings'}
            onClick={() => toggleMenu('settings')}
          >
            Настройки
          </button>
          {openMenu === 'settings' && (
            <div className={popoverClass}>
              <Setting
                openCompilerSettings={openCompilerSettings}
                openLoaderSettings={openLoaderSettings}
              />
            </div>
          )}
        </div>

        <button
          type="button"
          className={`${menuButtonClass} ${isDocOpen ? 'bg-bg-hover' : ''}`}
          aria-pressed={isDocOpen}
          onClick={onDocumentationToggle}
        >
          Документация
        </button>

        <div className="relative h-full">
          <button
            type="button"
            className={menuButtonClass}
            aria-expanded={openMenu === 'history'}
            onClick={() => toggleMenu('history')}
          >
            История изменений
          </button>
          {openMenu === 'history' && (
            <div className={`${popoverClass} w-[320px]`}>
              <History />
            </div>
          )}
        </div>
      </header>

      {renderStartScreen?.(fileMenu('start-screen'))}

      {fileMenuModals}

      <div className="hidden">
        <CompilerTab
          openData={openData}
          compilerData={compilerData}
          setCompilerData={setCompilerData}
          compilerStatus={compilerStatus}
          setCompilerStatus={setCompilerStatus}
          openImportError={openImportError}
        />
      </div>
      <FlasherSelectModal
        isOpen={isFlasherSettingsOpen}
        onSubmit={handleFlasherModalSubmit}
        onClose={closeFlasherModal}
      />
      <CompilerSelectModal isOpen={isCompilerOpen} onClose={closeCompilerSettings} />
    </>
  );
};
