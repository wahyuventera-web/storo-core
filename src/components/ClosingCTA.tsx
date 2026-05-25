"use client";

import { MessageCircle, Target, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const WA_URL =
  "https://wa.me/6285148416700?text=Halo%20Storo.id%2C%20saya%20mau%20konsultasi%20gratis%20untuk%20webstore";

const WhatsAppIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const ClosingCTA = () => {
  return (
    <section className="section-padding bg-gradient-to-r from-primary to-secondary">
      <div className="container mx-auto px-6 text-center">
        <div className="max-w-4xl mx-auto text-white">
          {/* Kicker badge */}
          <span className="inline-block text-xs sm:text-sm font-bold uppercase tracking-wider bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-1.5 rounded-full mb-5">
            Sekarang Giliran Kamu
          </span>

          <h2 className="text-3xl md:text-5xl font-bold mb-5 leading-tight">
            Saatnya Cuan Maksimal,{" "}
            <span className="block sm:inline">Tanpa Admin 28%.</span>
          </h2>

          <p className="text-lg md:text-2xl mb-8 opacity-95 leading-relaxed">
            Pesan hari ini, toko kamu live dalam 1-3 hari kerja. Tim Storo setup
            semuanya. Hemat puluhan juta dari fee marketplace, pelanggan jadi 100%
            milik kamu.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
            <Button
              asChild
              size="lg"
              className="bg-white text-primary hover:bg-gray-100 font-bold text-base px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 w-full sm:w-auto gap-2"
            >
              <a href="/onboarding">
                Yuk, Pesan Toko Saya
                <ArrowRight className="w-5 h-5" />
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              className="bg-[#25D366] hover:bg-[#1ebe57] text-white font-bold text-base px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 gap-2 w-full sm:w-auto"
            >
              <a href={WA_URL} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon className="w-5 h-5" />
                Chat Dulu di WA
              </a>
            </Button>
          </div>

          <div className="mt-8 text-sm md:text-base opacity-90 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
            <span className="inline-flex items-center gap-2">
              <MessageCircle className="w-4 h-4 shrink-0" />
              Balasan dalam 5 menit
            </span>
            <span className="inline-flex items-center gap-2">
              <Target className="w-4 h-4 shrink-0" />
              Konsultasi gratis, tanpa komitmen
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ClosingCTA;
