"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Eye,
  Search,
  Loader2,
  FileSpreadsheet,
  AlertCircle,
  Download,
  Package,
} from "lucide-react";

type Cell = string | number | boolean | null;
type Row = Cell[];

interface ParsedSheet {
  sheetName: string;
  header: string[];
  rows: Row[];
  totalRows: number;
}

interface Props {
  fileName: string;
  fileSize?: number;
  signedUrl: string;
  uploadedAt?: string;
}

// File Shopee biasanya punya beberapa baris instruksi sebelum header.
// Auto-detect header row: cari baris pertama dengan >=3 cell non-empty
// yang sebagian besar berupa text (bukan number/empty).
function detectHeaderRow(rows: Row[]): number {
  for (let i = 0; i < Math.min(rows.length, 20); i += 1) {
    const row = rows[i] ?? [];
    const nonEmpty = row.filter((c) => c != null && String(c).trim() !== "");
    if (nonEmpty.length < 3) continue;
    const textCells = nonEmpty.filter((c) => typeof c === "string");
    if (textCells.length / nonEmpty.length >= 0.6) return i;
  }
  return 0;
}

function isImageUrl(v: Cell): boolean {
  if (typeof v !== "string") return false;
  return /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif|avif)(\?|$)/i.test(v.trim());
}

function isProductFile(name: string): boolean {
  return /mass_update_basic_info|mass_update_media_info|mass_republish_items/i.test(name);
}

function friendlyFileType(name: string): string {
  if (/mass_update_basic_info/i.test(name)) return "Info Produk";
  if (/mass_update_sales_info/i.test(name)) return "Harga & Stok";
  if (/mass_update_media_info/i.test(name)) return "Foto Produk";
  if (/mass_update_shipping_info/i.test(name)) return "Pengiriman";
  if (/mass_update_dts_info/i.test(name)) return "Berat & Dimensi";
  if (/mass_republish_items/i.test(name)) return "Republish";
  return "File Shopee";
}

function formatCell(v: Cell): string {
  if (v == null) return "";
  if (typeof v === "number") {
    if (Number.isInteger(v) && Math.abs(v) < 1e15) return v.toLocaleString("id-ID");
    return String(v);
  }
  return String(v);
}

export function ShopeeFilePreviewDialog({ fileName, fileSize, signedUrl, uploadedAt }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheets, setSheets] = useState<ParsedSheet[]>([]);
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const PAGE_SIZE = 50;

  useEffect(() => {
    if (!open || sheets.length > 0 || loading) return;

    let cancelled = false;
    async function parse() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(signedUrl);
        if (!res.ok) throw new Error(`Gagal download file (HTTP ${res.status})`);
        const buf = await res.arrayBuffer();

        // Dynamic import — keep xlsx out of initial bundle
        const XLSX = await import("xlsx");
        const wb = XLSX.read(buf, { type: "array" });

        const parsed: ParsedSheet[] = wb.SheetNames.map((name) => {
          const ws = wb.Sheets[name];
          const aoa = XLSX.utils.sheet_to_json<Row>(ws, {
            header: 1,
            defval: null,
            raw: true,
          });
          const headerIdx = detectHeaderRow(aoa);
          const headerRow = (aoa[headerIdx] ?? []).map((c, i) =>
            c == null || String(c).trim() === "" ? `Kolom ${i + 1}` : String(c).trim(),
          );
          const dataRows = aoa.slice(headerIdx + 1).filter((r) => r.some((c) => c != null && String(c).trim() !== ""));
          return {
            sheetName: name,
            header: headerRow,
            rows: dataRows,
            totalRows: dataRows.length,
          };
        });

        if (!cancelled) setSheets(parsed);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Gagal parse file Excel");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    parse();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const sheet = sheets[activeSheetIdx];

  const filteredRows = useMemo(() => {
    if (!sheet) return [];
    if (!search.trim()) return sheet.rows;
    const q = search.toLowerCase();
    return sheet.rows.filter((r) =>
      r.some((c) => c != null && String(c).toLowerCase().includes(q)),
    );
  }, [sheet, search]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows = filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => {
    setPage(0);
  }, [search, activeSheetIdx]);

  const friendly = friendlyFileType(fileName);
  const isProducts = isProductFile(fileName);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 cursor-pointer shrink-0"
      >
        <Eye className="w-3.5 h-3.5" />
        Lihat Isi
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-gray-100 shrink-0">
            <DialogTitle className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                {isProducts ? (
                  <Package className="w-5 h-5 text-primary" />
                ) : (
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-base font-semibold text-gray-900 truncate">{fileName}</p>
                <p className="text-xs text-gray-500 font-normal mt-0.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-medium mr-2">
                    {friendly}
                  </span>
                  {fileSize != null && (
                    <>
                      {fileSize < 1024 * 1024
                        ? `${(fileSize / 1024).toFixed(1)} KB`
                        : `${(fileSize / 1024 / 1024).toFixed(2)} MB`}
                    </>
                  )}
                  {uploadedAt && (
                    <>
                      {" · "}
                      {new Date(uploadedAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </>
                  )}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Toolbar */}
          <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-3 flex-wrap shrink-0 bg-gray-50/50">
            {sheets.length > 1 && (
              <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-0.5">
                {sheets.map((s, i) => (
                  <button
                    key={s.sheetName}
                    type="button"
                    onClick={() => setActiveSheetIdx(i)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      i === activeSheetIdx
                        ? "bg-primary text-white"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {s.sheetName}
                  </button>
                ))}
              </div>
            )}

            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Cari produk, SKU, atau apapun..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 bg-white"
                disabled={loading || !sheet}
              />
            </div>

            <div className="ml-auto flex items-center gap-3 text-xs text-gray-500">
              {sheet && (
                <span className="font-medium">
                  {filteredRows.length.toLocaleString("id-ID")}
                  {search && ` dari ${sheet.totalRows.toLocaleString("id-ID")}`}{" "}
                  {isProducts ? "produk" : "baris"}
                </span>
              )}
              <a
                href={signedUrl}
                download={fileName}
                className="inline-flex items-center gap-1.5 text-primary hover:text-primary/80 font-medium cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </a>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 min-h-0 overflow-auto">
            {loading && (
              <div className="h-full flex flex-col items-center justify-center text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                <p className="text-sm">Membaca file Excel...</p>
                <p className="text-xs text-gray-400 mt-1">File besar bisa makan beberapa detik</p>
              </div>
            )}

            {error && (
              <div className="h-full flex flex-col items-center justify-center text-center px-6">
                <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
                <p className="text-sm font-medium text-gray-900">Gagal membuka file</p>
                <p className="text-xs text-gray-500 mt-1 max-w-md">{error}</p>
                <a
                  href={signedUrl}
                  download={fileName}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download file untuk buka manual
                </a>
              </div>
            )}

            {!loading && !error && sheet && filteredRows.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center px-6">
                <Search className="w-10 h-10 text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-900">Tidak ada hasil</p>
                <p className="text-xs text-gray-500 mt-1">
                  Coba kata kunci lain atau hapus filter pencarian.
                </p>
              </div>
            )}

            {!loading && !error && sheet && filteredRows.length > 0 && (
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e5e7eb]">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider w-12 border-r border-gray-100">
                      #
                    </th>
                    {sheet.header.map((h, i) => (
                      <th
                        key={i}
                        className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap border-r border-gray-100 last:border-r-0"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((row, ri) => {
                    const globalIdx = page * PAGE_SIZE + ri;
                    return (
                      <tr
                        key={globalIdx}
                        className="hover:bg-blue-50/30 transition-colors border-b border-gray-50"
                      >
                        <td className="px-3 py-2 text-xs text-gray-400 font-mono border-r border-gray-100">
                          {globalIdx + 1}
                        </td>
                        {sheet.header.map((_, ci) => {
                          const v = row[ci];
                          const formatted = formatCell(v);
                          if (isImageUrl(v)) {
                            return (
                              <td
                                key={ci}
                                className="px-3 py-2 border-r border-gray-100 last:border-r-0"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={String(v)}
                                  alt=""
                                  loading="lazy"
                                  className="w-12 h-12 object-cover rounded border border-gray-200"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).style.display = "none";
                                  }}
                                />
                              </td>
                            );
                          }
                          return (
                            <td
                              key={ci}
                              className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[300px] truncate border-r border-gray-100 last:border-r-0"
                              title={formatted}
                            >
                              {formatted || <span className="text-gray-300">—</span>}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {!loading && !error && sheet && pageCount > 1 && (
            <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
              <p className="text-xs text-gray-500">
                Halaman {page + 1} dari {pageCount} ·{" "}
                {(page * PAGE_SIZE + 1).toLocaleString("id-ID")}–
                {Math.min((page + 1) * PAGE_SIZE, filteredRows.length).toLocaleString("id-ID")} dari{" "}
                {filteredRows.length.toLocaleString("id-ID")}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="cursor-pointer h-8"
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  disabled={page >= pageCount - 1}
                  className="cursor-pointer h-8"
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
