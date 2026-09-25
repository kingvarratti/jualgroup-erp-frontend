import EmptyState from './EmptyState';
import TableSkeleton from './TableSkeleton';

export default function DataTable({
  columns,
  data,
  loading,
  emptyMessage,
  emptyTitle,
  emptyAction,
  emptyIcon,
  onRowClick,
  keyField = 'id',
  actions,
}) {
  if (loading) {
    return <TableSkeleton rows={5} columns={columns.length + (actions ? 1 : 0)} />;
  }

  if (!data?.length) {
    return (
      <EmptyState
        title={emptyTitle || 'No records yet'}
        message={emptyMessage || 'Get started by creating your first entry.'}
        action={emptyAction}
        icon={emptyIcon}
      />
    );
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.className || ''}>
                {col.label}
              </th>
            ))}
            {actions && <th className="text-right">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={row[keyField] || idx}
              className={`transition-colors ${
                onRowClick ? 'cursor-pointer hover:bg-blue-50/40' : ''
              }`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td key={col.key} className={col.className || ''}>
                  {col.render ? col.render(row) : row[col.key] ?? '—'}
                </td>
              ))}
              {actions && (
                <td className="text-right" onClick={(e) => e.stopPropagation()}>
                  {actions(row)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}