export default function Loader({ fullScreen = false }) {
  const spinner = (
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
  );

  if (!fullScreen) {
    return <div className="flex items-center justify-center p-12">{spinner}</div>;
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
      {spinner}
    </div>
  );
}