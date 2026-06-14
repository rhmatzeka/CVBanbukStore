"use client";

import AppNavbar from "@/components/AppNavbar";
import LoadingScreen from "@/components/LoadingScreen";
import ProductImage from "@/components/ProductImage";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  description: string;
  material: string;
  size: string;
  image?: string | null;
};

const MAX_COMPARE_ITEMS = 2;

function normalizeCompareIds(ids: string[]) {
  return Array.from(new Set(ids.filter((id) => id.length > 0))).slice(0, MAX_COMPARE_ITEMS);
}

function readCompareIds(key: string) {
  try {
    const storedCompare = localStorage.getItem(key);
    const parsed: unknown = storedCompare ? JSON.parse(storedCompare) : [];
    return Array.isArray(parsed) ? normalizeCompareIds(parsed.filter((id): id is string => typeof id === "string")) : [];
  } catch {
    return [];
  }
}

function writeCompareIds(key: string, ids: string[]) {
  localStorage.setItem(key, JSON.stringify(normalizeCompareIds(ids)));
}

const formatPrice = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;

export default function CompareProductsPage() {
  const { data: session, status } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");

  const compareKey = useMemo(() => {
    if (status === "loading") return null;
    const identifier = session?.user?.id || session?.user?.email || session?.user?.role || "guest";
    return `compare-products-${identifier}`;
  }, [session, status]);

  useEffect(() => {
    if (!compareKey) return;
    setCompareIds(readCompareIds(compareKey));

    const loadProducts = async () => {
      try {
        const res = await fetch("/api/products");
        const data = await res.json();
        const productList = Array.isArray(data) ? data : [];
        setProducts(productList);
        setCompareIds((currentIds) => {
          const validIds = currentIds.filter((id) => productList.some((product) => product.id === id));
          if (validIds.length !== currentIds.length) writeCompareIds(compareKey, validIds);
          return validIds;
        });
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [compareKey]);

  const selectedProducts = useMemo(
    () => compareIds.map((id) => products.find((product) => product.id === id)).filter((product): product is Product => Boolean(product)),
    [compareIds, products]
  );

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return products;

    return products.filter((product) =>
      [product.name, product.description, product.material, product.size]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [products, query]);

  const comparisonRows = useMemo(
    () => [
      ["Harga", selectedProducts.map((product) => formatPrice(product.price))],
      ["Stok", selectedProducts.map((product) => `${product.stock} unit`)],
      ["Bahan", selectedProducts.map((product) => product.material)],
      ["Ukuran", selectedProducts.map((product) => product.size)],
      ["Deskripsi", selectedProducts.map((product) => product.description)],
    ] as Array<[string, string[]]>,
    [selectedProducts]
  );

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2400);
  };

  const updateCompareIds = (next: string[], message: string) => {
    if (!compareKey) return;
    setCompareIds(next);
    writeCompareIds(compareKey, next);
    showNotice(message);
  };

  const toggleCompare = (product: Product) => {
    if (!compareKey) return;
    const currentIds = readCompareIds(compareKey);
    const selected = currentIds.includes(product.id);

    if (selected) {
      updateCompareIds(currentIds.filter((id) => id !== product.id), `${product.name} dihapus dari perbandingan.`);
      return;
    }

    if (currentIds.length >= MAX_COMPARE_ITEMS) {
      showNotice("Maksimal dua produk. Hapus salah satu dulu untuk mengganti pilihan.");
      return;
    }

    updateCompareIds([...currentIds, product.id], `${product.name} ditambahkan ke perbandingan.`);
  };

  const clearCompare = () => updateCompareIds([], "Pilihan perbandingan dikosongkan.");

  if (loading) {
    return <LoadingScreen label="Memuat perbandingan produk" detail="Data produk sedang disejajarkan untuk dibandingkan." />;
  }

  return (
    <main className="product-page customer-flow-page min-h-screen pb-14 text-white">
      <AppNavbar />

      {notice && (
        <div className="fixed bottom-6 left-1/2 z-[90] -translate-x-1/2 rounded-full border border-[rgba(0,212,164,0.28)] bg-[color:var(--brand-green)] px-5 py-3 text-sm font-semibold text-black shadow-[0_18px_50px_rgba(0,212,164,0.22)]">
          {notice}
        </div>
      )}

      <section className="content-wrap pb-4 pt-5">
        <div className="customer-flow-hero compare-hero !gap-5 !p-5">
          <div className="min-w-0">
            <p className="section-kicker">Bandingkan produk</p>
            <h1 className="mt-2 max-w-3xl text-[28px] font-semibold leading-[1.05] text-white md:text-[36px]">
              Perbandingan produk
            </h1>
            <p className="mt-2 max-w-2xl text-[14px] leading-6 text-white/58">
              Bandingkan harga, bahan, ukuran, stok, dan deskripsi produk CV Banbuk dalam satu tampilan ringkas.
            </p>
          </div>

          <div className="customer-flow-summary">
            <div>
              <p className="customer-flow-summary-label">Pilihan aktif</p>
              <p className="customer-flow-summary-value !text-[28px]">
                {selectedProducts.length}<span>/{MAX_COMPARE_ITEMS}</span>
              </p>
            </div>
            <div className="customer-flow-summary-actions">
              <button type="button" onClick={clearCompare} disabled={selectedProducts.length === 0} className="product-action product-action-secondary disabled:cursor-not-allowed disabled:opacity-40">
                Reset
              </button>
              <Link href="/products" className="product-action product-action-primary">
                Katalog
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="content-wrap pb-4">
        <div className="grid gap-3 lg:grid-cols-2">
          {[0, 1].map((slot) => {
            const product = selectedProducts[slot];

            return (
              <article
                key={slot}
                className={`grid h-[126px] grid-cols-[96px_minmax(0,1fr)] overflow-hidden rounded-[10px] border bg-[rgba(8,12,11,0.72)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] sm:grid-cols-[112px_minmax(0,1fr)] ${
                  product ? "border-[rgba(0,212,164,0.38)] bg-[rgba(8,16,13,0.82)]" : "border-white/[0.09]"
                }`}
              >
                <div className="flex h-[126px] min-w-0 items-center justify-center overflow-hidden bg-white/[0.035]">
                  {product ? (
                    <ProductImage src={product.image} alt={product.name} className="block !h-full !w-full !object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[12px] font-semibold text-white/34">
                      Slot {slot + 1}
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-col justify-center p-3.5 md:p-4">
                  {product ? (
                    <>
                      <p className="text-[11px] font-semibold uppercase text-white/38">Produk {slot + 1}</p>
                      <h2 className="mt-1 truncate text-[17px] font-semibold leading-tight text-white">{product.name}</h2>
                      <p className="mt-1 text-[14px] font-semibold text-[color:var(--brand-green)]">{formatPrice(product.price)}</p>
                      <button type="button" onClick={() => toggleCompare(product)} className="product-action product-action-secondary mt-2 w-fit">
                        Hapus
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-[11px] font-semibold uppercase text-white/38">Produk {slot + 1}</p>
                      <h2 className="mt-1 text-[17px] font-semibold leading-tight text-white/78">Belum dipilih</h2>
                      <p className="mt-1 text-[13px] leading-5 text-white/48">Pilih dari daftar produk di bawah.</p>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {selectedProducts.length === MAX_COMPARE_ITEMS && (
        <section className="content-wrap pb-5">
          <div className="overflow-hidden rounded-[10px] border border-white/[0.09] bg-[rgba(8,12,11,0.74)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
            <div className="flex flex-col gap-3 border-b border-white/[0.08] px-4 py-4 sm:flex-row sm:items-end sm:justify-between md:px-5">
              <div>
                <p className="section-kicker">Rincian</p>
                <h2 className="mt-1 text-[18px] font-semibold leading-tight text-white md:text-[20px]">Detail perbandingan</h2>
              </div>
              <span className="w-fit rounded-full border border-[rgba(0,212,164,0.26)] bg-[rgba(0,212,164,0.08)] px-3 py-1 text-[12px] font-semibold text-[color:var(--brand-green)]">
                Siap dibandingkan
              </span>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[680px] divide-y divide-white/[0.07] md:min-w-0">
                <div className="grid grid-cols-[132px_repeat(2,minmax(0,1fr))] bg-white/[0.035] text-[12px] font-semibold uppercase text-white/54 md:grid-cols-[156px_repeat(2,minmax(0,1fr))]">
                  <div className="px-4 py-3 md:px-5">Kriteria</div>
                  {[0, 1].map((slot) => (
                    <div key={slot} className="min-w-0 border-l border-white/[0.07] px-4 py-3 md:px-5">
                      <span className="block truncate text-white/82">{selectedProducts[slot]?.name ?? `Produk ${slot + 1}`}</span>
                    </div>
                  ))}
                </div>
                {comparisonRows.map(([label, values]) => (
                  <div key={label} className="grid grid-cols-[132px_repeat(2,minmax(0,1fr))] text-[13px] md:grid-cols-[156px_repeat(2,minmax(0,1fr))]">
                    <div className="bg-white/[0.018] px-4 py-3 font-semibold text-white/62 md:px-5">{label}</div>
                    {[0, 1].map((slot) => (
                      <div
                        key={`${label}-${slot}`}
                        className={`border-l border-white/[0.07] px-4 py-3 leading-5 md:px-5 ${values[slot] ? "text-white/78" : "text-white/34"}`}
                      >
                        {values[slot] ?? "Belum dipilih"}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="content-wrap pb-10">
        <div className="product-toolbar grid gap-3 p-2.5 md:grid-cols-[minmax(0,1fr)_150px] md:items-center">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="product-input"
            placeholder="Cari produk untuk dibandingkan"
          />
          <p className="px-2 text-right text-[13px] text-white/46">{visibleProducts.length} produk</p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleProducts.map((product) => {
            const selected = compareIds.includes(product.id);
            const locked = !selected && compareIds.length >= MAX_COMPARE_ITEMS;

            return (
              <article
                key={product.id}
                className={`grid min-h-[248px] overflow-hidden rounded-[10px] border bg-[rgba(8,12,11,0.72)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] ${
                  selected ? "border-[rgba(0,212,164,0.38)] bg-[rgba(8,16,13,0.82)]" : "border-white/[0.09]"
                }`}
              >
                <div className="h-[132px] min-w-0 overflow-hidden bg-white/[0.035]">
                  <ProductImage src={product.image} alt={product.name} className="block !h-full !w-full !object-cover" />
                </div>
                <div className="flex min-w-0 flex-col p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-[14px] font-semibold leading-snug text-white">{product.name}</h3>
                      <p className="mt-1 text-[13px] font-semibold text-[color:var(--brand-green)]">{formatPrice(product.price)}</p>
                    </div>
                    <span className="rounded-md bg-white/[0.06] px-2 py-1 text-[11px] text-white/56">{product.stock}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 min-h-[40px] text-[12px] leading-5 text-white/52">{product.description}</p>
                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-2.5">
                    <button
                      type="button"
                      onClick={() => toggleCompare(product)}
                      disabled={locked}
                      aria-pressed={selected}
                      className={`product-action ${selected ? "product-action-primary" : "product-action-secondary"} disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      {selected ? "Terpilih" : locked ? "Penuh" : "Pilih"}
                    </button>
                    <Link href={`/products/${product.id}`} className="product-action product-action-secondary">
                      Detail
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {visibleProducts.length === 0 && (
          <div className="product-card mt-4 p-8 text-center">
            <h3 className="text-[22px] font-semibold text-white">Produk tidak ditemukan</h3>
            <p className="mt-2 text-[14px] text-white/56">Coba kata kunci lain untuk memilih produk yang ingin dibandingkan.</p>
          </div>
        )}
      </section>
    </main>
  );
}
