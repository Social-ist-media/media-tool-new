import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import {
  listConnections,
  listDrafts,
  listTemplates,
  publishPost,
  rewriteCopy,
  saveDraft,
  submitApproval,
} from "@/lib/nexus/data";
import { PLATFORM_META, PLATFORM_ORDER, PlatformGlyph, PlatformIcon } from "@/lib/nexus/platforms";
import { useComposer } from "@/lib/nexus/store";
import type { Connection, Draft, PlatformId, PublishTargetResult, Template } from "@/lib/nexus/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const MAX_MEDIA = 4;

export function Composer({ connections: initial }: { connections: Connection[] }) {
  const open = useComposer((s) => s.open);
  const prefill = useComposer((s) => s.prefill);
  const setOpen = useComposer((s) => s.setOpen);
  const [connections, setConnections] = useState(initial);
  useEffect(() => {
    setConnections(initial);
  }, [initial]);
  useEffect(() => {
    if (!open) return;
    void listConnections()
      .then(setConnections)
      .catch(() => {
        /* keep current */
      });
  }, [open]);
  const connectedPlatforms = useMemo(
    () => Array.from(new Set(connections.map((c) => c.platform))),
    [connections],
  );
  const [content, setContent] = useState("");
  const [selected, setSelected] = useState<PlatformId[]>([]);
  const [results, setResults] = useState<PublishTargetResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [firstComment, setFirstComment] = useState("");
  const [utm, setUtm] = useState("");
  const [draftId, setDraftId] = useState<string | undefined>();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelected((current) => {
      if (connectedPlatforms.length === 0) return [];
      const kept = current.filter((p) => connectedPlatforms.includes(p));
      return kept.length ? kept : connectedPlatforms;
    });
  }, [connectedPlatforms]);

  useEffect(() => {
    if (!open) return;
    setResults(null);
    setError(null);
    setIdempotencyKey(crypto.randomUUID());
    if (prefill) {
      setContent(prefill.content ?? "");
      setMediaUrls(prefill.mediaUrls ?? []);
      setFirstComment(prefill.firstComment ?? "");
      setUtm(prefill.utm ?? "");
      setDraftId(prefill.draftId);
      setScheduledAt(prefill.scheduledAt ? prefill.scheduledAt.slice(0, 16) : "");
      if (prefill.platforms?.length) setSelected(prefill.platforms);
    } else {
      setContent("");
      setMediaUrls([]);
      setFirstComment("");
      setUtm("");
      setDraftId(undefined);
      setScheduledAt("");
    }
    void listDrafts()
      .then(setDrafts)
      .catch(() => setDrafts([]));
    void listTemplates()
      .then(setTemplates)
      .catch(() => setTemplates([]));
  }, [open, prefill]);

  if (!open) return null;

  const minLimit = selected.length ? Math.min(...selected.map((p) => PLATFORM_META[p].charLimit)) : Infinity;
  const overLimit = selected.some((p) => content.length > PLATFORM_META[p].charLimit);
  const remaining = minLimit === Infinity ? null : minLimit - content.length;
  const progress = minLimit === Infinity ? 0 : Math.min(1, content.length / minLimit);

  const close = () => {
    setOpen(false);
    setResults(null);
    setError(null);
  };

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    const room = MAX_MEDIA - mediaUrls.length;
    const toRead = Array.from(files).slice(0, room);
    for (const file of toRead) {
      if (file.size > 900_000) {
        toast.error("Keep images under 900KB for this workspace.");
        continue;
      }
      const url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("read failed"));
        reader.readAsDataURL(file);
      });
      setMediaUrls((prev) => [...prev, url]);
    }
  };

  const payload = () => ({
    content: content.trim(),
    platforms: selected,
    mediaUrls,
    scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
    firstComment: firstComment.trim() || undefined,
    utm: utm.trim() || undefined,
  });

  const submit = async () => {
    setError(null);
    if (!content.trim()) return setError("Write something to post.");
    if (selected.length === 0) return setError("Select at least one network.");
    setSubmitting(true);
    try {
      const latest = await listConnections();
      setConnections(latest);
      const { results: r } = await publishPost({
        data: { ...payload(), idempotencyKey },
      });
      setResults(r);
      toast.success(scheduledAt ? "Queued on the calendar." : "Published.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to publish");
    } finally {
      setSubmitting(false);
    }
  };

  const queueApproval = async () => {
    setError(null);
    if (!content.trim()) return setError("Write something to post.");
    if (selected.length === 0) return setError("Select at least one network.");
    setSubmitting(true);
    try {
      await submitApproval({ data: payload() });
      toast.success("Sent to the approval queue.");
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit");
    } finally {
      setSubmitting(false);
    }
  };

  const persistDraft = async () => {
    try {
      const d = await saveDraft({
        data: {
          id: draftId,
          content,
          mediaUrls,
          platforms: selected,
          firstComment,
          utm,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        },
      });
      setDraftId(d.id);
      setDrafts(await listDrafts());
      toast.success("Draft saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save draft");
    }
  };

  const runAi = async (mode: "rewrite" | "shorten" | "expand" | "hashtags" | "thread") => {
    if (!content.trim()) return toast.error("Write a draft first.");
    setAiBusy(true);
    try {
      const res = await rewriteCopy({
        data: { content, mode, platform: selected[0] },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setContent(res.text);
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-bg/70 p-4 pt-12 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[24px] border border-border bg-surface p-6 shadow-[var(--shadow-soft)]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Compose</h2>
          <Button variant="ghost" size="icon" onClick={close} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {connectedPlatforms.length === 0 ? (
          <p className="rounded-[12px] border border-border bg-surface-2 px-4 py-3 text-sm text-muted">
            Connect at least one network in Connections before posting.
          </p>
        ) : results ? (
          <div className="space-y-3">
            {results.map((r) => (
              <div
                key={r.platform}
                className="flex items-center justify-between rounded-[12px] border border-border px-4 py-3 text-sm"
              >
                <span className="flex items-center gap-2.5 font-medium">
                  <PlatformGlyph platform={r.platform} className="h-6 w-6" />
                  {PLATFORM_META[r.platform].name}
                </span>
                {r.status === "success" ? (
                  <Badge tone="ok">Posted · {(r.latencyMs / 1000).toFixed(1)}s</Badge>
                ) : r.status === "pending" ? (
                  <Badge tone="warn">Scheduled</Badge>
                ) : (
                  <Badge tone="danger">{r.error || "Failed"}</Badge>
                )}
              </div>
            ))}
            <div className="flex justify-end pt-2">
              <Button onClick={close}>Done</Button>
            </div>
          </div>
        ) : (
          <>
            {templates.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {templates.slice(0, 6).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setContent(t.content)}
                    className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted hover:text-fg"
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            )}
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder="What's happening?"
              className="resize-none text-base"
              autoFocus
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(["rewrite", "shorten", "expand", "hashtags", "thread"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  disabled={aiBusy}
                  onClick={() => runAi(mode)}
                  className="inline-flex min-h-9 items-center gap-1 rounded-full border border-border px-2.5 text-[11px] font-medium capitalize text-muted hover:text-fg disabled:opacity-50"
                >
                  <Sparkles className="h-3 w-3" />
                  {mode}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {mediaUrls.map((url) => (
                <div key={url} className="relative h-16 w-16 overflow-hidden rounded-[8px] border border-border">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    aria-label="Remove image"
                    onClick={() => setMediaUrls((p) => p.filter((u) => u !== url))}
                    className="absolute right-0.5 top-0.5 rounded-full bg-bg/80 p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {mediaUrls.length < MAX_MEDIA && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  aria-label="Add photo"
                  className="flex h-16 w-16 items-center justify-center rounded-[8px] border border-dashed border-border-strong text-muted hover:bg-surface-2"
                >
                  <ImagePlus className="h-5 w-5" />
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
            </div>

            <p className="mb-2 mt-4 text-[11px] font-medium uppercase tracking-[0.16em] text-subtle">Post to</p>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_ORDER.filter((p) => connectedPlatforms.includes(p)).map((p) => {
                const active = selected.includes(p);
                const over = content.length > PLATFORM_META[p].charLimit;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSelected((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]))}
                    className={cn(
                      "flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-sm font-medium",
                      active
                        ? over
                          ? "border-danger/40 bg-danger/10 text-danger"
                          : "border-border-strong bg-surface-2 text-fg"
                        : "border-border text-subtle hover:text-fg",
                    )}
                  >
                    <PlatformIcon platform={p} className="h-3.5 w-3.5" />
                    {PLATFORM_META[p].name}
                    {active && (
                      <span className="text-xs tabular-nums opacity-70">{PLATFORM_META[p].charLimit - content.length}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="sched">Schedule (optional)</Label>
                <input
                  id="sched"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-[12px] border border-border bg-surface px-3.5 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="utm">UTM or tracking URL</Label>
                <Input id="utm" value={utm} onChange={(e) => setUtm(e.target.value)} placeholder="https://…?utm_source=nexus" />
              </div>
            </div>
            <div className="mt-3">
              <Label htmlFor="fc">First comment (optional)</Label>
              <Input id="fc" value={firstComment} onChange={(e) => setFirstComment(e.target.value)} placeholder="Pinned reply after publish" />
            </div>

            {drafts.length > 0 && (
              <div className="mt-3">
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-subtle">Drafts</p>
                <div className="flex flex-wrap gap-1.5">
                  {drafts.slice(0, 5).map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        setDraftId(d.id);
                        setContent(d.content);
                        setMediaUrls(d.mediaUrls);
                        setFirstComment(d.firstComment);
                        setUtm(d.utm);
                        setScheduledAt(d.scheduledAt ? d.scheduledAt.slice(0, 16) : "");
                        if (d.platforms.length) setSelected(d.platforms);
                      }}
                      className="max-w-[12rem] truncate rounded-full border border-border px-3 py-1 text-xs text-muted hover:text-fg"
                    >
                      {d.content || "Empty draft"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2.5">
                {minLimit !== Infinity && (
                  <svg viewBox="0 0 24 24" className="h-6 w-6 -rotate-90">
                    <circle cx="12" cy="12" r="9" fill="none" strokeWidth="2.5" className="stroke-border-strong" />
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      fill="none"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 9}
                      strokeDashoffset={2 * Math.PI * 9 * (1 - progress)}
                      className={overLimit ? "stroke-danger" : progress > 0.85 ? "stroke-warn" : "stroke-teal"}
                    />
                  </svg>
                )}
                <span className={cn("tabular-nums text-muted", overLimit && "font-semibold text-danger")}>
                  {remaining === null ? `${content.length} characters` : `${remaining} left`}
                </span>
              </span>
              {error && <span className="font-medium text-danger">{error}</span>}
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-border pt-4">
              <Button variant="ghost" onClick={persistDraft}>
                Save draft
              </Button>
              <Button variant="secondary" onClick={queueApproval} disabled={submitting || overLimit}>
                Send for approval
              </Button>
              <Button onClick={submit} disabled={submitting || overLimit}>
                {submitting
                  ? "Sending…"
                  : scheduledAt
                    ? "Schedule"
                    : `Post to ${selected.length} network${selected.length === 1 ? "" : "s"}`}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
