import EmptyState from './EmptyState';
import Loader from './Loader';

export default function DataTable({
  columns,
  data,
  loading,
  emptyMessage = 'No records found',
  onRowClick,
  keyField = 'id',
  actions,
}) {
  if (loading) return <Loader />;
  if (!data?.length) return <EmptyState message={emptyMessage} />;

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
              className={onRowClick ? 'cursor-pointer' : ''}
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