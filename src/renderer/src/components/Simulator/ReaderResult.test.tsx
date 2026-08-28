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
  it('shows the last input and both ordered signal sequences', () => {
    const html = renderToStaticMarkup(<ReaderResult result={result} input="Я🙂" stale={false} />);

    expect(html).toContain('Вход последнего запуска');
    expect(html).toContain('Я🙂');
    expect(html).toContain('2 символов');
    expect(html).toContain('reader.char_accepted');
    expect(html).toContain('reader.line_finished');
    expect(html).toContain('impulseA');
  });

  it('keeps a stale result visible with a warning', () => {
    const html = renderToStaticMarkup(<ReaderResult result={result} input="text" stale />);

    expect(html).toContain('Результат устарел');
    expect(html).toContain('reader.char_accepted');
  });

  it('shows an empty state before the first run', () => {
    const html = renderToStaticMarkup(<ReaderResult input="" stale={false} />);

    expect(html).toContain('Результат появится после запуска');
  });
});
