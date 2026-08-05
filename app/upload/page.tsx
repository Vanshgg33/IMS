"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as XLSX from "xlsx";

interface Template {
  _id: string;
  name: string;
  type: string;
  columnMap: { name: string; qty: string };
}

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [nameCol, setNameCol] = useState("");
  const [qtyCol, setQtyCol] = useState("");
  const [source, setSource] = useState("");
  const [batchType, setBatchType] = useState<"sale" | "purchase">("sale");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [saveTemplate, setSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/templates").then((r) => r.json()).then(setTemplates);
  }, []);

  function parseColumns(f: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target?.result, { type: "binary" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      if (rows.length > 0) setColumns(Object.keys(rows[0]));
    };
    reader.readAsBinaryString(f);
  }

  function handleFile(f: File) {
    setFile(f);
    setColumns([]);
    setNameCol("");
    setQtyCol("");
    parseColumns(f);
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
  // handleFile is defined inline and stable — no re-creation needed
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function upload() {
    if (!file || !nameCol || !qtyCol) return;
    setUploading(true);

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

    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);

    if (data.duplicateWarning) {
      const ok = confirm(
        `This exact file was already applied on ${new Date(data.duplicateDate).toLocaleDateString()}.\nApplying again will double-${batchType === "sale" ? "subtract" : "add"}. Continue?`
      );
      if (!ok) return;
    }

    router.push(`/batches/${data.batch._id}`);
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-bold mb-4">Upload Report</h1>

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
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${drag ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            {file ? (
              <p className="text-sm font-medium text-green-700">{file.name}</p>
            ) : (
              <p className="text-sm text-gray-400">Drop xlsx / csv here or click to browse</p>
            )}
          </div>

          {columns.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1">Report type</Label>
                  <Select value={batchType} onValueChange={(v) => setBatchType(v as "sale" | "purchase")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sale">Sale (subtract stock)</SelectItem>
                      <SelectItem value="purchase">Purchase (add stock)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-1">Source / label</Label>
                  <Input placeholder="e.g. Shopify export" value={source} onChange={(e) => setSource(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1">Product name column</Label>
                  <Select value={nameCol} onValueChange={(v) => setNameCol(v ?? "")}>
                    <SelectTrigger><SelectValue placeholder="Pick column" /></SelectTrigger>
                    <SelectContent>
                      {columns.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-1">Quantity column</Label>
                  <Select value={qtyCol} onValueChange={(v) => setQtyCol(v ?? "")}>
                    <SelectTrigger><SelectValue placeholder="Pick column" /></SelectTrigger>
                    <SelectContent>
                      {columns.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="saveT" checked={saveTemplate} onChange={(e) => setSaveTemplate(e.target.checked)} />
                <Label htmlFor="saveT" className="text-xs cursor-pointer">Save as template</Label>
                {saveTemplate && (
                  <Input placeholder="Template name" value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)} className="flex-1 h-7 text-xs" />
                )}
              </div>
            </>
          )}

          <Button className="w-full" onClick={upload} disabled={!file || !nameCol || !qtyCol || uploading}>
            {uploading ? "Parsing…" : "Parse & Preview →"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
