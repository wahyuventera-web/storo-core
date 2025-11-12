import { Button } from "@/components/ui/button";
import { PDFDownloadLink } from '@react-pdf/renderer';
import CatalogPDF from "./CatalogPDF";
import { Download } from "lucide-react";

const DownloadCatalog = () => {
  return (
    <div className="text-center mt-8">
      <PDFDownloadLink 
        document={<CatalogPDF />} 
        fileName="Katalog_Produk_Storo.pdf"
      >
        {({ loading }) => (
          <Button 
            className="btn-outline"
            disabled={loading}
          >
            <Download className="w-4 h-4 mr-2" />
            {loading ? 'Mempersiapkan PDF...' : 'Download Katalog PDF'}
          </Button>
        )}
      </PDFDownloadLink>
    </div>
  );
};

export default DownloadCatalog;
