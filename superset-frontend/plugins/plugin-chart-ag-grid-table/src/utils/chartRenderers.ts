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
import { NumericCellRenderer } from '../renderers/NumericCellRenderer';
import { SparklineRenderer } from '../renderers/SparklineRenderer';
import { HistogramRenderer } from '../renderers/HistogramRenderer';
import { MiniBarRenderer } from '../renderers/MiniBarRenderer';
import { InputColumn } from '../types';

const CHART_RENDERERS: Record<string, any> = {
  'sparkline': SparklineRenderer,
  'histogram': HistogramRenderer,
  'minibar': MiniBarRenderer,
  'horizontal-bar': NumericCellRenderer,
  'default': NumericCellRenderer,
};

export const getChartRenderer = (chartType?: string) => {
  return CHART_RENDERERS[chartType || 'default'] || CHART_RENDERERS.default;
};

export const shouldUseChartRenderer = (col: InputColumn): boolean => {
  return !!(
    col.config?.chartType &&
    col.config.chartType !== 'default' &&
    col.config.chartType !== 'horizontal-bar' // horizontal-bar is handled by NumericCellRenderer but via different logic? 
    // Actually, if we map 'horizontal-bar' to NumericCellRenderer here, we might want to use it via this mechanism too.
    // But existing logic might already handle it.
    // The proposal says: col.config.chartType !== 'horizontal-bar' // existing numeric renderer
    // So we skip it here if we want to use existing logic, OR we unify it.
    // For now, let's follow the proposal: skip it here so it falls back to existing logic if that's what the proposal implied.
    // Proposal:
    // return !!(
    //   col.config?.chartType && 
    //   col.config.chartType !== 'default' &&
    //   col.config.chartType !== 'horizontal-bar'
    // );
  );
};
