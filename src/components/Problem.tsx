import { TrendingDown, Users, Upload } from "lucide-react";

const Problem = () => {
  const problems = [
    {
      icon: <TrendingDown className="w-12 h-12 text-red-500" />,
      title: "Potongan fee marketplace makin tinggi",
      description: "Margin keuntungan makin tipis karena fee yang terus naik"
    },
    {
      icon: <Users className="w-12 h-12 text-red-500" />,
      title: "Data pelanggan & kontrol bukan milik seller",
      description: "Tidak bisa membangun database pelanggan sendiri"
    },
    {
      icon: <Upload className="w-12 h-12 text-red-500" />,
      title: "Upload ulang ribuan produk bikin pusing",
      description: "Memindahkan produk ke platform lain sangat merepotkan"
    }
  ];

  return (
    <section className="section-padding bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Kenapa Seller Shopee Perlu <span className="text-primary">Webstore Sendiri?</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Masalah yang sering dihadapi seller Shopee yang ingin ekspansi bisnis
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {problems.map((problem, index) => (
            <div key={index} className="text-center p-6 rounded-xl border border-gray-100 hover:shadow-lg transition-all duration-300">
              <div className="flex justify-center mb-4">
                {problem.icon}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {problem.title}
              </h3>
              <p className="text-gray-600">
                {problem.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Problem;