"use client";

import { useState } from "react";

type ProductOption = { id: string; label: string };

export default function POItemsField({
  products,
  initial,
}: {
  products: ProductOption[];
  initial?: { productId: string; qtyCtn: number }[];
}) {
  const [rows, setRows] = useState<{ productId: string; qtyCtn: number }[]>(
    initial && initial.length > 0 ? initial : [{ productId: products[0]?.id ?? "", qtyCtn: 0 }]
  );

  function updateRow(idx: number, patch: Partial<{ productId: string; qtyCtn: number }>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  return (
    <div className="space-y-2">
      <label className="label">Product Lines (SKU / Product / Size, quantity in CTN)</label>
      {rows.map((row, idx) => (
        <div key={idx} className="flex gap-2">
          <select
            name={`productId_${idx}`}
            className="input"
            value={row.productId}
            onChange={(e) => updateRow(idx, { productId: e.target.value })}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <input
            name={`qtyCtn_${idx}`}
            type="number"
            min="0"
            step="1"
            className="input w-32"
            placeholder="CTN"
            value={row.qtyCtn || ""}
            onChange={(e) => updateRow(idx, { qtyCtn: Number(e.target.value) })}
          />
          {rows.length > 1 && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setRows((prev) => prev.filter((_, i) => i !== idx))}
            >
              Remove
            </button>
          )}
        </div>
      ))}
      <input type="hidden" name="lineCount" value={rows.length} />
      <button
        type="button"
        className="btn-secondary text-xs"
        onClick={() => setRows((prev) => [...prev, { productId: products[0]?.id ?? "", qtyCtn: 0 }])}
      >
        + Add line
      </button>
    </div>
  );
}
