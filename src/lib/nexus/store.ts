import { create } from "zustand";
import type { PlatformId } from "./types";

export type ComposerPrefill = {
  content?: string;
  scheduledAt?: string;
  platforms?: PlatformId[];
  mediaUrls?: string[];
  firstComment?: string;
  utm?: string;
  draftId?: string;
};

export const useComposer = create<{
  open: boolean;
  prefill: ComposerPrefill | null;
  setOpen: (open: boolean) => void;
  openWith: (prefill?: ComposerPrefill) => void;
}>((set) => ({
  open: false,
  prefill: null,
  setOpen: (open) => set(open ? { open: true } : { open: false, prefill: null }),
  openWith: (prefill) => set({ open: true, prefill: prefill ?? {} }),
}));
