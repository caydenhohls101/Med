import { createServiceClient } from "@/lib/supabase/service";
import { Navbar } from "@/components/navbar";
import { BrowseClient } from "./browse-client";

export default async function BrowsePage() {
  const supabase = createServiceClient();

  const { data } = await supabase
    .from("practices")
    .select("id, name, slug, suburb, city, province, phone, address_line1, latitude, longitude")
    .order("name");

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />
      <BrowseClient practices={data ?? []} />
    </div>
  );
}
