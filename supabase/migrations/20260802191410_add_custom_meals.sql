-- Eigene Mahlzeiten: Nutzer stellen mehrere Lebensmittel (aus Suche/eigenen
-- Lebensmitteln) mit je einer Grammzahl zu einer benannten Mahlzeit zusammen.
-- "items" speichert die einzelnen Zutaten als Snapshot (Name/Menge/Makros zum
-- Zeitpunkt des Speicherns), die übrigen Spalten die bereits aufsummierten
-- Gesamtwerte - so lässt sich die Mahlzeit ohne erneute Berechnung sofort als
-- ein Eintrag ins Tages-Log übernehmen (siehe addCustomMeal/logCustomMeal).
CREATE TABLE custom_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  items jsonb NOT NULL,
  kcal numeric NOT NULL DEFAULT 0,
  protein numeric NOT NULL DEFAULT 0,
  carbs numeric NOT NULL DEFAULT 0,
  fat numeric NOT NULL DEFAULT 0,
  fiber numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE custom_meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutzer lesen eigene Mahlzeiten" ON custom_meals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Nutzer erstellen eigene Mahlzeiten" ON custom_meals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Nutzer löschen eigene Mahlzeiten" ON custom_meals
  FOR DELETE USING (auth.uid() = user_id);
