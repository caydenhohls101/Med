import { unstable_cache } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { Navbar } from "@/components/navbar";
import { BrowseClient } from "./browse-client";

const getPractices = unstable_cache(
  async () => {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("practices")
      .select("id, name, slug, suburb, city, province, phone, address_line1, latitude, longitude")
      .order("name");
    return data ?? [];
  },
  ["practices-list"],
  { revalidate: 60 },
);

export default async function BrowsePage() {
  const practices = await getPractices();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />
      <BrowseClient practices={practices} />
    </div>
  );
}
