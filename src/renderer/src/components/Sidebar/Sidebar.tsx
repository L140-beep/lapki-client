import React, { useState } from 'react';

import { Resizable } from 're-resizable';

import { Explorer } from './Explorer';

export const Sidebar: React.FC = () => {
  const [width, setWidth] = useState(260);

  return (
    <Resizable
      enable={{ right: true }}
      size={{ width, height: '100%' }}
      minWidth={260}
      maxWidth="80vw"
      onResizeStop={(_event, _direction, _element, delta) => setWidth(width + delta.width)}
      className="z-50 overflow-hidden border-r border-border-primary bg-bg-secondary"
    >
      <div className="h-full w-full overflow-y-auto scrollbar-thin scrollbar-track-scrollbar-track scrollbar-thumb-scrollbar-thumb">
        <Explorer />
      </div>
    </Resizable>
  );
};
