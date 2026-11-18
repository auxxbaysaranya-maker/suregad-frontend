import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../lib/utils";

/**
 * Accessible dialog: a bottom sheet on phones, a centred card on larger screens.
 * Focus trapping, Escape and outside-click close come from Radix.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  size = "md",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const width = size === "sm" ? "sm:max-w-md" : size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg";
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-ink/45 backdrop-blur-[3px] data-[state=closed]:animate-[fade-out_0.2s_ease_forwards] data-[state=open]:animate-[fade-in_0.2s_ease]" />
        <Dialog.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-[61] flex max-h-[92dvh] flex-col rounded-t-[28px] bg-white shadow-[0_-20px_60px_-20px_rgba(16,17,55,0.5)] outline-none",
            "data-[state=closed]:animate-[sheet-out_0.22s_ease-in_forwards] data-[state=open]:animate-[sheet-in_0.32s_cubic-bezier(0.22,1,0.36,1)]",
            "sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-[calc(100%-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[28px]",
            "sm:data-[state=closed]:animate-[pop-out_0.18s_ease-in_forwards] sm:data-[state=open]:animate-[pop-in_0.25s_cubic-bezier(0.22,1,0.36,1)]",
            width,
            className,
          )}
        >
          <div className="mx-auto mt-2.5 h-1.5 w-11 shrink-0 rounded-full bg-line sm:hidden" aria-hidden="true" />
          <div className="flex shrink-0 items-start justify-between gap-4 px-5 pt-4 pb-3 sm:px-6 sm:pt-6">
            <div className="min-w-0">
              <Dialog.Title className="font-display text-[22px] leading-tight font-bold text-ink">{title}</Dialog.Title>
              {description ? <Dialog.Description className="mt-1 text-[14px] text-muted">{description}</Dialog.Description> : <Dialog.Description className="sr-only">{typeof title === "string" ? title : "Dialog"}</Dialog.Description>}
            </div>
            <Dialog.Close className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-canvas text-ink ring-1 ring-line transition hover:bg-ink hover:text-white" aria-label="Close">
              <X size={18} />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-6">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
