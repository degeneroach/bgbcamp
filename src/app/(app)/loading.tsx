// Instant-feedback skeleton for page transitions. Having a loading boundary
// also lets Next prefetch the layout shell for dynamic routes, so link
// clicks respond immediately instead of waiting on the server roundtrip.
export default function AppLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-busy>
      <div className="flex flex-col gap-2">
        <div className="h-7 w-56 rounded-md bg-muted" />
        <div className="h-4 w-80 rounded-md bg-muted/70" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-36 rounded-2xl bg-muted/60" />
        <div className="h-36 rounded-2xl bg-muted/60" />
        <div className="hidden h-36 rounded-2xl bg-muted/60 lg:block" />
      </div>
      <div className="h-64 rounded-2xl bg-muted/40" />
    </div>
  );
}
