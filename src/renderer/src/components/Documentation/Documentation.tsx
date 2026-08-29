import React, { useEffect, useState } from 'react';

import { Resizable } from 're-resizable';
import { toast } from 'sonner';
import { twMerge } from 'tailwind-merge';

import { ReactComponent as Close } from '@renderer/assets/icons/close.svg';
import { useFetch, useSettings } from '@renderer/hooks';
import { useDoc } from '@renderer/store/useDoc';
import { File } from '@renderer/types/documentation';

import { Navigation } from './components/Navigation';
import { Show } from './components/Show';
import { Tree } from './components/Tree';

import Reference from '../ReferenceModal/Reference';
import { TaskBook } from '../Tasks';

export interface CurrentItem {
  isHtml: boolean;
  url: string;
  path: string;
}

export interface DocumentationProps {
  width: number;
  onWidthChange: (width: number) => void;
}

export const Documentation: React.FC<DocumentationProps> = ({ width, onWidthChange }) => {
  const [doc] = useSettings('doc');
  const rawUrl = doc?.type === 'local' ? doc?.localHost ?? '' : doc?.remoteHost ?? '';
  const url = rawUrl ? (rawUrl.endsWith('/') ? rawUrl : rawUrl + '/') : '';

  const { data, isLoading, error, refetch } = useFetch<{ body: File }>(
    url && `${url}index.json?nocache=true`
  );

  const [activeTab, setActiveTab] = useState<number>(0);
  const [currentItem, setCurrentItem] = useState<CurrentItem | null>(null);

  const [isOpen, toggleOpen, closePanel, activeView, setActiveView, openDocumentation] = useDoc(
    (state) => [
      state.isOpen,
      state.toggleOpen,
      state.close,
      state.activeView,
      state.setActiveView,
      state.openDocumentation,
    ]
  );
  const [minWidth, setMinWidth] = useState(5);
  const [maxWidth, setMaxWidth] = useState('60vw');

  const handleResize = (e, _direction, ref) => {
    if (e.pageX < 0.95 * window.innerWidth && !isOpen) {
      toggleOpen();
    }

    if (e.pageX >= 0.95 * window.innerWidth && isOpen) {
      toggleOpen();
    }
    //Получаем ширину блока документации
    onWidthChange(parseInt(ref.style.width));
  };

  useEffect(() => {
    if (!isOpen) {
      setMaxWidth('5px');
      setMinWidth(5);
    } else {
      setMaxWidth('60vw');
      setMinWidth(420);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'F1') {
        openDocumentation();
      }
    };
    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [openDocumentation]);

  const onItemClick = (filePath: string) => {
    setActiveTab(1);

    if (filePath.endsWith('html')) {
      return setCurrentItem({
        isHtml: true,
        path: filePath,
        url: encodeURI(`${url}${filePath}?nocache=true`),
      });
    }

    return setCurrentItem({
      isHtml: false,
      path: filePath,
      url: encodeURI(`${url}${filePath}`),
    });
  };

  const onClose = () => {
    onWidthChange(0);
    closePanel();
  };

  const renderContent = () => {
    if (isLoading) {
      return <div>Загрузка...</div>;
    }

    if (error || !data) {
      return (
        <div className="px-4 pt-10">
          <div className="text-lg">Ошибка загрузки. Что-то пошло не так.</div>
          <button className="btn-primary" onClick={refetch}>
            Перезагрузить
          </button>
        </div>
      );
    }

    return (
      <section className="flex h-full select-none flex-col bg-bg-primary px-2 pt-4">
        <div className="relative mb-3 flex items-center justify-between border-b border-border-primary pb-1">
          <h1 className="text-2xl font-bold">Документация</h1>
          <button
            className="rounded-full p-3 outline-none transition-colors hover:bg-bg-hover active:bg-bg-active"
            onClick={() => onClose()}
          >
            <Close width="1rem" height="1rem" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1 pb-2">
          <button
            className={twMerge(
              'rounded border border-primary p-2',
              activeTab === -1 && 'bg-primary text-text-secondary'
            )}
            onClick={() => setActiveTab(-1)}
          >
            Компоненты
          </button>
          <button
            className={twMerge(
              'rounded border border-primary p-2',
              activeTab === 0 && 'bg-primary text-text-secondary'
            )}
            onClick={() => setActiveTab(0)}
          >
            Содержание
          </button>
          <button
            className={twMerge(
              'rounded border border-primary p-2 disabled:cursor-not-allowed disabled:opacity-30',
              activeTab === 1 && 'bg-primary text-text-secondary'
            )}
            onClick={() => setActiveTab(1)}
            disabled={!currentItem}
          >
            Просмотр
          </button>
        </div>
        <div className="h-full overflow-y-hidden">
          <div className={twMerge('h-full', activeTab !== -1 && 'hidden')}>{<Reference />}</div>

          <div className={twMerge('h-full', activeTab !== 0 && 'hidden')}>
            {<Tree root={data.body} borderWidth={0} onItemClick={onItemClick} />}
          </div>

          <div className={twMerge('h-full', activeTab !== 1 && 'hidden')}>
            {currentItem && (
              <>
                <Show item={currentItem} />
                <Navigation data={data} onItemClick={onItemClick} currentPath={currentItem.path} />
              </>
            )}
          </div>
        </div>
      </section>
    );
  };

  useEffect(() => {
    if (!error) return;

    toast.error('Ошибка при подключении к серверу документации', {
      description: error.toString(),
    });
  }, [error]);

  return (
    <Resizable
      enable={{ left: true }}
      size={{ width: width, height: '100%' }}
      minWidth={minWidth}
      maxWidth={maxWidth}
      onResize={handleResize}
      className="h-full border-l border-border-primary bg-bg-secondary"
    >
      <div className="flex h-screen min-h-0 flex-col">
        <div className="grid grid-cols-2 gap-1 border-b border-border-primary bg-bg-secondary p-2">
          <button
            type="button"
            className={twMerge(
              'rounded border border-primary p-2 text-sm',
              activeView === 'documentation' && 'bg-primary text-text-secondary'
            )}
            onClick={() => setActiveView('documentation')}
          >
            Документация
          </button>
          <button
            type="button"
            className={twMerge(
              'rounded border border-primary p-2 text-sm',
              activeView === 'tasks' && 'bg-primary text-text-secondary'
            )}
            onClick={() => setActiveView('tasks')}
          >
            Задачник
          </button>
        </div>
        <div className="min-h-0 flex-1">
          {activeView === 'documentation' ? renderContent() : <TaskBook onClose={onClose} />}
        </div>
      </div>
    </Resizable>
  );
};
