declare module 'victory-native' {
    import { ViewProps } from 'react-native';
    import React from 'react';

    export interface VictoryCommonProps {
      data?: any[];
      x?: string | number;
      y?: string | number;
      width?: number;
      height?: number;
      padding?: number | { top?: number; bottom?: number; left?: number; right?: number };
      scale?: any;
      domain?: any;
      domainPadding?: any;
      style?: any;
    }

    export interface VictoryChartProps extends VictoryCommonProps {
      containerComponent?: React.ReactElement;
    }

    export interface VictoryBarProps extends VictoryCommonProps {
      labels?: ((props: any) => string) | string[];
      labelComponent?: React.ReactElement;
    }

    export interface VictoryAxisProps extends VictoryCommonProps {
      dependentAxis?: boolean;
      tickFormat?: (tick: any) => string;

    }
    export class VictoryChart extends React.Component<VictoryChartProps & ViewProps> {}
    export class VictoryBar extends React.Component<VictoryBarProps & ViewProps> {}
    export class VictoryAxis extends React.Component<VictoryAxisProps & ViewProps> {}
    export class VictoryLabel extends React.Component<any> {}
    export class VictoryContainer extends React.Component<any> {}
  }