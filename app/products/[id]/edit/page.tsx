"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import AppNavbar from "@/components/AppNavbar";
import ProductImage from "@/components/ProductImage";
import LoadingScreen from "@/components/LoadingScreen";

type ProductFormState = {
  name: string;
  price: string;
  stock: string;
  description: string;
  material: string;
  size: string;
  image: string;
};

const initialFormState: ProductFormState = {
  name: "",
  price: "",
  stock: "",
  description: "",
  material: "",
  size: "",
  image: "",
};

export default function EditProductPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<ProductFormState>(initialFormState);
  const productTitle = formData.name.trim() || "Produk tanpa nama";
  const hasImage = Boolean(formData.image);

  useEffect(() => {
    if (!params?.id) return;

    const fetchProduct = async () => {
      try {
        const res = await fetch(`/api/products/${params.id}`);
        const data = await res.json();

        if (!res.ok) {
          alert(data.error || "Produk tidak ditemukan");
          router.push("/products");
          return;
        }

        setFormData({
          name: data.name ?? "",
          price: String(data.price ?? ""),
          stock: String(data.stock ?? ""),
          description: data.description ?? "",
          material: data.material ?? "",
          size: data.size ?? "",
          image: data.image ?? "",
        });
      } catch (error) {
        alert("Gagal memuat data produk");
        router.push("/products");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [params?.id, router]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        image: String(reader.result || ""),
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/products/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Gagal memperbarui produk");
        return;
      }

      alert("Produk berhasil diperbarui.");
      router.push("/products");
      router.refresh();
    } catch (error) {
      alert("Terjadi kesalahan saat menyimpan perubahan");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <LoadingScreen
        label="Menyiapkan editor produk"
        detail="Data produk sedang dimuat agar perubahan bisa dilakukan dengan aman."
      />
    );
  }

  if (session?.user.role !== "ADMIN") {
    return (
      <div className="dashboard-page flex min-h-screen items-center justify-center px-4">
        <div className="customer-account-panel px-8 py-6 text-sm text-slate-300">
          Unauthorized - Hanya admin yang bisa akses halaman ini
        </div>
      </div>
    );
  }

  return (
    <main className="dashboard-page customer-account-page pb-16">
      <AppNavbar />

      <div className="content-wrap py-8">
        <div className="mx-auto max-w-5xl">
          <div className="customer-account-panel px-5 py-5 sm:px-7 sm:py-6 lg:px-8">
            <div className="flex flex-col gap-4 border-b border-white/6 pb-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <span className="section-kicker">Admin tools</span>
                <h1 className="section-title">Edit produk</h1>
                <p className="section-subtitle">
                  Perbarui detail produk, gambar, dan spesifikasi utama dengan layout yang lebih fokus dan lebih nyaman dipakai.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:w-fit">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2.5">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Status</p>
                  <p className="mt-1.5 text-sm font-semibold text-slate-200">Draft update</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2.5">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Produk</p>
                  <p className="mt-1.5 text-sm font-semibold text-slate-200 line-clamp-1">{productTitle}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-5">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_320px]">
                <div className="space-y-5">
                <div className="rounded-[26px] border border-white/6 bg-[#141416]/45 p-5 sm:p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Informasi produk
                  </p>

                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-200">
                        Nama Produk *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="app-input"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-200">
                          Harga (Rp) *
                        </label>
                        <input
                          type="number"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          className="app-input"
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-200">
                          Stok *
                        </label>
                        <input
                          type="number"
                          value={formData.stock}
                          onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                          className="app-input"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-200">
                          Bahan *
                        </label>
                        <input
                          type="text"
                          value={formData.material}
                          onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                          className="app-input"
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-200">
                          Ukuran *
                        </label>
                        <input
                          type="text"
                          value={formData.size}
                          onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                          className="app-input"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-200">
                        Deskripsi *
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="app-input min-h-[96px]"
                        rows={3}
                        required
                      />
                    </div>

                    <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                        Ringkasan cepat
                      </p>

                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-2xl border border-white/8 bg-[#141416]/55 px-3 py-3">
                          <p className="uppercase tracking-[0.2em] text-slate-500">Harga</p>
                          <p className="mt-1.5 text-sm font-semibold text-[color:var(--primary)]">
                            {formData.price ? `Rp ${Number(formData.price).toLocaleString()}` : "-"}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-[#141416]/55 px-3 py-3">
                          <p className="uppercase tracking-[0.2em] text-slate-500">Stok</p>
                          <p className="mt-1.5 text-sm font-semibold text-slate-200">
                            {formData.stock || "-"}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-[#141416]/55 px-3 py-3">
                          <p className="uppercase tracking-[0.2em] text-slate-500">Bahan</p>
                          <p className="mt-1.5 text-sm font-semibold text-slate-200 line-clamp-1">
                            {formData.material || "-"}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-[#141416]/55 px-3 py-3">
                          <p className="uppercase tracking-[0.2em] text-slate-500">Ukuran</p>
                          <p className="mt-1.5 text-sm font-semibold text-slate-200 line-clamp-1">
                            {formData.size || "-"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                            Action
                          </p>
                          <p className="mt-1 text-sm text-slate-400">
                            Simpan perubahan jika data sudah final, atau kembali ke katalog untuk meninjau produk lain.
                          </p>
                        </div>

                        <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[320px] sm:flex-row">
                          <button
                            type="submit"
                            disabled={saving}
                            className="app-button-primary flex-1"
                          >
                            {saving ? "Menyimpan..." : "Simpan Perubahan"}
                          </button>
                          <button
                            type="button"
                            onClick={() => router.push("/products")}
                            className="app-button-secondary flex-1"
                          >
                            Kembali
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                </div>

                <aside className="space-y-4 lg:self-start">
                  <div className="rounded-[28px] border border-white/8 bg-[#141416]/55 p-4">
                    <div className="overflow-hidden rounded-[22px] border border-white/8 bg-slate-950/70">
                      <div className="h-44">
                        <ProductImage
                          src={formData.image}
                          alt={formData.name || "Preview produk"}
                        />
                      </div>
                    </div>

                    <div className="mt-3 space-y-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                          Preview
                        </p>
                        <h2 className="mt-1.5 text-base font-semibold text-slate-100 line-clamp-2">
                          {productTitle}
                        </h2>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
                          <p className="uppercase tracking-[0.2em] text-slate-500">Harga</p>
                          <p className="mt-1.5 text-sm font-semibold text-[color:var(--primary)]">
                            {formData.price ? `Rp ${Number(formData.price).toLocaleString()}` : "-"}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
                          <p className="uppercase tracking-[0.2em] text-slate-500">Stok</p>
                          <p className="mt-1.5 text-sm font-semibold text-slate-200">
                            {formData.stock || "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/8 bg-[#141416]/55 p-4">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                      Media
                    </p>
                    <div className="mt-3 space-y-3">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="app-input file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
                      />
                      <input
                        type="text"
                        value={formData.image}
                        onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                        className="app-input"
                        placeholder="Atau tempel URL gambar"
                      />
                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                          Catatan singkat
                        </p>
                        <ul className="mt-2 space-y-1.5 text-sm leading-6 text-slate-400">
                          <li>Nama singkat lebih rapi di katalog.</li>
                          <li>Foto vertikal biasanya paling konsisten.</li>
                          <li>{hasImage ? "Preview gambar aktif." : "Belum ada gambar aktif."}</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </aside>
              </div>

            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
