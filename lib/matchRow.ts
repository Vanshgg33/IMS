import Variant from "@/models/Variant";
import { normalizeName } from "@/lib/normalize";
import stringSimilarity from "string-similarity";

export interface MatchIndex {
  variants: any[];
  exact: Map<string, string>;
}

export async function buildIndex(): Promise<MatchIndex> {
  const variants = await Variant.find({ active: true }).lean();
  const exact = new Map<string, string>();
  for (const v of variants) {
    exact.set(v.nameKey, String(v._id));
    for (const a of v.aliases || []) exact.set(a.key, String(v._id));
  }
  return { variants, exact };
}

export function matchName(rawName: string, index: MatchIndex) {
  const key = normalizeName(rawName);

  if (index.exact.has(key)) {
    return { status: "matched", matchType: "exact", variantId: index.exact.get(key)! };
  }

  const candidateKeys = index.variants.map((v) => v.nameKey);
  if (candidateKeys.length === 0) return { status: "unmatched", suggestions: [] };

  const { ratings } = stringSimilarity.findBestMatch(key, candidateKeys);
  const top = ratings
    .filter((r) => r.rating >= 0.4)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3)
    .map((r) => {
      const v = index.variants.find((vv) => vv.nameKey === r.target);
      return { variantId: String(v._id), nameCanonical: v.nameCanonical, score: r.rating };
    });

  return { status: "unmatched", suggestions: top };
}
