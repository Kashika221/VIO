// src/components/ui/AspectRatio.jsx
import React from 'react';
import * as AspectRatioPrimitive from '@radix-ui/react-aspect-ratio';

export function AspectRatio(props) {
  return <AspectRatioPrimitive.Root data-slot="aspect-ratio" {...props} />;
}
