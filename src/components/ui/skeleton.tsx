import { cn } from "@/lib/utils";

/** Esqueleto com brilho cor de papel, não cinza. Para dentro de listas e cards. */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("brilho-papel rounded-md bg-muted", className)} {...props} />;
}

export { Skeleton };
