import transformProps from '../src/transformProps';
import { TableChartProps } from '../src/types';

describe('transformProps', () => {
  const baseProps: TableChartProps = {
    datasource: {
      columns: [],
      verboseMap: {},
      columnFormats: {},
      currencyFormats: {},
    },
    rawFormData: {
      column_config: {
        'col1': {
          chartType: 'sparkline',
          chartConfig: {
            width: 100,
          },
        },
        'col2': {
          chartType: 'histogram',
        },
      },
      metrics: [],
      percent_metrics: [],
    },
    queriesData: [
      {
        data: [{ col1: [1, 2, 3], col2: [1, 2, 3] }],
        colnames: ['col1', 'col2'],
        coltypes: [0, 0], // Numeric
      },
    ],
    width: 800,
    height: 600,
    hooks: { setDataMask: () => {}, onChartStateChange: () => {} },
    filterState: { filters: {} },
    emitCrossFilters: false,
  } as any;

  it('should process chart configuration with defaults', () => {
    const result = transformProps(baseProps);
    const columns = result.columns;

    const col1 = columns.find(c => c.key === 'col1');
    const col2 = columns.find(c => c.key === 'col2');

    expect(col1?.config?.chartType).toBe('sparkline');
    expect(col1?.config?.chartConfig?.width).toBe(100);
    expect(col1?.config?.chartConfig?.height).toBe(20); // Default
    expect(col1?.config?.chartConfig?.showPoints).toBe(false); // Default for sparkline

    expect(col2?.config?.chartType).toBe('histogram');
    expect(col2?.config?.chartConfig?.bins).toBe(8); // Default for histogram
    expect(col2?.config?.chartConfig?.showValues).toBe(true); // Universal default
  });
});
