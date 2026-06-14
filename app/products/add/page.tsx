"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AppNavbar from "@/components/AppNavbar";
import ProductImage from "@/components/ProductImage";

export default function AddProductPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    stock: "",
    description: "",
    material: "",
    size: "",
    image: "",
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert("Produk berhasil ditambahkan!");
        router.push("/products");
      } else {
        const data = await res.json();
        alert(data.error || "Gagal menambahkan produk");
      }
    } catch (error) {
      alert("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  if (session?.user.role !== "ADMIN") {
    return (
      <div className="dashboard-page flex min-h-screen items-center justify-center">
        <div className="customer-account-panel px-8 py-6 text-sm text-slate-300">
          Unauthorized - Hanya admin yang bisa akses halaman ini
        </div>
      </div>
    );
  }

  return (
    <main className="dashboard-page customer-account-page pb-16">
      <AppNavbar />

      <section className="content-wrap pt-10 pb-4">
        <div>
          <span className="section-kicker">Admin tools</span>
          <h1 className="mt-2 text-[30px] font-semibold leading-[1.04] text-white md:text-[38px]">
            Tambah produk baru
          </h1>
          <p className="mt-2 max-w-xl text-[14px] leading-6 text-white/62">
            Tambahkan foto, harga, stok, dan spesifikasi dalam form yang ringkas.
          </p>
        </div>
      </section>

      <div className="content-wrap py-8">
        <div className="mx-auto max-w-3xl customer-account-panel p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-[14px] font-semibold leading-[1.29] tracking-[-0.224px] text-white">
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-[14px] font-semibold leading-[1.29] tracking-[-0.224px] text-white">
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
                <label className="mb-2 block text-[14px] font-semibold leading-[1.29] tracking-[-0.224px] text-white">
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

            <div>
              <label className="mb-2 block text-[14px] font-semibold leading-[1.29] tracking-[-0.224px] text-white">
                Deskripsi *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="app-input min-h-[120px]"
                rows={3}
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-[14px] font-semibold leading-[1.29] tracking-[-0.224px] text-white">
                Bahan *
              </label>
              <input
                type="text"
                value={formData.material}
                onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                className="app-input"
                placeholder="Contoh: Kulit Asli"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-[14px] font-semibold leading-[1.29] tracking-[-0.224px] text-white">
                Ukuran *
              </label>
              <input
                type="text"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                className="app-input"
                placeholder="Contoh: 30x25x10 cm"
                required
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
              <div>
                <label className="mb-2 block text-[14px] font-semibold leading-[1.29] tracking-[-0.224px] text-white">
                  Upload Foto Produk
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="app-input file:mr-4 file:rounded-full file:border-0 file:bg-[color:var(--primary)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#06100d] cursor-pointer"
                />
                <p className="mt-2 text-[12px] leading-normal tracking-[-0.12px] text-white/48">
                  Bisa upload dari device atau isi manual dengan URL jika diperlukan.
                </p>

                <input
                  type="text"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="app-input mt-3"
                  placeholder="Atau tempel URL gambar"
                />
              </div>

              <div>
                <p className="mb-2 text-[14px] font-semibold leading-[1.29] tracking-[-0.224px] text-white">Preview</p>
                <div className="overflow-hidden rounded-lg bg-white/5 border border-white/10 p-4">
                  <div className="aspect-square">
                    <ProductImage src={formData.image} alt={formData.name || "Preview produk"} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="app-button-primary flex-1"
              >
                {loading ? "Menyimpan..." : "Tambah Produk"}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="app-button-secondary flex-1"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
