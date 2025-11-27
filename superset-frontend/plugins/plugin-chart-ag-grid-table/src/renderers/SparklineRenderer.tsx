/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React, { ReactElement } from 'react';
import { CellRendererProps } from '../types';
// @ts-ignore
import SparklineCell from '../../../../src/visualizations/TimeTable/components/SparklineCell';

export const SparklineRenderer = (params: CellRendererProps): ReactElement | null => {
  const { value, colDef } = params;
  
  if (!colDef) return null;

  const { config } = colDef as any;
  const chartConfig = config?.chartConfig || {};

  if (!value || !Array.isArray(value)) {
    return null;
  }

  // Parse dimensions
  const width = chartConfig.width || 300;
  const height = chartConfig.height || 50;

  return (
    <SparklineCell
      ariaLabel={`spark-${colDef.field}`}
      width={width}
      height={height}
      data={value}
      dataKey={`spark-${colDef.field}`}
      numberFormat={config?.d3NumberFormat || ''}
      showYAxis={chartConfig.showValues ?? false}
      sparkType={chartConfig.chartType === 'sparkline' ? (chartConfig.showPoints ? 'line' : 'line') : 'bar'}
      entries={[]}
    />
  );
};
