import React from 'react';
import { CoverageVisualization, type CoverageProps } from './CoverageVisualization';

// Web has no react-native-maps; render the keyless coverage visualization instead.
// Metro resolves this `.web` file for the web bundle, so react-native-maps is never imported there.
export function ServiceAreaMap(props: CoverageProps) {
  return <CoverageVisualization {...props} />;
}
