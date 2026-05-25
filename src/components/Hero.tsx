"use client";

import Link from "next/link";
import { Star, CheckCircle2, ChevronDown, ShieldCheck, Zap, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const WA_URL =
  "https://wa.me/6285148416700?text=Halo%20Storo.id%2C%20saya%20mau%20konsultasi%20gratis%20untuk%20webstore";

const WhatsAppIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const Hero = () => {
  return (
    <section className="relative bg-gradient-to-br from-primary/5 to-secondary/5 pt-24 md:pt-28 pb-12 md:pb-16 overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-4xl mx-auto">
          {/* Logo */}
          <div className="mb-6">
            <p className="text-4xl md:text-6xl font-bold text-primary mb-2">
              Storo.id
            </p>
            <div className="w-24 h-1 bg-gradient-to-r from-primary to-secondary mx-auto"></div>
          </div>

          {/* Pre-headline pain hook */}
          <div className="mb-4">
            <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-red-600 bg-red-50 border border-red-100 px-3 py-1.5 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              Stop kasih 28% omset Anda ke marketplace
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-5 leading-[1.1] tracking-tight">
            Punya Webstore Sendiri.{" "}
            <span className="text-primary">
              Tanpa Ribet, Tanpa Fee 28%, Cukup Kirim File Shopee.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-7 leading-relaxed max-w-3xl mx-auto">
            Tim Storo setup webstore lengkap untuk Anda: produk, payment gateway,
            11+ kurir, loyalty &amp; membership, blog SEO. Live dalam{" "}
            <span className="font-semibold text-secondary">1-3 hari kerja</span>,
            data pelanggan 100% milik Anda.
          </p>

          {/* Quick value bullets */}
          <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 mb-8 text-sm text-gray-700">
            <li className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-secondary" />
              Hemat puluhan juta/tahun dari fee
            </li>
            <li className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-secondary" />
              Database pelanggan 100% milik Anda
            </li>
            <li className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-secondary" />
              Setup beres oleh tim kami
            </li>
          </ul>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Button asChild size="lg" className="btn-hero text-base w-full sm:w-auto">
              <Link href="/onboarding">Pesan Toko Sekarang</Link>
            </Button>
            <Button
              asChild
              size="lg"
              className="text-base w-full sm:w-auto bg-[#25D366] hover:bg-[#1ebe57] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 px-6 py-4 rounded-xl cursor-pointer gap-2"
            >
              <a href={WA_URL} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon className="w-5 h-5" />
                Chat WA Gratis
              </a>
            </Button>
          </div>

          {/* Reassurance line */}
          <p className="mt-3 text-xs text-gray-500">
            Balasan dalam 5 menit · Konsultasi gratis · Tanpa komitmen
          </p>

          {/* Trust strip — compact, with specific numbers */}
          <div className="mt-10">
            <div className="grid grid-cols-3 max-w-2xl mx-auto divide-x divide-gray-200 bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200 py-4">
              <div className="flex flex-col items-center gap-1 px-2">
                <div className="flex items-center gap-1 text-primary">
                  <Users className="w-4 h-4" />
                  <span className="text-xl sm:text-2xl font-bold">500+</span>
                </div>
                <span className="text-[11px] sm:text-xs text-gray-600 text-center">Seller pindah</span>
              </div>
              <div className="flex flex-col items-center gap-1 px-2">
                <div className="flex items-center gap-1 text-yellow-500">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-xl sm:text-2xl font-bold text-gray-900">4.9</span>
                </div>
                <span className="text-[11px] sm:text-xs text-gray-600 text-center">Rating klien</span>
              </div>
              <div className="flex flex-col items-center gap-1 px-2">
                <div className="flex items-center gap-1 text-secondary">
                  <Zap className="w-4 h-4" />
                  <span className="text-xl sm:text-2xl font-bold text-gray-900">1-3</span>
                </div>
                <span className="text-[11px] sm:text-xs text-gray-600 text-center">Hari live</span>
              </div>
            </div>

            {/* Legalitas micro-line */}
            <p className="mt-4 text-[11px] text-gray-400 inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Operator terdaftar resmi · Server data di Indonesia · Pembayaran berlisensi BI
            </p>
          </div>

          {/* Scroll momentum cue */}
          <a
            href="#problem"
            className="mt-10 inline-flex flex-col items-center gap-1 text-gray-400 hover:text-primary transition-colors group"
            aria-label="Scroll ke bagian berikutnya"
          >
            <span className="text-xs">Lihat kenapa seller pindah</span>
            <ChevronDown className="w-5 h-5 animate-bounce group-hover:text-primary" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default Hero;
