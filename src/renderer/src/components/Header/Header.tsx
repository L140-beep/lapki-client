import React, { Dispatch, useEffect, useRef, useState } from 'react';

import { useSettings } from '@renderer/hooks';
import { useFlasherHooks } from '@renderer/hooks/useFlasherHooks';
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
import { Menu } from '../Sidebar/Menu';
import { Setting } from '../Sidebar/Setting';

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
  simulatorOpen: boolean;
  onSimulatorToggle: () => void;
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
  simulatorOpen,
  onSimulatorToggle,
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
    'h-full px-3 text-xs text-text-primary transition-colors hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary';
  const popoverClass =
    'absolute left-0 top-full z-[110] max-h-[calc(100vh-25px)] min-w-[260px] overflow-y-auto border border-border-primary bg-bg-secondary shadow-[0_2px_4px_rgba(0,0,0,0.2)]';

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
            Файлы
          </button>
          {openMenu === 'files' && (
            <div className={popoverClass}>
              <Menu
                onRequestNewFile={onRequestNewFile}
                onRequestOpenFile={onRequestOpenFile}
                onRequestSaveFile={onRequestSaveFile}
                onRequestSaveAsFile={onRequestSaveAsFile}
                onRequestImport={onRequestImportFile}
                compilerStatus={compilerStatus}
                setOpenData={setOpenData}
              />
            </div>
          )}
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

        <button
          type="button"
          className={`${menuButtonClass} ${simulatorOpen ? 'bg-bg-hover' : ''}`}
          aria-pressed={simulatorOpen}
          onClick={() => {
            setOpenMenu(null);
            onSimulatorToggle();
          }}
        >
          Симулятор
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
