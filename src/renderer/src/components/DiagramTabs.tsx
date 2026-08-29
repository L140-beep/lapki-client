import { useEffect, useState } from 'react';

import { ReactComponent as CompilerIcon } from '@renderer/assets/icons/compiler.svg';
import { ReactComponent as FlasherIcon } from '@renderer/assets/icons/flasher.svg';
import { ReactComponent as SerialMonitorIcon } from '@renderer/assets/icons/serial_monitor.svg';
import { ReactComponent as EditorIcon } from '@renderer/assets/icons/state_machine.svg';
import { CompilerTab } from '@renderer/components/Sidebar/Compiler';
import { FlasherTab } from '@renderer/components/Sidebar/Flasher/Flasher';
import {
  SerialMonitorStatus,
  SerialMonitorTab,
} from '@renderer/components/Sidebar/Flasher/SerialMonitor';
import { MovingModal } from '@renderer/components/UI/Modal/MovingModal';
import { WithHint } from '@renderer/components/UI/WithHint';
import { useManagerMS } from '@renderer/store/useManagerMS';
import { CompilerResult } from '@renderer/types/CompilerTypes';

const tabs = {
  editor: {
    title: 'Редактор',
    Icon: <EditorIcon className="h-6 w-6 [&_*]:stroke-current" />,
    className: '',
    modalTitle: undefined,
  },
  compiler: {
    title: 'Компилятор',
    Icon: <CompilerIcon className="h-6 w-6 [&_*]:stroke-current" />,
    className: 'h-[620px] w-[400px]',
    modalTitle: undefined,
  },
  flasher: {
    title: 'Загрузчик',
    Icon: <FlasherIcon className="h-6 w-6 [&_*]:stroke-current" />,
    className: 'h-[680px] w-[900px]',
    modalTitle: undefined,
  },
  serialMonitor: {
    title: 'Монитор порта',
    modalTitle: (
      <div className="flex items-center gap-12">
        <span>Монитор порта</span>
        <SerialMonitorStatus />
      </div>
    ),
    Icon: <SerialMonitorIcon className="h-6 w-6 [&_*]:stroke-current" />,
    className: 'h-[740px] max-h-[calc(100vh-24px)] w-[1074px] max-w-[calc(100vw-24px)]',
  },
};

type TabName = keyof typeof tabs;

export const DiagramTabs = () => {
  const [activeTab, setActiveTab] = useState<TabName>('editor');
  const [compilerData, setCompilerData] = useState<CompilerResult>();
  const [compilerStatus, setCompilerStatus] = useState('Не подключен.');
  const { setCompilerData: setCompilerDataMS } = useManagerMS();

  useEffect(() => {
    setCompilerDataMS(compilerData);
  }, [compilerData, setCompilerDataMS]);

  const renderTab = () => {
    switch (activeTab) {
      case 'compiler':
        return (
          <CompilerTab
            openData={undefined}
            compilerData={compilerData}
            setCompilerData={setCompilerData}
            compilerStatus={compilerStatus}
            setCompilerStatus={setCompilerStatus}
            openImportError={() => undefined}
          />
        );
      case 'flasher':
        return <FlasherTab />;
      case 'serialMonitor':
        return <SerialMonitorTab isTabOpen showStatus={false} />;
      default:
        return null;
    }
  };

  const tab = activeTab === 'editor' ? null : tabs[activeTab];

  return (
    <>
      <div className="absolute left-1/2 top-3 z-40 flex -translate-x-1/2 gap-[14px] rounded-lg bg-white px-2 py-1.5 shadow-[0_0_10.6px_rgba(0,0,0,0.15)]">
        {(Object.entries(tabs) as [TabName, (typeof tabs)[TabName]][]).map(
          ([name, { title, Icon }]) => (
            <WithHint key={name} hint={title} placement="bottom" offset={6} delay={100}>
              {(hintProps) => (
                <button
                  type="button"
                  className={`rounded p-1 text-icon-secondary transition-colors hover:text-icon-hover ${
                    activeTab === name ? 'bg-icon-selected-bg text-white [&_*]:stroke-white' : ''
                  }`}
                  aria-label={title}
                  onClick={() => setActiveTab(name)}
                  {...hintProps}
                >
                  {Icon}
                </button>
              )}
            </WithHint>
          )
        )}
      </div>

      {tab && (
        <MovingModal
          key={activeTab}
          id={activeTab}
          title={tab.modalTitle ?? tab.title}
          isOpen
          onRequestClose={() => setActiveTab('editor')}
          hideCancelButton
          className={tab.className}
        >
          <div className="h-full overflow-auto">{renderTab()}</div>
        </MovingModal>
      )}
    </>
  );
};
