import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  deleteCannedReply,
  deleteMedia,
  deleteTemplate,
  listCannedReplies,
  listMedia,
  listTemplates,
  saveCannedReply,
  saveMedia,
  saveTemplate,
} from "@/lib/nexus/data";
import { useComposer } from "@/lib/nexus/store";
import type { CannedReply, MediaAsset, Template } from "@/lib/nexus/types";

export const Route = createFileRoute("/dashboard/library")({ component: LibraryPage });

function LibraryPage() {
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [canned, setCanned] = useState<CannedReply[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [cTitle, setCTitle] = useState("");
  const [cContent, setCContent] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const openWith = useComposer((s) => s.openWith);

  const load = async () => {
    try {
      const [t, c, m] = await Promise.all([listTemplates(), listCannedReplies(), listMedia()]);
      setTemplates(t);
      setCanned(c);
      setMedia(m);
    } catch {
      toast.error("Could not load library.");
      setTemplates([]);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (!templates) return <Skeleton className="h-64" />;

  const addTemplate = async (e: FormEvent) => {
    e.preventDefault();
    await saveTemplate({ data: { title, content } });
    setTitle("");
    setContent("");
    toast.success("Template saved.");
    await load();
  };

  const addCanned = async (e: FormEvent) => {
    e.preventDefault();
    await saveCannedReply({ data: { title: cTitle, content: cContent } });
    setCTitle("");
    setCContent("");
    toast.success("Saved reply added.");
    await load();
  };

  const onFile = async (files: FileList | null) => {
    if (!files?.[0]) return;
    const file = files[0];
    if (file.size > 900_000) return toast.error("Keep images under 900KB.");
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("read failed"));
      reader.readAsDataURL(file);
    });
    try {
      await saveMedia({ data: { name: file.name, mime: file.type, dataUrl } });
      toast.success("Asset stored.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
        <p className="mt-1 text-sm text-muted">Templates, saved replies, and reusable media.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">Templates</h2>
          <form onSubmit={addTemplate} className="mb-4 space-y-3">
            <div>
              <Label htmlFor="tt">Title</Label>
              <Input id="tt" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="tc">Copy</Label>
              <Textarea id="tc" rows={3} value={content} onChange={(e) => setContent(e.target.value)} required />
            </div>
            <Button type="submit" size="sm">
              Save template
            </Button>
          </form>
          <ul className="space-y-2">
            {templates.map((t) => (
              <li key={t.id} className="rounded-[12px] border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{t.title}</p>
                    <Badge className="mt-1">{t.category}</Badge>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{t.content}</p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <Button size="sm" variant="secondary" onClick={() => openWith({ content: t.content })}>
                      Use
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await deleteTemplate({ data: { id: t.id } });
                        await load();
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">Saved replies</h2>
          <form onSubmit={addCanned} className="mb-4 space-y-3">
            <div>
              <Label htmlFor="ct">Title</Label>
              <Input id="ct" value={cTitle} onChange={(e) => setCTitle(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="cc">Reply</Label>
              <Input id="cc" value={cContent} onChange={(e) => setCContent(e.target.value)} required />
            </div>
            <Button type="submit" size="sm">
              Save reply
            </Button>
          </form>
          <ul className="space-y-2">
            {canned.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 rounded-[12px] border border-border px-3 py-2.5">
                <span>
                  <span className="block text-sm font-medium">{c.title}</span>
                  <span className="text-xs text-muted">{c.content}</span>
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await deleteCannedReply({ data: { id: c.id } });
                    await load();
                  }}
                >
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Media</h2>
          <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
            Upload image
          </Button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files)} />
        </div>
        {media.length === 0 ? (
          <p className="text-sm text-muted">No assets yet. Uploads stay in this workspace.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {media.map((m) => (
              <figure key={m.id} className="overflow-hidden rounded-[12px] border border-border">
                <img src={m.dataUrl} alt={m.name} className="aspect-square w-full object-cover" />
                <figcaption className="flex items-center justify-between gap-1 px-2 py-1.5 text-[11px]">
                  <span className="truncate">{m.name}</span>
                  <button
                    type="button"
                    className="text-danger"
                    onClick={async () => {
                      await deleteMedia({ data: { id: m.id } });
                      await load();
                    }}
                  >
                    Delete
                  </button>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
