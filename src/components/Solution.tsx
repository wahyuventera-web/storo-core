import { FileSpreadsheet, CreditCard, Truck } from "lucide-react";

const Solution = () => {
  const solutions = [
    {
      icon: <FileSpreadsheet className="w-12 h-12 text-secondary" />,
      title: "Import Produk Otomatis dari Excel Shopee",
      description: "Langsung upload file dari Seller Center, tidak perlu input manual satu-satu"
    },
    {
      icon: <CreditCard className="w-12 h-12 text-secondary" />,
      title: "Integrasi Pembayaran (Midtrans/Xendit)",
      description: "Terima pembayaran langsung ke rekening dengan gateway payment terpercaya"
    },
    {
      icon: <Truck className="w-12 h-12 text-secondary" />,
      title: "Ongkir Real-time (JNE, J&T, SiCepat, AnterAja, dll)",
      description: "Hitung ongkir otomatis dari berbagai ekspedisi terpopuler"
    }
  ];

  return (
    <section className="section-padding bg-gradient-to-r from-teal-50 to-orange-50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Solusi dari <span className="text-primary">Storo.id</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Semua yang Anda butuhkan untuk webstore yang siap jual
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {solutions.map((solution, index) => (
            <div key={index} className="bg-white p-8 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 text-center">
              <div className="flex justify-center mb-6">
                <div className="p-3 bg-teal-100 rounded-full">
                  {solution.icon}
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {solution.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {solution.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Solution;