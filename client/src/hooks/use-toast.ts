import { useState } from "react"

type Toast = { id: string; title: string; description?: string; variant?: "default" | "destructive" }

let toastCount = 0
const listeners: ((toasts: Toast[]) => void)[] = []
let toasts: Toast[] = []

function addToast(toast: Omit<Toast, "id">) {
  const id = String(++toastCount)
  toasts = [...toasts, { ...toast, id }]
  listeners.forEach(l => l(toasts))
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id)
    listeners.forEach(l => l(toasts))
  }, 4000)
}

export function useToast() {
  const [, setToasts] = useState(toasts)
  return {
    toast: addToast,
    toasts,
  }
}
