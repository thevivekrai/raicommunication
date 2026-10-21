"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, FetchError } from "@/lib/client";
import { Field, Skeleton } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { ImageIcon, PlusIcon, TrashIcon, XIcon } from "@/components/Icons";
import type { PublicProduct } from "@/lib/products";

const SPEC_SUGGESTIONS = ["Display", "Camera", "Battery", "Chipset", "OS", "Network"];

export function ProductForm({ productId }: { productId?: string }) {
  const router = useRouter();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(!!productId);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [price, setPrice] = useState("");
  const [ramStorage, setRamStorage] = useState("");
  const [color, setColor] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [demoAvailable, setDemoAvailable] = useState(true);
  const [images, setImages] = useState<string[]>([]);
  const [specs, setSpecs] = useState<{ k: string; v: string }[]>([{ k: "Display", v: "" }, { k: "Camera", v: "" }, { k: "Battery", v: "" }]);

  useEffect(() => {
    if (!productId) return;
    api<{ product: PublicProduct }>(`/api/admin/products/${productId}`)
      .then(({ product: p }) => {
        setBrand(p.brand); setModel(p.model); setPrice(String(p.price)); setRamStorage(p.ramStorage); setColor(p.color);
        setShortDescription(p.shortDescription ?? ""); setDemoAvailable(p.demoAvailable); setImages(p.images);
        const entries = Object.entries(p.specs).map(([k, v]) => ({ k, v }));
        setSpecs(entries.length ? entries : [{ k: "", v: "" }]);
      })
      .catch((e) => toast.error((e as Error).message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, 8 - images.length)) {
        const fd = new FormData();
        fd.set("file", file);
        const r = await api<{ url: string }>("/api/admin/uploads", { method: "POST", body: fd });
        setImages((s) => [...s, r.url]);
      }
    } catch (e) { toast.error((e as Error).message); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!brand.trim()) errs.brand = "Required";
    if (!model.trim()) errs.model = "Required";
    if (!price || Number(price) < 1) errs.price = "Enter a price";
    if (!ramStorage.trim()) errs.ramStorage = "Required";
    if (!color.trim()) errs.color = "Required";
    setErrors(errs);
    if (Object.keys(errs).length) return toast.error("Please fix the highlighted fields");

    const payload = {
      brand: brand.trim(), model: model.trim(), price: Number(price), ramStorage: ramStorage.trim(), color: color.trim(),
      shortDescription: shortDescription.trim() || null, demoAvailable, images,
      specs: Object.fromEntries(specs.filter((s) => s.k.trim() && s.v.trim()).map((s) => [s.k.trim(), s.v.trim()])),
    };
    setSaving(true);
    try {
      await api(productId ? `/api/admin/products/${productId}` : "/api/admin/products", { method: productId ? "PATCH" : "POST", json: payload });
      toast.success(productId ? "Product updated" : "Product added — it's live on the website");
      router.push("/admin/products");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof FetchError ? e.message : "Couldn't save the product");
      setSaving(false);
    }
  }

  if (loading) return <div className="card space-y-3 p-5"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-40" /></div>;

  return (
    <form onSubmit={save} className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <section className="card grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Brand" error={errors.brand}><input className="input" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Samsung" /></Field>
          <Field label="Model" error={errors.model}><input className="input" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Galaxy M35 5G" /></Field>
          <Field label="Price (₹)" error={errors.price}><input className="input" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} placeholder="19999" /></Field>
          <Field label="RAM / storage" error={errors.ramStorage}><input className="input" value={ramStorage} onChange={(e) => setRamStorage(e.target.value)} placeholder="8GB / 128GB" /></Field>
          <Field label="Color" error={errors.color}><input className="input" value={color} onChange={(e) => setColor(e.target.value)} placeholder="Moonlight Blue" /></Field>
          <label className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-2.5 sm:mt-5">
            <span><span className="block text-sm font-semibold">Free demo available</span><span className="text-xs text-slate-500">Customers can book a home demo</span></span>
            <button type="button" role="switch" aria-checked={demoAvailable} onClick={() => setDemoAvailable(!demoAvailable)} className={`relative h-6 w-11 shrink-0 rounded-full transition ${demoAvailable ? "bg-emerald-500" : "bg-slate-300"}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${demoAvailable ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </label>
          <div className="sm:col-span-2"><Field label="Short description"><textarea className="input" rows={2} maxLength={240} value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} placeholder="One line that sells the phone" /></Field></div>
        </section>

        <section className="card space-y-3 p-5">
          <div className="flex items-center justify-between"><h2 className="font-bold">Specs</h2><button type="button" className="btn-secondary btn-sm" onClick={() => setSpecs([...specs, { k: "", v: "" }])}><PlusIcon width={14} height={14} /> Add spec</button></div>
          {specs.map((s, i) => (
            <div key={i} className="flex gap-2">
              <input className="input w-2/5" list="spec-keys" value={s.k} onChange={(e) => setSpecs(specs.map((x, j) => (j === i ? { ...x, k: e.target.value } : x)))} placeholder="Name" aria-label="Spec name" />
              <input className="input flex-1" value={s.v} onChange={(e) => setSpecs(specs.map((x, j) => (j === i ? { ...x, v: e.target.value } : x)))} placeholder="Value" aria-label="Spec value" />
              <button type="button" className="btn-ghost px-2 text-slate-400" onClick={() => setSpecs(specs.filter((_, j) => j !== i))} aria-label="Remove spec"><TrashIcon width={16} height={16} /></button>
            </div>
          ))}
          <datalist id="spec-keys">{SPEC_SUGGESTIONS.map((k) => <option key={k} value={k} />)}</datalist>
        </section>
      </div>

      <div className="space-y-5">
        <section className="card space-y-3 p-5">
          <h2 className="font-bold">Images</h2>
          <div className="grid grid-cols-3 gap-2">
            {images.map((src, i) => (
              <div key={src} className="relative aspect-square overflow-hidden rounded-xl bg-slate-100">
                <img src={src} alt="" className="h-full w-full object-cover" />
                {i === 0 && <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-[10px] font-bold text-white">Cover</span>}
                <button type="button" onClick={() => setImages(images.filter((x) => x !== src))} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white" aria-label="Remove image"><XIcon width={14} height={14} /></button>
              </div>
            ))}
            {images.length < 8 && (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="grid aspect-square place-items-center rounded-xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-brand-500 hover:text-brand-600">
                <span className="flex flex-col items-center text-xs font-semibold"><ImageIcon />{uploading ? "Uploading…" : "Upload"}</span>
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => upload(e.target.files)} />
          <p className="text-xs text-slate-500">JPG, PNG or WebP · up to 5 MB each · first image is the cover.</p>
        </section>

        <div className="flex gap-2">
          <button className="btn-primary flex-1 py-3" disabled={saving || uploading}>{saving ? "Saving…" : productId ? "Save changes" : "Add product"}</button>
          <button type="button" className="btn-secondary py-3" onClick={() => router.back()}>Cancel</button>
        </div>
      </div>
    </form>
  );
}
