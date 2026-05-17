import { createServiceClient } from "@/lib/supabase/service";
import { ProspectClient } from "./prospect-client";

export default async function ProspectsPage() {
  const supabase = createServiceClient();

  const [{ data: prospects }, { data: practices }] = await Promise.all([
    supabase
      .from("prospects")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("practices")
      .select("id, name, city, slug, latitude, longitude")
      .not("latitude", "is", null),
  ]);

  return (
    <ProspectClient
      savedProspects={prospects ?? []}
      registeredPractices={(practices ?? []) as {
        id: string; name: string; city: string;
        slug: string; latitude: number; longitude: number;
      }[]}
    />
  );
}
