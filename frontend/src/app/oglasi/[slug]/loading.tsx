export default function ListingDetailLoading() {
  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[1fr_360px]">
      <section className="space-y-5">
        <div className="skeleton aspect-[4/3]" />
        <div className="skeleton h-9 w-2/3" />
        <div className="skeleton h-5" />
        <div className="skeleton h-5 w-5/6" />
      </section>
      <aside className="space-y-4">
        <div className="skeleton h-28" />
        <div className="skeleton h-12" />
        <div className="skeleton h-12" />
      </aside>
    </div>
  );
}
