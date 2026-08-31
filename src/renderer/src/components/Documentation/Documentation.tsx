import React, { useEffect, useRef, useState } from 'react';

import { Resizable } from 're-resizable';
import {
  ImperativePanelGroupHandle,
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from 'react-resizable-panels';
import { toast } from 'sonner';
import { twMerge } from 'tailwind-merge';

import { ReactComponent as Close } from '@renderer/assets/icons/close.svg';
import { useFetch, useSettings } from '@renderer/hooks';
import { useDoc } from '@renderer/store/useDoc';
import { File } from '@renderer/types/documentation';

import { Navigation } from './components/Navigation';
import { Show } from './components/Show';
import { Tree } from './components/Tree';

import ReferencePanel from '../ReferenceModal/Reference';
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

const DocumentationSection: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [doc] = useSettings('doc');
  const rawUrl = doc?.type === 'local' ? doc?.localHost ?? '' : doc?.remoteHost ?? '';
  const url = rawUrl ? (rawUrl.endsWith('/') ? rawUrl : rawUrl + '/') : '';
  const { data, isLoading, error, refetch } = useFetch<{ body: File }>(
    url && `${url}index.json?nocache=true`
  );
  const [activeTab, setActiveTab] = useState<number>(0);
  const [currentItem, setCurrentItem] = useState<CurrentItem | null>(null);

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

  useEffect(() => {
    if (!error) return;

    toast.error('Ошибка при подключении к серверу документации', {
      description: error.toString(),
    });
  }, [error]);

  if (isLoading) return <div>Загрузка...</div>;

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
          type="button"
          className="rounded-full p-3 outline-none transition-colors hover:bg-bg-hover active:bg-bg-active"
          aria-label="Закрыть документацию"
          onClick={onClose}
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
        <div className={twMerge('h-full', activeTab !== -1 && 'hidden')}>
          <ReferencePanel />
        </div>
        <div className={twMerge('h-full', activeTab !== 0 && 'hidden')}>
          <Tree root={data.body} borderWidth={0} onItemClick={onItemClick} />
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

export const Documentation: React.FC<DocumentationProps> = ({ width, onWidthChange }) => {
  const [isOpen, toggleOpen, visibleViews, mountedViews, closeView, toggleDocumentation] = useDoc(
    (state) => [
      state.isOpen,
      state.toggleOpen,
      state.visibleViews,
      state.mountedViews,
      state.closeView,
      state.onDocumentationToggle,
    ]
  );
  const [minWidth, setMinWidth] = useState(5);
  const [maxWidth, setMaxWidth] = useState('60vw');
  const panelGroupRef = useRef<ImperativePanelGroupHandle>(null);
  const splitLayout = useRef([50, 50]);
  const bothMounted = mountedViews.documentation && mountedViews.tasks;
  const bothVisible = visibleViews.documentation && visibleViews.tasks;
  const hasVisibleView = visibleViews.documentation || visibleViews.tasks;

  const handleResize = (event, _direction, ref) => {
    if (event.pageX < 0.95 * window.innerWidth && !isOpen) toggleOpen();
    if (event.pageX >= 0.95 * window.innerWidth && isOpen) toggleOpen();
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
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'F1') {
        event.preventDefault();
        toggleDocumentation();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [toggleDocumentation]);

  useEffect(() => {
    if (!bothMounted || !hasVisibleView) return;

    if (bothVisible) panelGroupRef.current?.setLayout(splitLayout.current);
    else if (visibleViews.documentation) panelGroupRef.current?.setLayout([100, 0]);
    else panelGroupRef.current?.setLayout([0, 100]);
  }, [bothMounted, bothVisible, hasVisibleView, visibleViews.documentation]);

  const rememberSplit = (layout: number[]) => {
    if (bothVisible && layout[0] > 0 && layout[1] > 0) splitLayout.current = layout;
  };

  return (
    <Resizable
      enable={{ left: true }}
      size={{ width, height: '100%' }}
      minWidth={minWidth}
      maxWidth={maxWidth}
      onResize={handleResize}
      className="h-full overflow-hidden rounded-l-2xl border-l border-border-primary bg-bg-secondary shadow-[-2px_0_4px_rgba(0,0,0,0.25)] [[data-theme=light]_&]:bg-white"
    >
      <div className="h-full min-h-0">
        {!hasVisibleView && (
          <div className="flex h-full items-center justify-center px-6 text-center text-text-inactive">
            Откройте документацию или задачник
          </div>
        )}

        <div className={twMerge('h-full min-h-0', !hasVisibleView && 'hidden')}>
          <PanelGroup
            ref={panelGroupRef}
            direction="vertical"
            className="min-h-0"
            onLayout={rememberSplit}
          >
            {mountedViews.documentation && (
              <Panel
                key="documentation"
                id="documentation"
                order={0}
                collapsible
                collapsedSize={0}
                minSize={20}
                defaultSize={50}
                onCollapse={() => closeView('documentation')}
                className="min-h-0"
              >
                <DocumentationSection onClose={() => closeView('documentation')} />
              </Panel>
            )}

            {bothMounted && (
              <PanelResizeHandle
                key="right-sidebar-resize-handle"
                className={twMerge('group relative h-px shrink-0', !bothVisible && 'hidden')}
              >
                <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-border-primary transition-colors group-hover:h-1 group-hover:bg-primary group-active:h-1 group-active:bg-primary [[data-theme=light]_&]:bg-[#eeeeee]" />
              </PanelResizeHandle>
            )}

            {mountedViews.tasks && (
              <Panel
                key="tasks"
                id="tasks"
                order={1}
                collapsible
                collapsedSize={0}
                minSize={20}
                defaultSize={50}
                onCollapse={() => closeView('tasks')}
                className="min-h-0"
              >
                <TaskBook onClose={() => closeView('tasks')} />
              </Panel>
            )}
          </PanelGroup>
        </div>
      </div>
    </Resizable>
  );
};
