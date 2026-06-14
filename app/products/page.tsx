"use client";

import AppNavbar from "@/components/AppNavbar";
import BrandLogo from "@/components/BrandLogo";
import LoadingScreen from "@/components/LoadingScreen";
import ProductImage from "@/components/ProductImage";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

type CartItem = Product & { quantity: number };

const CART_KEY = "banbuk-cart";
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

function addCartItem(product: Product) {
  const current = JSON.parse(localStorage.getItem(CART_KEY) || "[]") as CartItem[];
  const existing = current.find((item) => item.id === product.id);
  const next = existing
    ? current.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item))
    : [...current, { ...product, quantity: 1 }];
  localStorage.setItem(CART_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("banbuk-cart-updated"));
  window.dispatchEvent(new Event("banbuk-cart-open"));
}

const formatPrice = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;

export default function ProductsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [material, setMaterial] = useState("all");
  const [sort, setSort] = useState("featured");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [wishlistBusyId, setWishlistBusyId] = useState<string | null>(null);
  const role = session?.user.role;
  const canUseCustomerShopping = status === "unauthenticated" || role === "CUSTOMER";

  const compareKey = useMemo(() => {
    if (status === "loading") return null;
    const identifier = session?.user?.id || session?.user?.email || session?.user?.role || "guest";
    return `compare-products-${identifier}`;
  }, [session, status]);

  useEffect(() => {
    if (!compareKey) return;
    setCompareIds(readCompareIds(compareKey));

    const load = async () => {
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
    load();
  }, [compareKey]);

  useEffect(() => {
    if (status !== "authenticated" || role !== "CUSTOMER") {
      setWishlistIds([]);
      return;
    }

    const loadWishlist = async () => {
      try {
        const res = await fetch("/api/wishlist");
        if (!res.ok) return;
        const data = await res.json();
        setWishlistIds(
          Array.isArray(data)
            ? data
                .map((item) => item.productId ?? item.product?.id)
                .filter((id): id is string => typeof id === "string")
            : []
        );
      } catch {
        setWishlistIds([]);
      }
    };

    loadWishlist();
  }, [role, session?.user?.id, status]);

  const materials = useMemo(
    () => Array.from(new Set(products.map((product) => product.material).filter(Boolean))),
    [products]
  );

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = products.filter((product) => {
      const matchesQuery = [product.name, product.description, product.material, product.size]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
      const matchesMaterial = material === "all" || product.material === material;
      return matchesQuery && matchesMaterial;
    });

    return [...filtered].sort((a, b) => {
      if (sort === "price-low") return a.price - b.price;
      if (sort === "price-high") return b.price - a.price;
      if (sort === "stock") return b.stock - a.stock;
      return products.findIndex((product) => product.id === a.id) - products.findIndex((product) => product.id === b.id);
    });
  }, [material, products, query, sort]);

  const handleAddCart = (product: Product) => {
    if (!canUseCustomerShopping) {
      showNotice("Checkout hanya tersedia untuk akun customer.");
      return;
    }

    addCartItem(product);
    showNotice(`${product.name} masuk ke cart.`);
  };

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  };

  const commitCompareIds = (next: string[], message: string) => {
    if (!compareKey) return;
    setCompareIds(next);
    writeCompareIds(compareKey, next);
    showNotice(message);
  };

  const handleToggleCompare = (product: Product) => {
    if (!compareKey) return;
    const currentIds = readCompareIds(compareKey);
    const selected = currentIds.includes(product.id);

    if (selected) {
      const next = currentIds.filter((id) => id !== product.id);
      commitCompareIds(next, `${product.name} dihapus dari perbandingan.`);
      return;
    }

    if (currentIds.length >= MAX_COMPARE_ITEMS) {
      showNotice("Maksimal dua produk. Buka halaman bandingkan untuk mengganti pilihan.");
      return;
    }

    const next = [...currentIds, product.id];
    commitCompareIds(next, `${product.name} siap dibandingkan.`);
  };

  const handleToggleWishlist = async (product: Product) => {
    if (!session) {
      showNotice("Masuk dulu untuk menyimpan wishlist.");
      window.setTimeout(() => router.push("/login"), 700);
      return;
    }

    if (role !== "CUSTOMER") {
      showNotice("Wishlist hanya tersedia untuk akun customer.");
      return;
    }

    const selected = wishlistIds.includes(product.id);
    setWishlistBusyId(product.id);

    try {
      const res = await fetch(selected ? `/api/wishlist?productId=${product.id}` : "/api/wishlist", {
        method: selected ? "DELETE" : "POST",
        headers: selected ? undefined : { "Content-Type": "application/json" },
        body: selected ? undefined : JSON.stringify({ productId: product.id }),
      });

      if (!res.ok) throw new Error("Wishlist request failed");

      setWishlistIds((currentIds) =>
        selected
          ? currentIds.filter((id) => id !== product.id)
          : currentIds.includes(product.id)
            ? currentIds
            : [...currentIds, product.id]
      );
      showNotice(selected ? `${product.name} dihapus dari wishlist.` : `${product.name} masuk wishlist.`);
    } catch {
      showNotice("Wishlist gagal diperbarui. Coba lagi sebentar.");
    } finally {
      setWishlistBusyId(null);
    }
  };

  if (loading) {
    return <LoadingScreen label="Memuat katalog" detail="Produk sedang disiapkan." />;
  }

  return (
    <main className="product-page min-h-screen text-white">
      <AppNavbar />

      {notice && (
        <div className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-full border border-[rgba(0,212,164,0.3)] bg-[color:var(--brand-green)] px-5 py-3 text-sm font-medium text-black shadow-[0_8px_24px_rgba(0,212,164,0.18)]">
          {notice}
        </div>
      )}

      <section className="content-wrap pb-6 pt-8">
        <div className="product-toolbar grid gap-3 p-3 md:grid-cols-[minmax(0,1fr)_200px_170px_150px]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="product-input"
            placeholder="Cari produk, bahan, atau ukuran"
          />
          <select value={material} onChange={(event) => setMaterial(event.target.value)} className="product-input">
            <option value="all">Semua bahan</option>
            {materials.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select value={sort} onChange={(event) => setSort(event.target.value)} className="product-input">
            <option value="featured">Urutan katalog</option>
            <option value="price-low">Harga rendah</option>
            <option value="price-high">Harga tinggi</option>
            <option value="stock">Stok terbanyak</option>
          </select>
          <Link href="/products/compare" className="product-action product-action-primary min-h-[42px] w-full">
            Bandingkan {compareIds.length}/{MAX_COMPARE_ITEMS}
          </Link>
        </div>
      </section>

      <section className="content-wrap pb-20">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="section-kicker">Katalog</p>
            <h1 className="mt-2 text-[32px] font-semibold leading-tight md:text-[40px]">Produk tersedia</h1>
          </div>
          <p className="text-[14px] text-white/48">{visibleProducts.length} dari {products.length} produk</p>
        </div>

        {visibleProducts.length > 0 ? (
          <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-4">
            {visibleProducts.map((product, index) => (
              <article key={product.id} className="product-card grid min-h-[438px] grid-rows-[168px_1fr] overflow-hidden transition-colors hover:border-white/14">
                <Link href={`/products/${product.id}`} className="product-media relative overflow-hidden border-b border-white/8">
                  <span className="absolute left-3 top-3 z-10 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-white/70">
                    {product.stock <= 5 ? "Stok terbatas" : index < 3 ? "Unggulan" : "Ready"}
                  </span>
                  <ProductImage
                    src={product.image}
                    alt={product.name}
                    variant={index % 3 === 2 ? "box" : "jar"}
                    className="max-h-[132px]"
                  />
                </Link>
                <div className="flex min-w-0 flex-col p-4">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <Link href={`/products/${product.id}`} className="min-w-0">
                      <h2 className="line-clamp-2 min-h-[48px] text-[20px] font-semibold leading-tight text-white">{product.name}</h2>
                    </Link>
                    <span className="shrink-0 rounded-md bg-white/[0.06] px-2 py-1 text-[11px] text-white/58">{product.stock}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 min-h-[42px] text-[13px] leading-5 text-white/58">{product.description}</p>
                  <div className="mt-3 grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2 text-[12px] text-white/52">
                    <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
                      <p className="text-white/36">Bahan</p>
                      <p className="mt-1 line-clamp-2 break-words font-semibold leading-snug text-white/82">{product.material}</p>
                    </div>
                    <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
                      <p className="text-white/36">Ukuran</p>
                      <p className="mt-1 line-clamp-2 break-words font-semibold leading-snug text-white/82">{product.size}</p>
                    </div>
                  </div>
                  <div className="mt-auto min-w-0 pt-4">
                    <p className="text-[18px] font-semibold text-[color:var(--brand-green)]">{formatPrice(product.price)}</p>
                    <div className={`mt-3 grid w-full gap-2 ${canUseCustomerShopping ? "grid-cols-3" : "grid-cols-1"}`}>
                      {canUseCustomerShopping && (
                        <button
                          type="button"
                          onClick={() => handleToggleWishlist(product)}
                          disabled={wishlistBusyId === product.id}
                          aria-pressed={wishlistIds.includes(product.id)}
                          className={`product-action min-w-0 px-2.5 text-[12px] ${wishlistIds.includes(product.id) ? "product-action-primary" : "product-action-secondary"} disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          {wishlistBusyId === product.id ? "..." : wishlistIds.includes(product.id) ? "Tersimpan" : "Wishlist"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleToggleCompare(product)}
                        aria-pressed={compareIds.includes(product.id)}
                        className={`product-action min-w-0 px-2.5 text-[12px] ${compareIds.includes(product.id) ? "product-action-primary" : "product-action-secondary"}`}
                      >
                        Bandingkan
                      </button>
                      {canUseCustomerShopping && (
                        <button onClick={() => handleAddCart(product)} className="product-action product-action-primary min-w-0 px-2.5 text-[12px]">
                          Keranjang
                        </button>
                      )}
                    </div>
                    {!canUseCustomerShopping && (
                      <p className="mt-3 text-[12px] leading-5 text-white/44">
                        Role operasional bisa melihat katalog tanpa akses checkout.
                      </p>
                    )}
                  </div>
                  {session?.user.role === "ADMIN" && (
                    <Link href={`/products/${product.id}/edit`} className="mt-4 text-[13px] font-medium text-white/56 underline underline-offset-4">
                      Edit produk
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="product-card p-10 text-center">
            <h3 className="text-[22px] font-semibold">Produk tidak ditemukan</h3>
            <p className="mt-2 text-[14px] text-white/56">Coba ganti kata kunci atau filter bahan.</p>
          </div>
        )}
      </section>

      <footer className="border-t border-white/10 bg-[#050706] py-14 text-white">
        <div className="content-wrap grid gap-10 md:grid-cols-[1.2fr_1fr]">
          <div>
            <Link href="/" className="flex items-center text-[20px] font-semibold" aria-label="CV Banbuk Store home">
              <BrandLogo markClassName="h-9 w-9" textClassName="text-[20px]" subTextClassName="text-[9px]" />
            </Link>
            <h2 className="mt-6 max-w-xl text-[30px] font-semibold leading-tight">
              Katalog, checkout, wishlist, dan inquiry dalam satu etalase CV Banbuk.
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-6 text-[14px]">
            <div>
              <p className="mb-4 text-[11px] font-semibold uppercase text-white/40">Produk</p>
              <Link href="/products" className="block py-1.5 text-white/62 hover:text-[color:var(--brand-green)] transition-colors">Katalog</Link>
              <Link href="/dashboard" className="block py-1.5 text-white/62 hover:text-[color:var(--brand-green)] transition-colors">Dashboard</Link>
              {canUseCustomerShopping && (
                <button type="button" onClick={() => window.dispatchEvent(new Event("banbuk-cart-open"))} className="block py-1.5 text-left text-white/62 hover:text-[color:var(--brand-green)] transition-colors">Keranjang</button>
              )}
            </div>
            <div>
              <p className="mb-4 text-[11px] font-semibold uppercase text-white/40">Akun</p>
              <a
                href="https://instagram.com/Kelompok7RPL"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 py-1.5 text-white/62 hover:text-[color:var(--brand-green)] transition-colors"
              >
                <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
                <span>@Kelompok7RPL</span>
              </a>
              <a
                href="https://instagram.com/Kelompok7RPL"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 py-1.5 text-white/62 hover:text-[color:var(--brand-green)] transition-colors"
              >
                <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span>@Kelompok7RPL</span>
              </a>
            </div>
            <div>
              <p className="mb-4 text-[11px] font-semibold uppercase text-white/40">Bantuan</p>
              <a
                href="https://wa.me/62895325176973"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 py-1.5 text-white/62 hover:text-[color:var(--brand-green)] transition-colors"
              >
                <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.725 1.45h.005c5.448 0 9.878-4.426 9.881-9.874.002-2.64-1.022-5.122-2.883-6.984C16.495 1.883 14.016.86 11.381.86c-5.452 0-9.88 4.428-9.883 9.876-.001 2.03.529 4.013 1.535 5.761l-.974 3.559 3.65-.957l.348.196zM17.29 13.91c-.287-.144-1.702-.84-1.965-.936-.263-.096-.456-.144-.648.144-.192.288-.744.936-.912 1.127-.168.19-.336.215-.624.071-.287-.143-1.21-.446-2.307-1.423-.854-.76-1.43-1.702-1.597-1.99-.168-.287-.018-.442.126-.584.13-.128.288-.335.432-.503.144-.167.192-.287.288-.479.096-.191.048-.36-.024-.503-.072-.144-.648-1.56-.888-2.136-.234-.564-.492-.487-.672-.496-.18-.009-.384-.01-.588-.01-.204 0-.536.077-.816.383-.28.307-1.071 1.047-1.071 2.555 0 1.507 1.096 2.966 1.24 3.158.144.192 2.158 3.296 5.228 4.622.73.315 1.3.504 1.745.646.734.233 1.403.2 1.93.122.587-.087 1.702-.695 1.942-1.366.24-.67.24-1.243.168-1.365-.072-.122-.264-.191-.552-.336z" />
                </svg>
                <span>0895325176973</span>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
