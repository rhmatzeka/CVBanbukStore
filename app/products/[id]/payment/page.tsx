"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import AppNavbar from "@/components/AppNavbar";
import Web3Payment from "@/components/Web3Payment";
import MidtransPayment from "@/components/MidtransPayment";
import ProductImage from "@/components/ProductImage";
import LoadingScreen from "@/components/LoadingScreen";

gsap.registerPlugin(useGSAP);

const PAYMENT_METHODS = [
  {
    type: "MIDTRANS",
    title: "Gateway",
    helper: "Transfer bank, e-wallet, QRIS, dan metode umum lain.",
    detail: "Checkout cepat dengan alur pembayaran yang paling familiar untuk customer.",
  },
  {
    type: "CRYPTO",
    title: "Crypto ETH",
    helper: "Wallet Ethereum untuk pembayaran blockchain yang lebih fleksibel.",
    detail: "Cocok untuk pembayaran on-chain dengan wallet Ethereum yang sudah terhubung.",
  },
  {
    type: "REGULAR",
    title: "Manual",
    helper: "Pembayaran dicatat langsung untuk proses internal.",
    detail: "Pilihan paling sederhana jika transaksi ingin dicatat manual oleh tim.",
  },
] as const;

const formatPrice = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;

export default function PaymentPage() {
  type PaymentNotice = {
    id: number;
    tone: "success" | "info" | "error";
    title: string;
    message: string;
    redirectToDashboard?: boolean;
  };

  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const isCustomer = status === "authenticated" && session?.user.role === "CUSTOMER";

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentType, setPaymentType] = useState<"MIDTRANS" | "CRYPTO" | "REGULAR">("MIDTRANS");
  const [paymentNotice, setPaymentNotice] = useState<PaymentNotice | null>(null);
  const selectorRef = useRef<HTMLDivElement>(null);
  const detailPanelRef = useRef<HTMLDivElement>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  const noticeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    if (status === "authenticated" && session?.user.role !== "CUSTOMER") {
      router.replace("/dashboard");
    }
  }, [router, session?.user.role, status]);

  useEffect(() => {
    if (productId && isCustomer) {
      fetchProduct();
    }
  }, [isCustomer, productId]);

  useEffect(() => {
    return () => {
      if (noticeTimeoutRef.current) {
        window.clearTimeout(noticeTimeoutRef.current);
      }
    };
  }, []);

  useGSAP(
    () => {
      const selectedCard = selectorRef.current?.querySelector<HTMLElement>(`[data-method="${paymentType}"]`);
      const detailPanel = detailPanelRef.current;

      if (selectedCard) {
        const checkBadge = selectedCard.querySelector<HTMLElement>("[data-check-badge]");
        const helperCopy = selectedCard.querySelector<HTMLElement>("[data-selected-copy]");

        gsap.fromTo(
          selectedCard,
          { y: 10, scale: 0.985 },
          {
            y: 0,
            scale: 1,
            duration: 0.28,
            ease: "power2.out",
            clearProps: "transform",
          }
        );

        if (checkBadge) {
          gsap.fromTo(
            checkBadge,
            { scale: 0.72, autoAlpha: 0 },
            {
              scale: 1,
              autoAlpha: 1,
              duration: 0.24,
              ease: "back.out(1.8)",
              clearProps: "transform,opacity",
            }
          );
        }

        if (helperCopy) {
          gsap.fromTo(
            helperCopy,
            { y: 8, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.24,
              ease: "power2.out",
              clearProps: "transform,opacity",
            }
          );
        }
      }

      if (detailPanel) {
        gsap.fromTo(
          detailPanel,
          { y: 18, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.32,
            ease: "power2.out",
            clearProps: "transform,opacity",
          }
        );
      }
    },
    { dependencies: [paymentType], revertOnUpdate: true }
  );

  useGSAP(
    () => {
      if (!paymentNotice || !noticeRef.current) {
        return;
      }

      gsap.fromTo(
        noticeRef.current,
        { y: 20, autoAlpha: 0, scale: 0.96 },
        {
          y: 0,
          autoAlpha: 1,
          scale: 1,
          duration: 0.3,
          ease: "power2.out",
          clearProps: "transform,opacity",
        }
      );
    },
    { dependencies: [paymentNotice?.id], revertOnUpdate: true }
  );

  const activeMethod = PAYMENT_METHODS.find((method) => method.type === paymentType) ?? PAYMENT_METHODS[0];

  const showPaymentNotice = (notice: Omit<PaymentNotice, "id">) => {
    if (noticeTimeoutRef.current) {
      window.clearTimeout(noticeTimeoutRef.current);
      noticeTimeoutRef.current = null;
    }

    const nextNotice = {
      ...notice,
      id: Date.now(),
    };

    setPaymentNotice(nextNotice);

    noticeTimeoutRef.current = window.setTimeout(() => {
      if (nextNotice.redirectToDashboard) {
        router.push("/dashboard");
        return;
      }

      setPaymentNotice(null);
    }, notice.redirectToDashboard ? 1800 : 3600);
  };

  const dismissPaymentNotice = () => {
    if (noticeTimeoutRef.current) {
      window.clearTimeout(noticeTimeoutRef.current);
      noticeTimeoutRef.current = null;
    }

    setPaymentNotice(null);
  };

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/products/${productId}`);
      const data = await res.json();
      setProduct(data);
    } catch (error) {
      console.error("Error fetching product:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegularPayment = async () => {
    try {
      const res = await fetch("/api/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          amount: product.price,
          paymentType: "REGULAR",
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        showPaymentNotice({
          tone: "success",
          title: "Pembayaran berhasil",
          message: "Pembayaran manual sudah tercatat dan pesanan Anda akan segera diproses.",
          redirectToDashboard: true,
        });
      } else {
        showPaymentNotice({
          tone: "error",
          title: "Pembayaran gagal",
          message: data?.error || "Pembayaran belum berhasil dicatat. Silakan coba lagi.",
        });
      }
    } catch (error) {
      showPaymentNotice({
        tone: "error",
        title: "Terjadi kesalahan",
        message: "Kami belum bisa menyimpan pembayaran manual Anda. Silakan ulangi beberapa saat lagi.",
      });
    }
  };

  const handleCryptoSuccess = async (txHash: string, walletAddress: string) => {
    try {
      const res = await fetch("/api/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          amount: product.price,
          paymentType: "CRYPTO",
          txHash,
          walletAddress,
        }),
      });

      if (res.ok) {
        showPaymentNotice({
          tone: "success",
          title: "Pembayaran crypto berhasil",
          message: "Transaksi blockchain Anda sudah tercatat dan kami akan mengarahkan Anda ke akun.",
          redirectToDashboard: true,
        });
        return;
      }

      const data = await res.json().catch(() => null);
      showPaymentNotice({
        tone: "error",
        title: "Transaksi belum tersimpan",
        message: data?.error || "Pembayaran berhasil di wallet, tetapi pencatatan transaksi belum selesai.",
      });
    } catch (error) {
      showPaymentNotice({
        tone: "error",
        title: "Gagal menyimpan transaksi",
        message: "Pembayaran crypto berhasil dikirim, tetapi transaksi belum tersimpan di sistem.",
      });
    }
  };

  if (status === "loading" || !isCustomer) {
    return <LoadingScreen label="Mengalihkan akses" detail="Pembayaran hanya tersedia untuk akun customer." />;
  }

  if (loading) {
    return <LoadingScreen label="Menyiapkan pembayaran" detail="Detail produk dan metode checkout sedang dimuat." />;
  }

  if (!product) {
    return (
      <div className="product-page flex min-h-screen items-center justify-center">
        <div className="product-card px-8 py-6 text-sm text-slate-300">Produk tidak ditemukan.</div>
      </div>
    );
  }

  return (
    <main className="product-page customer-flow-page min-h-screen pb-12 text-white">
      <AppNavbar />

      {paymentNotice && (
        <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[130] flex justify-center sm:inset-x-auto sm:right-6 sm:w-auto sm:justify-end">
          <div
            ref={noticeRef}
            className={`pointer-events-auto w-full max-w-[400px] rounded-[10px] border px-4 py-4 shadow-[0_22px_70px_rgba(0,0,0,0.34)] ${
              paymentNotice.tone === "success"
                ? "border-emerald-400/20 bg-[linear-gradient(135deg,rgba(16,40,28,0.96),rgba(11,18,15,0.98))]"
                : paymentNotice.tone === "info"
                  ? "border-sky-400/20 bg-[linear-gradient(135deg,rgba(15,34,48,0.96),rgba(10,16,22,0.98))]"
                  : "border-rose-400/20 bg-[linear-gradient(135deg,rgba(52,20,24,0.96),rgba(18,12,14,0.98))]"
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] ${
                  paymentNotice.tone === "success"
                    ? "bg-emerald-400/15 text-emerald-300"
                    : paymentNotice.tone === "info"
                      ? "bg-sky-400/15 text-sky-300"
                      : "bg-rose-400/15 text-rose-300"
                }`}
              >
                {paymentNotice.tone === "success" ? (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12 5 5L20 7" />
                  </svg>
                ) : paymentNotice.tone === "info" ? (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8h.01" />
                    <path d="M11 12h1v4h1" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="m15 9-6 6" />
                    <path d="m9 9 6 6" />
                  </svg>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-white">{paymentNotice.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{paymentNotice.message}</p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {paymentNotice.redirectToDashboard ? (
                    <button
                      type="button"
                      onClick={() => router.push("/dashboard")}
                      className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#141416] transition-opacity hover:opacity-90"
                    >
                      Buka Akun
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={dismissPaymentNotice}
                      className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#141416] transition-opacity hover:opacity-90"
                    >
                      Tutup
                    </button>
                  )}

                  {paymentNotice.redirectToDashboard && (
                    <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                      Mengalihkan otomatis...
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="content-wrap pt-5">
        <div className="rounded-[10px] border border-white/[0.09] bg-[rgba(8,12,11,0.74)] px-4 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] md:px-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <span className="section-kicker">Checkout</span>
              <h1 className="mt-2 text-[28px] font-semibold leading-[1.05] text-white md:text-[36px]">Pembayaran produk</h1>
              <p className="mt-2 max-w-2xl text-[14px] leading-6 text-white/58">
                Pilih metode pembayaran yang paling sesuai untuk menyelesaikan pesanan dengan tampilan yang lebih ringkas dan fokus.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:w-fit">
              <div className="rounded-[8px] border border-white/[0.09] bg-white/[0.035] px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase text-white/40">Produk</p>
                <p className="mt-1 max-w-[170px] truncate text-[13px] font-semibold text-white">{product.name}</p>
              </div>
              <div className="rounded-[8px] border border-[rgba(0,212,164,0.2)] bg-[rgba(0,212,164,0.06)] px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase text-white/40">Total</p>
                <p className="mt-1 text-[13px] font-semibold text-[color:var(--brand-green)]">
                  {formatPrice(product.price)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="content-wrap mt-4">
        <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <article className="overflow-hidden rounded-[10px] border border-white/[0.09] bg-[rgba(8,12,11,0.74)] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] lg:sticky lg:top-20 lg:h-fit">
            <div className="relative h-[150px] overflow-hidden">
              <ProductImage src={product.image} alt={product.name} className="block !h-full !w-full !object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
            </div>

            <div className="space-y-3 p-4">
              <div>
                <span className="status-pill bg-white/[0.06] text-white/70">Ringkasan pesanan</span>
                <h2 className="mt-3 text-[18px] font-semibold leading-tight text-white">{product.name}</h2>
                <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-white/52">
                  {product.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-[13px]">
                <div className="rounded-[8px] border border-white/[0.08] bg-white/[0.035] px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase text-white/38">Bahan</p>
                  <p className="mt-1 truncate font-semibold text-white/86">{product.material}</p>
                </div>
                <div className="rounded-[8px] border border-white/[0.08] bg-white/[0.035] px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase text-white/38">Ukuran</p>
                  <p className="mt-1 truncate font-semibold text-white/86">{product.size}</p>
                </div>
                <div className="rounded-[8px] border border-white/[0.08] bg-white/[0.035] px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase text-white/38">Stok</p>
                  <p className="mt-1 font-semibold text-white/86">{product.stock}</p>
                </div>
                <div className="rounded-[8px] border border-[rgba(0,212,164,0.18)] bg-[rgba(0,212,164,0.055)] px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase text-white/38">Total</p>
                  <p className="mt-1 font-semibold text-[color:var(--brand-green)]">
                    {formatPrice(product.price)}
                  </p>
                </div>
              </div>

              <div className="rounded-[8px] border border-white/[0.08] bg-white/[0.035] px-3 py-2.5 text-[13px] leading-5 text-white/52">
                Pesanan akan diproses setelah pembayaran selesai atau tercatat pada sistem.
              </div>
            </div>
          </article>

          <div className="space-y-4">
            <div className="rounded-[10px] border border-white/[0.09] bg-[rgba(8,12,11,0.74)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] md:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="section-kicker">Metode</p>
                  <h2 className="mt-1 text-[18px] font-semibold leading-tight text-white md:text-[20px]">Pilih metode pembayaran</h2>
                </div>
                <p className="max-w-sm text-[13px] leading-5 text-white/52">
                  Pilih metode yang paling nyaman untuk menyelesaikan pesanan ini.
                </p>
              </div>

              <div ref={selectorRef} className="mt-4 grid gap-2.5">
                {PAYMENT_METHODS.map(({ type, title, helper, detail }) => (
                  <button
                    key={type}
                    data-method={type}
                    type="button"
                    aria-pressed={paymentType === type}
                    onClick={() => setPaymentType(type)}
                    className={`rounded-[10px] border px-3.5 py-3 text-left transition-all duration-200 md:px-4 ${
                      paymentType === type
                        ? "border-[rgba(0,212,164,0.34)] bg-[rgba(0,212,164,0.075)] shadow-[0_16px_44px_rgba(0,212,164,0.08)]"
                        : "border-white/[0.08] bg-white/[0.035] hover:border-white/[0.14] hover:bg-white/[0.055]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border transition-colors ${
                          paymentType === type
                            ? "border-[rgba(0,212,164,0.34)] bg-[rgba(0,212,164,0.12)] text-[color:var(--brand-green)]"
                            : "border-white/[0.08] bg-white/[0.04] text-white/36"
                        }`}
                      >
                        <span
                          data-check-badge
                          className={`flex h-5 w-5 items-center justify-center rounded-full ${
                            paymentType === type
                              ? "bg-[color:var(--brand-green)] text-[#050706]"
                              : "border border-white/[0.14] bg-transparent text-transparent"
                          }`}
                        >
                          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
                          </svg>
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold text-white">{title}</p>
                        <p className="mt-1 text-[13px] leading-5 text-white/58">{helper}</p>

                        {paymentType === type && (
                          <p data-selected-copy className="mt-2 text-[12px] leading-5 text-[color:var(--brand-green)]">
                            {detail}
                          </p>
                        )}
                      </div>

                      <span
                        className={`status-pill ${
                          paymentType === type
                            ? "bg-[color:var(--brand-green)] text-[#050706]"
                            : "bg-white/[0.07] text-white/62"
                        }`}
                      >
                        {paymentType === type ? "Dipilih" : "Pilih"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div ref={detailPanelRef} className="space-y-4">
              <div className="rounded-[10px] border border-[rgba(0,212,164,0.16)] bg-[rgba(0,212,164,0.055)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-white/38">Metode dipilih</p>
                    <h3 className="mt-1 text-[17px] font-semibold text-white">{activeMethod.title}</h3>
                    <p className="mt-1 max-w-xl text-[13px] leading-5 text-white/58">
                      {activeMethod.detail}
                    </p>
                  </div>
                  <span className="status-pill bg-[color:var(--brand-green)] text-[#050706]">Dipilih</span>
                </div>
              </div>

              {paymentType === "MIDTRANS" ? (
                <MidtransPayment
                  productId={productId}
                  productName={product.name}
                  price={product.price}
                  onStatusChange={showPaymentNotice}
                />
              ) : paymentType === "REGULAR" ? (
                <div className="rounded-[10px] border border-white/[0.09] bg-[rgba(8,12,11,0.74)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] md:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-[18px] font-semibold text-white">Pembayaran manual</h3>
                      <p className="mt-2 max-w-xl text-[13px] leading-5 text-white/58">
                        Gunakan metode ini jika pembayaran ingin dicatat langsung ke sistem untuk proses internal.
                      </p>
                    </div>
                    <span className="status-pill bg-white/[0.07] text-white/70">Manual</span>
                  </div>

                  <div className="mt-4 rounded-[8px] border border-white/[0.08] bg-white/[0.035] px-3 py-2.5 text-[13px] leading-5 text-white/52">
                    Pastikan jumlah pembayaran sesuai total pesanan sebelum melanjutkan pencatatan.
                  </div>

                  <button onClick={handleRegularPayment} className="app-button-primary mt-5 w-full sm:w-auto">
                    Bayar Sekarang
                  </button>
                </div>
              ) : (
                <Web3Payment
                  productId={productId}
                  productName={product.name}
                  price={product.price}
                  onSuccess={handleCryptoSuccess}
                />
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
