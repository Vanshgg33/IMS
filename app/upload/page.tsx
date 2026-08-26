"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import * as XLSX from "xlsx";

interface Template {
  _id: string;
  name: string;
  type: string;
  columnMap: { name: string; qty: string };
}

// Keywords used to auto-detect which column is which.
// Qty is checked first (more specific), then name from the remaining columns.
const QTY_HINTS = [
  "sales quantity", "sale quantity", "quantity sold", "qty sold",
  "units sold", "sales qty", "sold qty", "qty", "quantity",
  "sales", "sold", "units", "amount",
];
const NAME_HINTS = [
  "product name", "productname", "item name", "itemname",
  "product", "item", "name", "description",
];

function autoDetect(cols: string[]): { name: string; qty: string } {
  const norm = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, " ").trim();

  function findCol(hints: string[], exclude: string[]): string {
    for (const hint of hints) {
      const found = cols.find(c => !exclude.includes(c) && norm(c).includes(hint));
      if (found) return found;
    }
    return "";
  }

  const qty = findCol(QTY_HINTS, []);
  const name = findCol(NAME_HINTS, qty ? [qty] : []);

  // With exactly 2 columns fill whatever wasn't detected
  if (cols.length <= 3) {
    const result = { name, qty };
    if (result.qty && !result.name) result.name = cols.find(c => c !== result.qty) || "";
    if (result.name && !result.qty) result.qty = cols.find(c => c !== result.name) || "";
    if (!result.name && !result.qty && cols.length >= 2) {
      result.name = cols[0];
      result.qty = cols[1];
    }
    return result;
  }

  return { name, qty };
}

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[]>([]);
  const [nameCol, setNameCol] = useState("");
  const [qtyCol, setQtyCol] = useState("");
  const [source, setSource] = useState("");
  const [batchType, setBatchType] = useState<"sale" | "purchase">("sale");
  const [store, setStore] = useState<"raipur" | "bhilai" | "rajnandgaon">("raipur");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [saveTemplate, setSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setTemplates(d))
      .catch(() => {});
  }, []);

  function parseAndDetect(f: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "binary" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

        if (rows.length === 0) {
          setUploadError("This file is empty — no rows found.");
          return;
        }

        const cols = Object.keys(rows[0]);
        setColumns(cols);
        setPreviewRows(rows.slice(0, 5));

        // Auto-detect and pre-fill the column selectors
        const { name, qty } = autoDetect(cols);
        if (name) setNameCol(name);
        if (qty) setQtyCol(qty);
      } catch {
        setUploadError("Could not read this file. Please use .xlsx, .xls or .csv.");
      }
    };
    reader.onerror = () => setUploadError("Failed to read file.");
    reader.readAsBinaryString(f);
  }

  function handleFile(f: File) {
    setFile(f);
    setColumns([]);
    setPreviewRows([]);
    setNameCol("");
    setQtyCol("");
    setUploadError("");
    parseAndDetect(f);
  }

  function applyTemplate(t: Template) {
    setSource(t.name);
    setBatchType(t.type as "sale" | "purchase");
    setNameCol(t.columnMap.name);
    setQtyCol(t.columnMap.qty);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function upload() {
    if (!file || !nameCol || !qtyCol) return;
    if (nameCol === qtyCol) {
      setUploadError("Product name column and quantity column cannot be the same.");
      return;
    }
    setUploading(true);
    setUploadError("");

    try {
      if (saveTemplate && templateName) {
        await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: templateName, type: batchType, columnMap: { name: nameCol, qty: qtyCol } }),
        });
      }

      const fd = new FormData();
      fd.append("file", file);
      fd.append("nameCol", nameCol);
      fd.append("qtyCol", qtyCol);
      fd.append("source", source || file.name);
      fd.append("type", batchType);
      fd.append("store", store);
      fd.append("saleDate", saleDate);

      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setUploadError(err.error || `Upload failed (${res.status})`);
        return;
      }

      const data = await res.json();

      if (data.duplicateWarning) {
        const appliedOn = data.duplicateDate
          ? new Date(data.duplicateDate).toLocaleDateString()
          : "a previous session";
        const ok = confirm(
          `This exact file was already applied on ${appliedOn}.\nApplying again will double-${batchType === "sale" ? "subtract" : "add"} stock. Continue?`
        );
        if (!ok) {
          await fetch(`/api/batches/${data.batch._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "discarded" }),
          }).catch(() => {});
          return;
        }
      }

      router.push(`/batches/${data.batch._id}`);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  // Rows that will actually be processed (have a name and qty > 0)
  const validPreviewCount = previewRows.filter(r => {
    const n = String(r[nameCol] || "").trim();
    const q = parseFloat(String(r[qtyCol] || "0")) || 0;
    return n && q > 0;
  }).length;

  return (
    <div className="max-w-xl">
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: 700, color: "var(--nl-text)", margin: 0, letterSpacing: "-0.01em" }}>Upload Report</h1>
        <p style={{ fontSize: "13px", color: "var(--nl-text-3)", marginTop: "3px" }}>Import an Excel or CSV sales/purchase report</p>
      </div>

      {templates.length > 0 && (
        <Card className="mb-4">
          <CardHeader><CardTitle className="text-sm">Saved Templates</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {templates.map((t) => (
              <Button key={t._id} variant="outline" size="sm" onClick={() => applyTemplate(t)}>
                {t.name} <span className="ml-1 text-gray-400 text-xs">({t.type})</span>
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-4 pt-4">

          {/* Drop zone */}
          <div
            style={{
              border: `2px dashed ${drag ? "var(--nl-amber)" : "hsl(var(--border))"}`,
              borderRadius: "10px",
              padding: "32px 24px",
              textAlign: "center",
              cursor: "pointer",
              transition: "border-color 0.15s, background 0.15s",
              background: drag ? "var(--nl-amber-light)" : "hsl(var(--muted))",
            }}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            onMouseEnter={e => { if (!drag) (e.currentTarget as HTMLElement).style.borderColor = "var(--nl-green)"; }}
            onMouseLeave={e => { if (!drag) (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--border))"; }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            {file ? (
              <p style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--nl-green)", fontFamily: "var(--font-mono)" }}>{file.name}</p>
            ) : (
              <div>
                <p style={{ fontSize: "13.5px", color: "var(--nl-text-2)", fontWeight: 600, marginBottom: "4px" }}>Drop your Excel / CSV file here</p>
                <p style={{ fontSize: "12px", color: "var(--nl-text-3)" }}>or click to browse — .xlsx, .xls, .csv</p>
              </div>
            )}
          </div>

          {/* Column configuration — shown after file is loaded */}
          {columns.length > 0 && (
            <>
              {/* Report type + store + date */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs mb-1">Report type</Label>
                  <Select value={batchType} onValueChange={(v) => setBatchType(v as "sale" | "purchase")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sale">Sale (subtract)</SelectItem>
                      <SelectItem value="purchase">Purchase (add)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-1">Store</Label>
                  <Select value={store} onValueChange={(v) => setStore(v as "raipur" | "bhilai" | "rajnandgaon")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent position="item-aligned">
                      <SelectItem value="raipur">Raipur</SelectItem>
                      <SelectItem value="bhilai">Bhilai</SelectItem>
                      <SelectItem value="rajnandgaon">Rajnandgaon</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-1">
                    {batchType === "sale" ? "Sale Date" : "Purchase Date"}
                  </Label>
                  <Input
                    type="date"
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Source label */}
              <div>
                <Label className="text-xs mb-1">Source / label <span className="text-gray-400">(optional)</span></Label>
                <Input
                  placeholder="e.g. Today's sales"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                />
              </div>

              {/* Column mapping */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">
                  Column mapping
                  {nameCol && qtyCol && (
                    <span className="ml-2 text-green-600 font-normal">— auto-detected, change if wrong</span>
                  )}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs mb-1">Product name column</Label>
                    <Select value={nameCol} onValueChange={(v) => setNameCol(v)}>
                      <SelectTrigger className={nameCol ? "" : "border-orange-300"}>
                        <SelectValue placeholder="Pick column…" />
                      </SelectTrigger>
                      <SelectContent>
                        {columns.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs mb-1">Quantity column</Label>
                    <Select value={qtyCol} onValueChange={(v) => setQtyCol(v)}>
                      <SelectTrigger className={qtyCol ? "" : "border-orange-300"}>
                        <SelectValue placeholder="Pick column…" />
                      </SelectTrigger>
                      <SelectContent>
                        {columns.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Data preview — shows first 5 rows of the selected columns */}
              {nameCol && qtyCol && previewRows.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">
                    Preview <span className="text-gray-400 font-normal">(first {previewRows.length} rows)</span>
                    {validPreviewCount < previewRows.length && (
                      <span className="text-gray-400 font-normal"> · {validPreviewCount} of {previewRows.length} shown will be processed</span>
                    )}
                  </p>
                  <div className="rounded border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="text-xs py-1.5 h-auto">{nameCol}</TableHead>
                          <TableHead className="text-xs py-1.5 h-auto text-right">{qtyCol}</TableHead>
                          <TableHead className="text-xs py-1.5 h-auto text-center w-16">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewRows.map((row, i) => {
                          const n = String(row[nameCol] || "").trim();
                          const q = parseFloat(String(row[qtyCol] || "0")) || 0;
                          const willProcess = n && q > 0;
                          return (
                            <TableRow key={i} className={willProcess ? "" : "opacity-40"}>
                              <TableCell className="text-xs py-1.5 font-mono">
                                {n || <span className="text-gray-400 italic">empty</span>}
                              </TableCell>
                              <TableCell className="text-xs py-1.5 text-right font-mono">
                                {q > 0 ? q : <span className="text-gray-400">—</span>}
                              </TableCell>
                              <TableCell className="text-xs py-1.5 text-center">
                                {willProcess
                                  ? <span className="text-green-600">✓</span>
                                  : <span className="text-gray-400">skip</span>}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Template save */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="saveT"
                  checked={saveTemplate}
                  onChange={(e) => setSaveTemplate(e.target.checked)}
                />
                <Label htmlFor="saveT" className="text-xs cursor-pointer">Save column mapping as template</Label>
                {saveTemplate && (
                  <Input
                    placeholder="Template name"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="flex-1 h-7 text-xs"
                  />
                )}
              </div>
            </>
          )}

          {uploadError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
              {uploadError}
            </div>
          )}

          <Button
            className="w-full"
            onClick={upload}
            disabled={!file || !nameCol || !qtyCol || uploading}
          >
            {uploading ? "Parsing…" : "Parse & Preview →"}
          </Button>

        </CardContent>
      </Card>
    </div>
  );
}
