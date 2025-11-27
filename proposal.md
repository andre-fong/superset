# Proposal: Extending AG Grid Table with Custom Cell Renderers for Charts

We will modify, create, and reference the following files in ag; 
```
superset-frontend/plugins/plugin-chart-ag-grid-table/src/
├── utils/
│   ├── useColDefs.ts          (modify)
│   ├── useTableTheme.ts       (reference)
│   └── chartRenderers.ts      (create) \\ used for assignment logic (see Factory Pattern Solution)
├── renderers/
│   ├── NumericCellRenderer.tsx  (reference)
│   ├── TextCellRenderer.tsx     (reference)
│   ├── SparklineRenderer.tsx    (create)
│   ├── HistogramRenderer.tsx    (create)
│   └── MiniBarRenderer.tsx      (create)
├── types.ts                   (modify)
└── transformProps.ts             (modify)
```
We will also modify ControlPanelConfig: `superset-frontend/src/explore/controlPanels/Table.tsx`
### Data Flow Diagram:
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌──────────────────┐
│   Backend API   │    │  transformProps  │    │   useColDefs    │    │   AG Grid        │
│                 │───▶│                  │───▶│                 │───▶│   Rendered       │
│ - form_data     │    │ - Data cleanup   │    │ - Column config │    │   Table          │
│ - query results │    │ - Column config  │    │ - Cell renderers│    │                  │
│ - column_config │    │ - Formatters     │    │ - Styling       │    │                  │
└─────────────────┘    └──────────────────┘    └─────────────────┘    └──────────────────┘
       ▲                         │                         │                         │
       │                         ▼                         ▼                         ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌──────────────────┐
│   UI Controls   │    │ AgGridTableChart │    │ Chart Renderers │    │    User View     │
│                 │    │                  │    │                 │    │                  │
│ - Chart type    │    │ Props consumed   │    │ - Sparkline     │    │                  │
│ - Chart config  │    │ by component     │    │ - Histogram     │    │                  │
│ - User settings │    │                  │    │ - Mini bars     │    │                  │
└─────────────────┘    └──────────────────┘    └─────────────────┘    └──────────────────┘
```



## Proposed Integration Solution

#### Summary of Integration Strategy
* **Extend useColDefs.ts** - Add chart renderer selection logic
* **Create renderer factory** - Centralized chart renderer management  
* **Update TableColumnConfig** - Add chartType and chartConfig options
* **Update TableChartProps** - Add chart config processing function
* **Build chart renderers** - Follow established patterns from NumericCellRenderer
* **Add configuration UI** - Dashboard column settings integration

### Factory Pattern Solution
Proposal: We create a new file chartRenderers.ts (under .../src/utils) which implements a modular factory pattern for selecting a custom cell renderer; this enables better modularity and extensibility. 
File Location: `superset-frontend/plugins/plugin-chart-ag-grid-table/src/utils/chartRenderers.ts`
#### **Proposed Implementation:**
```typescript
// superset-frontend/plugins/plugin-chart-ag-grid-table/src/utils/chartRenderers.ts

import { NumericCellRenderer } from '../renderers/NumericCellRenderer'; // existing
import { SparklineRenderer } from '../renderers/SparklineRenderer';     // new
import { HistogramRenderer } from '../renderers/HistogramRenderer';     // new  
import { MiniBarRenderer } from '../renderers/MiniBarRenderer';         // new
import type { InputColumn } from '../types';

const CHART_RENDERERS = {
  'sparkline': SparklineRenderer,
  'histogram': HistogramRenderer,
  'minibar': MiniBarRenderer,
  'horizontal-bar': NumericCellRenderer, // existing horizontal bars
  'default': NumericCellRenderer,        // fallback to existing
};

export const getChartRenderer = (chartType: string) => {
  return CHART_RENDERERS[chartType] || CHART_RENDERERS.default;
};

export const shouldUseChartRenderer = (col: InputColumn, data: any[]): boolean => {
  return !!(
    col.config?.chartType && 
    col.config.chartType !== 'default' &&
    col.config.chartType !== 'horizontal-bar' // existing numeric renderer
  );
};
```
 Then Import in useColDefs.ts:
```typescript
import { SparklineRenderer } from '../renderers/SparklineRenderer';
import { HistogramRenderer } from '../renderers/HistogramRenderer'; 
import { MiniBarRenderer } from '../renderers/MiniBarRenderer';
// Add other renderers if any
import { getChartRenderer, shouldUseChartRenderer } from './chartRenderers';
```
---
### 2. Config:
### Part a): Modifying TableColumnConfig
#### **Current TableColumnConfig Interface (Lines 48-62):** (`.../src/types.ts`)
```typescript
export type TableColumnConfig = {
  d3NumberFormat?: string;
  d3SmallNumberFormat?: string;
  d3TimeFormat?: string;
  columnWidth?: number;
  horizontalAlign?: 'left' | 'right' | 'center';
  showCellBars?: boolean;
  alignPositiveNegative?: boolean;
  colorPositiveNegative?: boolean;
  truncateLongCells?: boolean;
  currencyFormat?: Currency;
  visible?: boolean;
  customColumnName?: string;
  displayTypeIcon?: boolean;
};
```

#### **Updated TableColumnConfig Interface:**
```typescript
export type TableColumnConfig = {
  d3NumberFormat?: string;
  d3SmallNumberFormat?: string;
  d3TimeFormat?: string;
  columnWidth?: number;
  horizontalAlign?: 'left' | 'right' | 'center';
  showCellBars?: boolean;
  alignPositiveNegative?: boolean;
  colorPositiveNegative?: boolean;
  truncateLongCells?: boolean;
  currencyFormat?: Currency;
  visible?: boolean;
  customColumnName?: string;
  displayTypeIcon?: boolean;
  // Modification: Optional chart renderer properties
  chartType?: 'sparkline' | 'histogram' | 'minibar' | 'horizontal-bar' | 'default';
  chartConfig?: {
    width?: number;
    height?: number;
    color?: string;
    strokeWidth?: number;
    bins?: number; // For histogram
    showPoints?: boolean; // For sparkline
    showValues?: boolean; // Show numeric values alongside chart
  };
};
```
### Part b): Modifying transformProps.ts
Problem: Chart configuration input data needs to flow from UI/API to renderer selection logic
Solution: We build a processChartConfiguration function to manage this

1. Import Required Types:
```typescript
// Add to existing imports at top of file
import type { TableColumnConfig } from './types';
```

2. Add Chart Config Processing Function:
```typescript
// Add this new function after the existing helper functions (around line 400)
const processChartConfiguration = memoizeOne(function processChartConfiguration(
  columnConfig: Record<string, TableColumnConfig>,
  columns: DataColumnMeta[],
) {
  const chartColumnConfig: Record<string, TableColumnConfig> = {};
  
  columns.forEach(column => {
    const config = columnConfig[column.key] || {};
    
    if (config.chartType && config.chartType !== 'default') {
      // Validate and set defaults for chart configuration
      chartColumnConfig[column.key] = {
        ...config,
        chartType: config.chartType,
        chartConfig: {
          // Set chart-specific defaults
          width: config.chartConfig?.width ?? 60,
          height: config.chartConfig?.height ?? 20,
          color: config.chartConfig?.color,
          strokeWidth: config.chartConfig?.strokeWidth ?? 1.5,
          
          // Chart type specific defaults
          ...(config.chartType === 'sparkline' && {
            showPoints: config.chartConfig?.showPoints ?? false,
            interpolation: config.chartConfig?.interpolation ?? 'linear',
          }),
          ...(config.chartType === 'histogram' && {
            bins: config.chartConfig?.bins ?? 8,
            showDensity: config.chartConfig?.showDensity ?? false,
          }),
          ...(config.chartType === 'minibar' && {
            maxBars: config.chartConfig?.maxBars ?? 5,
            orientation: config.chartConfig?.orientation ?? 'vertical',
          }),
          
          // Universal options
          showValues: config.chartConfig?.showValues ?? true,
          valuePosition: config.chartConfig?.valuePosition ?? 'right',
          ...config.chartConfig,
        },
      };
    } else {
      // Keep existing configuration for non-chart columns
      chartColumnConfig[column.key] = config;
    }
  });
  
  return chartColumnConfig;
});
```

3. Modify Main transformProps Function:
```typescript
// In the main transformProps function, find the return statement (around line 700)
// Add chart configuration processing before the return:

const transformProps = (chartProps: TableChartProps): AgGridTableChartTransformedProps => {
  // ... existing code ...
  
  const [, percentMetrics, columns] = processColumns(chartProps);
  
  // ADD: Process chart configurations
  const { rawFormData: { column_config = {} } } = chartProps;
  const processedColumnConfig = processChartConfiguration(column_config, columns);
  
  // ... existing code continues ...
  
  return {
    // ... existing return properties ...
    columnConfig: processedColumnConfig, // ADD: Pass processed chart config
    // ... rest of existing return properties ...
  };
};
```
### Chart Configuration Flow
Recapping;
```
Backend API → transformProps.ts → AgGridTableChart → useColDefs → AG Grid → Rendered Table
     ↓              ↓                   ↓              ↓           ↓
- form_data    - Data cleanup      - Props        - Column    - Cell 
- query data   - Column config     - Transformed  - config    - renderers
- column_config - Chart validation - data/config  - Renderer  - applied
               - Default setting                  - selection
```
1. User Configuration (UI → Backend):
```typescript
// User sets in dashboard UI:
{ 
  chartType: 'sparkline',
  chartConfig: { width: 80, height: 25, showPoints: true }
}
```

2. Backend → Frontend (API Response):
```typescript
// Comes in via chartProps.rawFormData.column_config:
{
  "sales_trend": {
    "chartType": "sparkline", 
    "chartConfig": { "width": 80, "height": 25, "showPoints": true }
  }
}
```

3. transformProps Processing:
```typescript
// processChartConfiguration validates and adds defaults:
{
  "sales_trend": {
    "chartType": "sparkline",
    "chartConfig": { 
      "width": 80,           // User value
      "height": 25,          // User value  
      "showPoints": true,    // User value
      "strokeWidth": 1.5,    // Default added
      "interpolation": "linear", // Default added
      "showValues": true     // Default added
    }
  }
}
```

4. useColDefs Consumption:
```typescript
// useColDefs receives processed config and applies to renderer:
const shouldUseChart = shouldUseChartRenderer(col, data);
if (shouldUseChart) {
  cellRenderer = getChartRenderer(col.config?.chartType);
  cellRendererParams = {
    ...existingParams,
    chartConfig: col.config?.chartConfig
  };
}
```

5. Chart Renderer Usage:
```typescript
// SparklineRenderer receives configuration:
export const SparklineRenderer = (params: CellRendererProps) => {
  const { col } = params;
  const chartConfig = col.config?.chartConfig || {};
  
  return (
    <svg width={chartConfig.width} height={chartConfig.height}>
      {/* Render sparkline with config */}
    </svg>
  );
};
```


### Notes:

1. All existing TableColumnConfig properties remain unchanged
2. New chartType and chartConfig are optional
3. Fallback to existing TextCellRenderer/NumericCellRenderer (Backwards Compatibility)
4. Maintain memoisation and error handling patterns
---
### 3. UI:
File Location: `superset-frontend/src/explore/controlPanels/Table.tsx`

Proposed Solution:
```typescript
// Add to the control panel configuration
const config: ControlPanelConfig = {
  // ... existing config
  controlPanelSections: [
    // ... existing sections
    {
      label: t('Column Configuration'),
      expanded: false,
      controlSetRows: [
        // ... existing controls
        [
          {
            name: 'column_config',
            config: {
              type: 'CollectionControl',
              label: t('Column Configuration'),
              description: t('Configure individual column display and chart settings'),
              keyAccessor: 'key',
              valueAccessor: 'config', 
              controlOverrides: {
                chartType: {
                  type: 'SelectControl',
                  label: t('Chart Type'),
                  default: 'default',
                  choices: [
                    ['default', t('Default (Text/Numbers)')],
                    ['sparkline', t('Sparkline Chart')],
                    ['histogram', t('Histogram')],
                    ['minibar', t('Mini Bar Chart')],
                    ['horizontal-bar', t('Horizontal Bars')],
                  ],
                  description: t('Select chart type for this column'),
                },
                chartConfig: {
                  type: 'JsonControl',
                  label: t('Chart Settings'),
                  description: t('Chart-specific configuration (width, height, etc.)'),
                },
              },
            },
          },
        ],
      ],
    },
  ],
};
```