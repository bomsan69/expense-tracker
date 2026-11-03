export default function HomeLoading() {
  return (
    <div
      className="flex-1 px-4 py-6"
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="h-28 animate-pulse rounded-lg bg-secondary" />
      <div className="mt-6 flex flex-col gap-4">
        <div className="h-12 animate-pulse rounded-md bg-secondary" />
        <div className="h-12 animate-pulse rounded-md bg-secondary" />
        <div className="h-12 animate-pulse rounded-md bg-secondary" />
      </div>
      <div className="mt-8 flex flex-col gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-md bg-secondary" />
        ))}
      </div>
    </div>
  );
}
