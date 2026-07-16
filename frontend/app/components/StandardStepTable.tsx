import React from 'react';
import RawHexViewerButton from './RawHexViewer';
import { stepPanelTableBarClass, stepPanelTableWrapClass } from './stepPanelConstants';

export type StepTableColumn<Row> = {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  cell: (row: Row) => React.ReactNode;
};

type StandardStepTableProps<Row> = {
  columns: Array<StepTableColumn<Row>>;
  rows: Row[];
  barText: React.ReactNode;
  emptyText?: string;
  footnote?: React.ReactNode;
  getRowKey?: (row: Row, index: number) => string;
  getRawHexData?: (row: Row) => unknown;
  rawHexTitle?: string | ((row: Row, index: number) => string);
  className?: string;
};

function alignClass(align?: 'left' | 'right' | 'center') {
  if (align === 'right') return 'text-right';
  if (align === 'center') return 'text-center';
  return 'text-left';
}

export default function StandardStepTable<Row>({
  columns,
  rows,
  barText,
  emptyText = 'No rows available',
  footnote,
  getRowKey,
  getRawHexData,
  rawHexTitle = 'Raw Hex Details',
  className = '',
}: StandardStepTableProps<Row>) {
  return (
    <div className={`${stepPanelTableWrapClass} ${className}`}>
      <div className={stepPanelTableBarClass}>{barText}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="border-b border-line/10 bg-fill-subtle/5">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={`p-3 font-medium text-fg/80 ${alignClass(col.align)}`}>
                  {col.header}
                </th>
              ))}
              {getRawHexData && (
                <th className="p-3 text-right font-medium text-fg/80">
                  Raw Hex
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr className="border-b border-line/5">
                <td className="p-3 text-fg/60" colSpan={columns.length + (getRawHexData ? 1 : 0)}>
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={getRowKey ? getRowKey(row, idx) : `row-${idx}`} className="border-b border-line/5 hover:bg-fill-subtle/5">
                  {columns.map((col) => (
                    <td key={col.key} className={`p-3 text-fg/85 ${alignClass(col.align)}`}>
                      {col.cell(row)}
                    </td>
                  ))}
                  {getRawHexData && (
                    <td className="p-3 text-right">
                      <RawHexViewerButton
                        data={getRawHexData(row)}
                        title={typeof rawHexTitle === 'function' ? rawHexTitle(row, idx) : rawHexTitle}
                        buttonLabel="View Raw Hex"
                      />
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {footnote && <p className="px-3 py-2 text-center text-xs text-fg/50">{footnote}</p>}
    </div>
  );
}
