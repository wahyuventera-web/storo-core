import { ShieldCheck, Building2, Headphones, Lock } from "lucide-react";

const items = [
  {
    icon: Building2,
    title: "Operator Resmi",
    desc: "Dioperasikan oleh VenteraAI, terdaftar resmi di Kementerian Hukum & HAM RI.",
  },
  {
    icon: Lock,
    title: "Data Aman di Indonesia",
    desc: "Server region Indonesia plus backup harian otomatis. Sesuai UU PDP.",
  },
  {
    icon: ShieldCheck,
    title: "Payment Resmi Berlisensi",
    desc: "Pembayaran via Xendit dan Midtrans, gateway berlisensi Bank Indonesia.",
  },
  {
    icon: Headphones,
    title: "Tim Siap Bantu",
    desc: "Tim engineer dan support ready. Balasan WA dalam 5 menit jam kerja.",
  },
];

const TrustStrip = () => {
  return (
    <section className="py-12 md:py-16 bg-white border-y border-gray-100">
      <div className="container mx-auto px-6">
        <div className="text-center mb-8 fade-in">
          <span className="inline-block text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full mb-3">
            Kenapa Bisa Dipercaya
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            Bisnis Anda Aman di Tangan Tim yang Berpengalaman
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {items.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-gray-50 rounded-xl p-4 sm:p-5 border border-gray-100 hover:border-primary/20 hover:bg-white hover:shadow-sm transition-all fade-in"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1 leading-snug">
                {title}
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustStrip;
