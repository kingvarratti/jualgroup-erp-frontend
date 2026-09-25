export default function TableSkeleton({ rows = 5, columns = 5 }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i}>
                <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx}>
              {Array.from({ length: columns }).map((_, colIdx) => (
                <td key={colIdx}>
                  <div
                    className="h-4 bg-slate-100 rounded animate-pulse"
                    style={{ width: `${60 + Math.random() * 30}%` }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}