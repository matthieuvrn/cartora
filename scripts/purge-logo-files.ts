import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

/**
 * Vide le bucket `restaurant-logos` via la Storage API (service-role) — le seul chemin
 * sanctionné, Supabase bloquant tout DELETE direct sur `storage.objects`.
 *
 * Complément de `supabase/sql/082_purge_existing_logos.sql` (qui nettoie la base :
 * `restaurants.logo_path` + snapshots). One-off pour repartir d'une table rase de logos
 * de test — idempotent (relançable sans risque). N'affecte PAS la base.
 */
const BUCKET = "restaurant-logos";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquant(s)");
    process.exit(1);
  }

  const client = createClient(url, serviceKey);
  const storage = client.storage.from(BUCKET);

  // Le layout est `<restaurantId>/logo.<ext>` : on liste la racine (dossiers = id=null),
  // puis le contenu de chaque dossier, et on retire tous les chemins collectés.
  const { data: roots, error: rootError } = await storage.list("", { limit: 1000 });
  if (rootError) {
    console.error("Échec du listing racine:", rootError.message);
    process.exit(1);
  }

  const paths: string[] = [];
  for (const entry of roots ?? []) {
    if (entry.id === null) {
      const { data: files, error } = await storage.list(entry.name, { limit: 1000 });
      if (error) {
        console.error(`Échec du listing de ${entry.name}:`, error.message);
        process.exit(1);
      }
      for (const file of files ?? []) paths.push(`${entry.name}/${file.name}`);
    } else {
      paths.push(entry.name);
    }
  }

  if (paths.length === 0) {
    console.log("Bucket restaurant-logos déjà vide — rien à supprimer.");
    return;
  }

  const { error: removeError } = await storage.remove(paths);
  if (removeError) {
    console.error("Échec de la suppression:", removeError.message);
    process.exit(1);
  }

  console.log(`Supprimé ${paths.length} fichier(s) du bucket restaurant-logos:`);
  for (const p of paths) console.log(`  - ${p}`);
}

main();
