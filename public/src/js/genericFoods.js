// ═══════════════════════════════════════════════════════════════════════════
// genericFoods.js
// Fest eingebaute Liste generischer Grundnahrungsmittel (Obst, Gemüse,
// Kohlenhydratquellen, Proteinquellen, Milchprodukte, Nüsse/Fette) mit
// Standard-Nährwerten pro 100g/100ml.
//
// Grund: Open Food Facts ist eine Markenprodukt-Datenbank (jedes Produkt hat
// einen Barcode) und bildet frisches, unverpacktes Obst/Gemüse sowie
// klassische Grundnahrungsmittel kaum bis gar nicht ab - eine Suche nach
// "Birne" fand dort store bestenfalls zufällig ein Produkt, dessen NAME das
// Wort enthält (z.B. "Preiselbeeren mit Birne"), nie die Frucht selbst.
// Diese Liste wird bei der Suche VOR Open Food Facts durchsucht: schneller
// (kein Netzwerk nötig) und für genau diese Fälle zuverlässiger.
// ═══════════════════════════════════════════════════════════════════════════

export const GENERIC_FOODS = [
  // ── Obst ──────────────────────────────────────────────────────────────
  { name: 'Apfel', aliases: ['Äpfel'], per100: { kcal: 52, protein: 0.3, carbs: 14, fat: 0.2 } },
  { name: 'Banane', aliases: ['Bananen'], per100: { kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 } },
  { name: 'Birne', aliases: ['Birnen'], per100: { kcal: 57, protein: 0.4, carbs: 15, fat: 0.1 } },
  { name: 'Orange', aliases: ['Orangen'], per100: { kcal: 47, protein: 0.9, carbs: 12, fat: 0.1 } },
  { name: 'Erdbeeren', per100: { kcal: 32, protein: 0.7, carbs: 8, fat: 0.3 } },
  { name: 'Heidelbeeren', per100: { kcal: 57, protein: 0.7, carbs: 14, fat: 0.3 } },
  { name: 'Weintrauben', per100: { kcal: 69, protein: 0.6, carbs: 18, fat: 0.2 } },
  { name: 'Wassermelone', per100: { kcal: 30, protein: 0.6, carbs: 8, fat: 0.2 } },
  { name: 'Ananas', per100: { kcal: 50, protein: 0.5, carbs: 13, fat: 0.1 } },
  { name: 'Kiwi', aliases: ['Kiwis'], per100: { kcal: 61, protein: 1.1, carbs: 15, fat: 0.5 } },
  { name: 'Mango', per100: { kcal: 60, protein: 0.8, carbs: 15, fat: 0.4 } },
  { name: 'Pfirsich', aliases: ['Pfirsiche'], per100: { kcal: 39, protein: 0.9, carbs: 10, fat: 0.3 } },

  // ── Gemüse ────────────────────────────────────────────────────────────
  { name: 'Brokkoli', per100: { kcal: 34, protein: 2.8, carbs: 7, fat: 0.4 } },
  { name: 'Karotte', aliases: ['Karotten', 'Möhre', 'Möhren'], per100: { kcal: 41, protein: 0.9, carbs: 10, fat: 0.2 } },
  { name: 'Gurke', aliases: ['Gurken'], per100: { kcal: 15, protein: 0.7, carbs: 3.6, fat: 0.1 } },
  { name: 'Tomate', aliases: ['Tomaten'], per100: { kcal: 18, protein: 0.9, carbs: 3.9, fat: 0.2 } },
  { name: 'Paprika (rot)', aliases: ['Paprika'], per100: { kcal: 31, protein: 1, carbs: 6, fat: 0.3 } },
  { name: 'Spinat', per100: { kcal: 23, protein: 2.9, carbs: 3.6, fat: 0.4 } },
  { name: 'Zucchini', per100: { kcal: 17, protein: 1.2, carbs: 3.1, fat: 0.3 } },
  { name: 'Zwiebel', aliases: ['Zwiebeln'], per100: { kcal: 40, protein: 1.1, carbs: 9.3, fat: 0.1 } },
  { name: 'Kartoffel, gekocht', aliases: ['Kartoffel', 'Kartoffeln'], per100: { kcal: 87, protein: 1.9, carbs: 20, fat: 0.1 } },
  { name: 'Süßkartoffel, gekocht', aliases: ['Süßkartoffel', 'Süßkartoffeln'], per100: { kcal: 90, protein: 2, carbs: 21, fat: 0.2 } },
  { name: 'Kopfsalat', aliases: ['Salat'], per100: { kcal: 15, protein: 1.4, carbs: 2.9, fat: 0.2 } },
  { name: 'Blumenkohl', per100: { kcal: 25, protein: 1.9, carbs: 5, fat: 0.3 } },
  { name: 'Champignons', per100: { kcal: 22, protein: 3.1, carbs: 3.3, fat: 0.3 } },

  // ── Kohlenhydratquellen ───────────────────────────────────────────────
  { name: 'Reis, weiß (gekocht)', aliases: ['Reis (gekocht)', 'Reis'], per100: { kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 } },
  { name: 'Reis, braun (gekocht)', aliases: ['Vollkornreis (gekocht)', 'Vollkornreis'], per100: { kcal: 123, protein: 2.6, carbs: 26, fat: 1 } },
  { name: 'Nudeln, gekocht', aliases: ['Nudeln', 'Pasta (gekocht)', 'Pasta'], per100: { kcal: 131, protein: 5, carbs: 25, fat: 1.1 } },
  { name: 'Vollkornbrot', per100: { kcal: 247, protein: 9, carbs: 41, fat: 3.4 } },
  { name: 'Haferflocken', per100: { kcal: 389, protein: 13, carbs: 66, fat: 7 } },
  { name: 'Quinoa, gekocht', aliases: ['Quinoa'], per100: { kcal: 120, protein: 4.4, carbs: 21, fat: 1.9 } },
  { name: 'Couscous, gekocht', aliases: ['Couscous'], per100: { kcal: 112, protein: 3.8, carbs: 23, fat: 0.2 } },

  // ── Proteinquellen ────────────────────────────────────────────────────
  { name: 'Hähnchenbrust, roh', aliases: ['Hähnchenbrust'], per100: { kcal: 120, protein: 22.5, carbs: 0, fat: 2.6 } },
  { name: 'Hähnchenbrust, gekocht', per100: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 } },
  { name: 'Rinderhack, mager (roh)', aliases: ['Rinderhack', 'Rindfleisch'], per100: { kcal: 158, protein: 21, carbs: 0, fat: 8 } },
  { name: 'Lachs, roh', aliases: ['Lachs'], per100: { kcal: 208, protein: 20, carbs: 0, fat: 13 } },
  { name: 'Thunfisch (Dose, Natur)', aliases: ['Thunfisch'], per100: { kcal: 116, protein: 26, carbs: 0, fat: 1 } },
  { name: 'Ei', aliases: ['Eier'], per100: { kcal: 155, protein: 13, carbs: 1.1, fat: 11 } },
  { name: 'Tofu', per100: { kcal: 76, protein: 8, carbs: 1.9, fat: 4.8 } },
  { name: 'Linsen, gekocht', aliases: ['Linsen'], per100: { kcal: 116, protein: 9, carbs: 20, fat: 0.4 } },
  { name: 'Kichererbsen, gekocht', aliases: ['Kichererbsen'], per100: { kcal: 164, protein: 8.9, carbs: 27, fat: 2.6 } },
  { name: 'Kidneybohnen, gekocht', aliases: ['Kidneybohnen'], per100: { kcal: 127, protein: 8.7, carbs: 22.8, fat: 0.5 } },

  // ── Milchprodukte ─────────────────────────────────────────────────────
  { name: 'Magerquark', per100: { kcal: 67, protein: 12, carbs: 4, fat: 0.2 } },
  { name: 'Naturjoghurt', per100: { kcal: 61, protein: 3.5, carbs: 4.7, fat: 3.3 } },
  { name: 'Milch, 1,5%', aliases: ['Milch'], per100: { kcal: 47, protein: 3.4, carbs: 4.9, fat: 1.5 } },
  { name: 'Gouda', aliases: ['Käse'], per100: { kcal: 356, protein: 25, carbs: 2.2, fat: 27 } },
  { name: 'Skyr', per100: { kcal: 63, protein: 11, carbs: 4, fat: 0.2 } },
  { name: 'Hüttenkäse', per100: { kcal: 98, protein: 11, carbs: 3.4, fat: 4.3 } },

  // ── Nüsse & Fette ─────────────────────────────────────────────────────
  { name: 'Mandeln', per100: { kcal: 579, protein: 21, carbs: 22, fat: 50 } },
  { name: 'Walnüsse', per100: { kcal: 654, protein: 15, carbs: 14, fat: 65 } },
  { name: 'Erdnussbutter', per100: { kcal: 588, protein: 25, carbs: 20, fat: 50 } },
  { name: 'Olivenöl', per100: { kcal: 884, protein: 0, carbs: 0, fat: 100 } },
  { name: 'Avocado', per100: { kcal: 160, protein: 2, carbs: 8.5, fat: 14.7 } },

  // ── Sonstiges ─────────────────────────────────────────────────────────
  { name: 'Honig', per100: { kcal: 304, protein: 0.3, carbs: 82, fat: 0 } },
  { name: 'Zucker', per100: { kcal: 400, protein: 0, carbs: 100, fat: 0 } },
];

// Vergleicht Suchbegriff und Name/Alias BEIDSEITIG als Teilstring: deckt so
// sowohl "Tomate" -> "Tomaten" (Name kürzer als Suchbegriff, z.B. Mehrzahl)
// als auch "Tomat" -> "Tomate" (Suchbegriff kürzer, unvollständige Eingabe)
// ab, ohne für jede Wortform einen eigenen Alias pflegen zu müssen.
export function matchesQuery(name, query) {
  const n = name.toLowerCase();
  const q = query.toLowerCase();
  return n.includes(q) || q.includes(n);
}

// Sucht in der generischen Liste; min. 3 Zeichen wie bei der OFF-Suche.
export function searchGenericFoods(query) {
  const q = (query || '').trim();
  if (q.length < 3) return [];

  return GENERIC_FOODS
    .filter((food) => [food.name, ...(food.aliases || [])].some((n) => matchesQuery(n, q)))
    .map((food) => ({
      id: `generic_${food.name.toLowerCase().replace(/[^a-zäöüß0-9]+/g, '_')}`,
      name: food.name,
      brand: 'Generisch',
      imageUrl: null,
      per100: food.per100,
    }));
}
