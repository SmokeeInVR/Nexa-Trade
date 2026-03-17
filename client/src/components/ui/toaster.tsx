import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export function Toaster() {
  const { toasts } = useToast()
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map(t => (
        <div key={t.id} className={cn("rounded-lg border p-4 shadow-lg bg-card text-card-foreground", t.variant === "destructive" && "border-destructive bg-destructive text-destructive-foreground")}>
          <div className="font-semibold text-sm">{t.title}</div>
          {t.description && <div className="text-sm opacity-80 mt-1">{t.description}</div>}
        </div>
      ))}
    </div>
  )
}
