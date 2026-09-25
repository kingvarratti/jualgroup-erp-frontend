export default function FormField({
  label,
  error,
  helper,
  children,
  required,
}) {
  return (
    <div className="mb-4">
      {label && (
        <label className="label">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {children}
      {error && (
        <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-red-600" />
          {error.message || error}
        </p>
      )}
      {!error && helper && (
        <p className="mt-1.5 text-xs text-slate-500">{helper}</p>
      )}
    </div>
  );
}