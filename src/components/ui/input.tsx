import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Campo de texto. 44px de altura (alvo de toque), borda tintada, fundo de
 * papel. Em erro, `aria-invalid` vem do formulário e a borda responde
 * sozinha: nenhuma tela precisa lembrar de pintar o campo.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-controle border border-input bg-card px-3.5 py-2 text-base text-foreground shadow-sutil ring-offset-background transition-[border-color,box-shadow] duration-150 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/80 hover:border-primary/40 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
