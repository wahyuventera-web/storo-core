import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const Pricing = () => {
  const packages = [
    {
      name: "Starter",
      price: "Rp1,5 juta",
      description: "Untuk bisnis yang baru mulai",
      features: [
        "Setup webstore + 500 SKU",
        "Integrasi payment & ongkir",
        "Free support 1 bulan",
        "Training penggunaan dasar"
      ],
      popular: false
    },
    {
      name: "Pro",
      price: "Rp2,5 juta", 
      description: "Paling populer untuk seller aktif",
      features: [
        "Semua Starter + 1.000 SKU",
        "AI rewrite judul & deskripsi produk",
        "Free domain 1 tahun",
        "Template custom design",
        "Priority support"
      ],
      popular: true
    },
    {
      name: "Enterprise",
      price: "Custom Price",
      description: "Untuk seller dengan volume tinggi",
      features: [
        "SKU unlimited",
        "Tema custom + integrasi iklan",
        "SLA support cepat (2 jam)",
        "Marketing automation",
        "Dedicated account manager"
      ],
      popular: false
    }
  ];

  return (
    <section className="section-padding bg-gray-50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Paket Harga <span className="text-primary">Transparan</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Pilih paket yang sesuai dengan kebutuhan bisnis Anda
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {packages.map((pkg, index) => (
            <div key={index} className={`relative bg-white rounded-xl shadow-lg p-8 ${pkg.popular ? 'ring-2 ring-primary' : ''}`}>
              {pkg.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary text-white px-4 py-2 rounded-full text-sm font-semibold">
                    Paling Populer
                  </span>
                </div>
              )}
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{pkg.name}</h3>
                <div className="text-3xl font-bold text-primary mb-2">{pkg.price}</div>
                <p className="text-gray-600">{pkg.description}</p>
              </div>

              <div className="space-y-4 mb-8">
                {pkg.features.map((feature, featureIndex) => (
                  <div key={featureIndex} className="flex items-start space-x-3">
                    <Check className="w-5 h-5 text-secondary mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>

              <Button 
                className={`w-full ${pkg.popular ? 'btn-hero' : 'btn-outline'}`}
                onClick={() => window.open(`https://wa.me/6281234567890?text=Halo%20Storo.id,%20saya%20tertarik%20dengan%20paket%20${pkg.name}`, '_blank')}
              >
                Pilih Paket {pkg.name}
              </Button>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button 
            size="lg"
            className="btn-hero"
            onClick={() => window.open('https://wa.me/6281234567890?text=Halo%20Storo.id,%20saya%20mau%20pesan%20webstore', '_blank')}
          >
            Pesan Sekarang via WhatsApp
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Pricing;