import React from 'react';

import { useSettings } from '@renderer/hooks';
import { useModal } from '@renderer/hooks/useModal';
import { useModelContext } from '@renderer/store/ModelContext';
import { useFlasher } from '@renderer/store/useFlasher';

import { Autosave } from './AutosaveSetting';

import { AboutTheProgramModal } from '../AboutTheProgramModal';
import { ClientStatus } from '../Modules/Websocket/ClientStatus';
import { ResetSettingsModal } from '../ResetSettingsModal';
import { DocSelectModal } from '../serverSelect/DocSelectModal';

export interface SettingProps {
  openCompilerSettings: () => void;
  openLoaderSettings: () => void;
  onItemSelect?: () => void;
}

export const Setting: React.FC<SettingProps> = ({
  openCompilerSettings,
  openLoaderSettings,
  onItemSelect,
}) => {
  const modelController = useModelContext();
  const headControllerId = modelController.model.useData('', 'headControllerId');
  const controller = modelController.controllers[headControllerId];
  const editor = controller.app;
  const isMounted = controller.useData('isMounted');
  const [theme, setTheme] = useSettings('theme');
  const [canvasSettings, setCanvasSettings] = useSettings('canvas');
  const { connectionStatus, isFlashing } = useFlasher();

  const [isDocModalOpen, openDocModal, closeDocModal] = useModal(false);
  const [isResetWarningOpen, openResetWarning, closeResetWarning] = useModal(false);
  const [isAboutModalOpen, openAboutModal, closeAboutModal] = useModal(false);
  const [isAutosaveModalOpen, openAutosaveModal, closeAutosaveModal] = useModal(false);

  const handleChangeTheme = (value: 'light' | 'dark') => {
    setTheme(value);
    document.documentElement.dataset.theme = value;

    if (isMounted) {
      editor.view.isDirty = true;
    }

    onItemSelect?.();
  };

  const handleChangeCanvasAnimations = (value: boolean) => {
    if (!canvasSettings) return;

    setCanvasSettings({
      ...canvasSettings,
      animations: value,
    });
    onItemSelect?.();
  };

  const selectAndOpen = (open: () => void) => {
    onItemSelect?.();
    open();
  };

  const itemClassName =
    'flex w-full items-center px-3 py-1.5 text-left text-xs text-[#181818] outline-none hover:bg-[#e6f4ff] focus-visible:bg-[#e6f4ff] disabled:cursor-not-allowed disabled:opacity-50';
  const submenuClassName =
    'invisible pointer-events-none absolute left-full top-0 z-[120] w-[92px] overflow-hidden rounded-lg bg-white py-1 opacity-0 shadow-[0_2px_14px_rgba(0,0,0,0.25)] transition-opacity group-hover:visible group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:visible group-focus-within:pointer-events-auto group-focus-within:opacity-100';

  return (
    <section className="text-[#181818]">
      <div className="group relative">
        <button type="button" className={`${itemClassName} justify-between`} aria-haspopup="menu">
          {'\u0422\u0435\u043c\u0430'}
          <span aria-hidden="true">›</span>
        </button>
        <div className={submenuClassName} role="menu">
          {(['light', 'dark'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={theme === value}
              className={`${itemClassName} justify-between`}
              onClick={() => handleChangeTheme(value)}
            >
              {value === 'light' ? '\u0421\u0432\u0435\u0442\u043b\u0430\u044f' : '\u0422\u0451\u043c\u043d\u0430\u044f'}
              {theme === value && <span aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      </div>

      <button type="button" className={itemClassName} onClick={() => selectAndOpen(openCompilerSettings)}>
        {'\u041a\u043e\u043c\u043f\u0438\u043b\u044f\u0442\u043e\u0440'}
      </button>
      <button
        type="button"
        className={itemClassName}
        onClick={() => selectAndOpen(openLoaderSettings)}
        disabled={connectionStatus === ClientStatus.CONNECTING || isFlashing}
      >
        {'\u0417\u0430\u0433\u0440\u0443\u0437\u0447\u0438\u043a'}
      </button>
      <button type="button" className={itemClassName} onClick={() => selectAndOpen(openDocModal)}>
        {'\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430\u0446\u0438\u044f'}
      </button>
      <button type="button" className={itemClassName} onClick={() => selectAndOpen(openAutosaveModal)}>
        {'\u0410\u0432\u0442\u043e\u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u0435'}
      </button>

      <div className="group relative">
        <button type="button" className={`${itemClassName} justify-between`} aria-haspopup="menu">
          {'\u0410\u043d\u0438\u043c\u0430\u0446\u0438\u0438 \u043d\u0430 \u0445\u043e\u043b\u0441\u0442\u0435'}
          <span aria-hidden="true">›</span>
        </button>
        <div className={submenuClassName} role="menu">
          <button
            type="button"
            role="menuitemradio"
            aria-checked={canvasSettings?.animations === true}
            className={`${itemClassName} justify-between`}
            onClick={() => handleChangeCanvasAnimations(true)}
          >
            {'\u0412\u043a\u043b'}
            {canvasSettings?.animations && <span aria-hidden="true">✓</span>}
          </button>
          <button
            type="button"
            role="menuitemradio"
            aria-checked={canvasSettings?.animations === false}
            className={`${itemClassName} justify-between`}
            onClick={() => handleChangeCanvasAnimations(false)}
          >
            {'\u0412\u044b\u043a\u043b'}
            {canvasSettings && !canvasSettings.animations && <span aria-hidden="true">✓</span>}
          </button>
        </div>
      </div>

      <button type="button" className={itemClassName} onClick={() => selectAndOpen(openResetWarning)}>
        {'\u0421\u0431\u0440\u043e\u0441\u0438\u0442\u044c \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438'}
      </button>
      <button type="button" className={itemClassName} onClick={() => selectAndOpen(openAboutModal)}>
        {'\u041e \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0435'}
      </button>

      <DocSelectModal isOpen={isDocModalOpen} onClose={closeDocModal} />
      <AboutTheProgramModal isOpen={isAboutModalOpen} onClose={closeAboutModal} />
      <ResetSettingsModal isOpen={isResetWarningOpen} onClose={closeResetWarning} />
      <Autosave isOpen={isAutosaveModalOpen} onClose={closeAutosaveModal} />
    </section>
  );
};
