export default function StatCard({
  label,
  value,
  icon: Icon,
  color = 'brand',
  hint,
  onClick,
}) {
  const colors = {
    brand: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    purple: 'bg-purple-50 text-purple-700',
  };

  const clickable = !!onClick;

  return (
    <div
      onClick={onClick}
      className={`card p-5 ${
        clickable ? 'card-hover cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-800 truncate">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-500 truncate">{hint}</p>}
        </div>
        {Icon && (
          <div className={`p-3 rounded-lg ${colors[color] || colors.brand}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}