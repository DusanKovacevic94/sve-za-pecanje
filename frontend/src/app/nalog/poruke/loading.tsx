export default function MessagesLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="skeleton h-8 w-48" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-sand-200 bg-white p-4">
            <div className="skeleton h-5 w-2/3" />
            <div className="skeleton mt-3 h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
