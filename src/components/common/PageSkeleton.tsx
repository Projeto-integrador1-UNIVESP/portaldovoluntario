import { Skeleton } from "@/components/ui/skeleton";

/**
 * Fallback de carregamento de rota. Reserva a altura da tela para que a troca
 * de página não provoque salto de layout enquanto o chunk é baixado.
 */
export function PageSkeleton() {
  return (
    <div className="container min-h-[60vh] py-10" role="status" aria-live="polite">
      <span className="sr-only">Carregando página…</span>
      <Skeleton className="h-9 w-2/3 max-w-sm" />
      <Skeleton className="mt-3 h-4 w-full max-w-md" />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border bg-card">
            <Skeleton className="h-36 w-full rounded-none" />
            <div className="p-5">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="mt-2 h-4 w-1/2" />
              <Skeleton className="mt-5 h-2 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
