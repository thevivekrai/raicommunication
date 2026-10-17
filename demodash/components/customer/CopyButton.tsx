"use client";
import { useToast } from "@/components/Toast";
import { CopyIcon } from "@/components/Icons";

export function CopyButton({ text }: { text: string }) {
  const toast = useToast();
  return (
    <button
      className="btn-secondary btn-sm"
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); toast.success("Copied"); } catch { toast.info(text); }
      }}
    >
      <CopyIcon width={14} height={14} /> Copy
    </button>
  );
}
