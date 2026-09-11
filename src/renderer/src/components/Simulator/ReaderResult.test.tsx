import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SimulationResult } from '@renderer/types/InterpreterTypes';

import { ReaderResult } from './ReaderResult';

const result: SimulationResult = {
  status: 'success',
  result: {
    signals: ['reader.char_accepted', 'reader.line_finished'],
    calledSignals: ['impulseA'],
  },
};

describe('ReaderResult', () => {
  it('shows output impulses without system events', () => {
    const html = renderToStaticMarkup(<ReaderResult result={result} stale={false} />);

    expect(html).toContain('impulseA');
    expect(html).not.toContain('Завершено');
    expect(html).not.toContain('grid-cols-[2rem_minmax(0,1fr)]');
    expect(html).not.toContain('bg-bg-secondary');
    expect(html).not.toContain('reader.char_accepted');
    expect(html).not.toContain('reader.line_finished');
    expect(html).not.toContain('Системные события');
  });

  it('keeps a stale result visible with a warning', () => {
    const html = renderToStaticMarkup(<ReaderResult result={result} stale />);

    expect(html).toContain('Результат устарел');
    expect(html).toContain('impulseA');
  });

  it('shows an empty state before the first run', () => {
    const html = renderToStaticMarkup(<ReaderResult stale={false} />);

    expect(html).toContain('Импульсы появятся после запуска');
  });

  it('shows an unnumbered empty state without a gray background', () => {
    const html = renderToStaticMarkup(
      <ReaderResult
        result={{ status: 'success', result: { signals: [], calledSignals: [] } }}
        stale={false}
      />
    );

    expect(html).toContain('Нет выходных импульсов');
    expect(html).not.toContain('Завершено');
    expect(html).not.toContain('bg-bg-secondary');
  });
});
