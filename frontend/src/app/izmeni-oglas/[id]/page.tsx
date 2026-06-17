export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-black">Izmeni oglas</h1>
      <p className="mt-6 rounded-lg bg-white p-6 text-slate-600">API podržava izmenu oglasa `{id}` preko PATCH `/listings/{id}`.</p>
    </div>
  );
}

