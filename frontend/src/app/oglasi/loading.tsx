export default function ListingsLoading() {
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-3">
        <div className="skeleton h-10" />
        <div className="skeleton h-10" />
        <div className="skeleton h-10" />
      </aside>
      <section>
        <div className="skeleton h-8 w-48" />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="space-y-3 rounded-xl border border-sand-200 bg-white p-3">
              <div className="skeleton aspect-[4/3]" />
              <div className="skeleton h-5" />
              <div className="skeleton h-5 w-2/3" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
