export default function FavoritesLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="skeleton h-8 w-52" />
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-3 rounded-md border border-slate-200 bg-white p-3">
            <div className="skeleton aspect-[4/3]" />
            <div className="skeleton h-5" />
            <div className="skeleton h-5 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
