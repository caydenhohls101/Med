"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { VerifyToggle } from "./practices/verify-toggle";

interface Practice {
  id: string; name: string; slug: string; city: string; province: string;
  email: string; phone: string; created_at: string; is_verified: boolean;
  subscription_status: string; subscription_plan: string;
  latitude: number | null; longitude: number | null;
}
interface Patient {
  id: string; first_name: string; last_name: string; email: string | null;
  mobile: string; created_at: string;
  practices: { name: string; slug: string } | null;
}
interface Booking {
  id: string; starts_at: string; status: string; reference_number: string; created_at: string;
  doctors: { full_name: string; title: string } | null;
  patients: { first_name: string; last_name: string } | null;
  services: { name: string } | null;
  practices: { name: string; slug: string } | null;
}

const STATUS_COLOR: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  confirmed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  cancelled: "bg-gray-100  text-gray-500  dark:bg-gray-800     dark:text-gray-400",
  completed: "bg-blue-100  text-blue-800  dark:bg-blue-900/30  dark:text-blue-300",
  no_show:   "bg-red-100   text-red-700   dark:bg-red-900/30   dark:text-red-400",
};

const SA_PROVINCES = [
  "Gauteng","Western Cape","KwaZulu-Natal","Eastern Cape",
  "Free State","Limpopo","Mpumalanga","North West","Northern Cape",
];

function FilterBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-2 items-center p-3 bg-muted/20 rounded-xl border mb-0">
      {children}
    </div>
  );
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative flex-1 min-w-[180px]">
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">🔍</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-7 pr-7 py-1.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {value && (
        <button onClick={() => onChange("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs">✕</button>
      )}
    </div>
  );
}

function SelectFilter({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void;
  options: { label: string; value: string }[]; placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm border rounded-lg px-2.5 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary text-muted-foreground"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function ResultCount({ filtered, total, label }: { filtered: number; total: number; label: string }) {
  return (
    <span className="text-xs text-muted-foreground ml-auto">
      {filtered < total ? `${filtered} of ${total}` : total} {label}
    </span>
  );
}

export function AdminOverview({ practices, patients, bookings }: {
  practices: Practice[];
  patients: Patient[];
  bookings: Booking[];
}) {
  // Practices filters
  const [pSearch, setPSearch]     = useState("");
  const [pVerified, setPVerified] = useState("");
  const [pProvince, setPProvince] = useState("");

  // Patients filters
  const [patSearch, setPatSearch]     = useState("");
  const [patPractice, setPatPractice] = useState("");

  // Bookings filters
  const [bStatus, setBStatus]     = useState("");
  const [bPractice, setBPractice] = useState("");
  const [bSearch, setBSearch]     = useState("");

  const filteredPractices = useMemo(() => practices.filter((p) => {
    const q = pSearch.toLowerCase();
    if (q && !p.name.toLowerCase().includes(q) && !p.city.toLowerCase().includes(q)) return false;
    if (pVerified === "verified" && !p.is_verified) return false;
    if (pVerified === "unverified" && p.is_verified) return false;
    if (pProvince && p.province !== pProvince) return false;
    return true;
  }), [practices, pSearch, pVerified, pProvince]);

  const filteredPatients = useMemo(() => patients.filter((p) => {
    const q = patSearch.toLowerCase();
    const prac = p.practices as { name: string; slug: string } | null;
    if (q && !`${p.first_name} ${p.last_name}`.toLowerCase().includes(q) && !(p.email ?? "").toLowerCase().includes(q)) return false;
    if (patPractice && prac?.slug !== patPractice) return false;
    return true;
  }), [patients, patSearch, patPractice]);

  const filteredBookings = useMemo(() => bookings.filter((b) => {
    const prac = b.practices as { name: string; slug: string } | null;
    const pat  = b.patients  as { first_name: string; last_name: string } | null;
    const q    = bSearch.toLowerCase();
    if (q && !b.reference_number.toLowerCase().includes(q) && !`${pat?.first_name} ${pat?.last_name}`.toLowerCase().includes(q)) return false;
    if (bStatus   && b.status !== bStatus) return false;
    if (bPractice && prac?.slug !== bPractice) return false;
    return true;
  }), [bookings, bSearch, bStatus, bPractice]);

  const practiceOptions = practices.map((p) => ({ label: p.name, value: p.slug }));

  return (
    <div className="space-y-10">

      {/* ── PRACTICES ── */}
      <section id="practices" className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-bold">Practices</h2>
          <Link href="/admin/prospects" className="text-xs text-primary hover:underline glass-btn px-3 py-1.5 rounded-lg border">
            + Find new prospects
          </Link>
        </div>

        <FilterBar>
          <SearchInput value={pSearch} onChange={setPSearch} placeholder="Search name or city…" />
          <SelectFilter value={pVerified} onChange={setPVerified} placeholder="All verification"
            options={[{ label: "✅ Verified", value: "verified" }, { label: "⚠️ Unverified", value: "unverified" }]} />
          <SelectFilter value={pProvince} onChange={setPProvince} placeholder="All provinces"
            options={SA_PROVINCES.map((p) => ({ label: p, value: p }))} />
          {(pSearch || pVerified || pProvince) && (
            <button onClick={() => { setPSearch(""); setPVerified(""); setPProvince(""); }}
              className="text-xs text-destructive hover:underline">Clear</button>
          )}
          <ResultCount filtered={filteredPractices.length} total={practices.length} label="practices" />
        </FilterBar>

        <div className="bg-background rounded-2xl border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/20">
                  {["Practice","Location","Plan","Verified","Map","Joined","Actions"].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPractices.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">/book/{p.slug}</div>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">{p.city}, {p.province}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold capitalize ${
                        p.subscription_status === "active" ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"
                      }`}>{p.subscription_plan ?? "starter"}</span>
                    </td>
                    <td className="py-3 px-4"><VerifyToggle practiceId={p.id} isVerified={p.is_verified} /></td>
                    <td className="py-3 px-4 text-xs">
                      {p.latitude ? <span className="text-green-600 font-medium">✓ On map</span> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {p.created_at ? format(new Date(p.created_at), "d MMM yyyy") : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-3">
                        <Link href={`/browse/${p.slug}`} className="text-xs text-primary hover:underline">View</Link>
                        <Link href={`/admin/practices/${p.slug}`} className="text-xs text-muted-foreground hover:text-foreground hover:underline">Details</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredPractices.length === 0 && (
              <div className="p-10 text-center text-muted-foreground text-sm">No practices match your filters.</div>
            )}
          </div>
        </div>
      </section>

      {/* ── PATIENTS ── */}
      <section id="patients" className="space-y-3">
        <h2 className="text-lg font-bold">Patients</h2>

        <FilterBar>
          <SearchInput value={patSearch} onChange={setPatSearch} placeholder="Search name or email…" />
          <SelectFilter value={patPractice} onChange={setPatPractice} placeholder="All practices"
            options={practiceOptions} />
          {(patSearch || patPractice) && (
            <button onClick={() => { setPatSearch(""); setPatPractice(""); }}
              className="text-xs text-destructive hover:underline">Clear</button>
          )}
          <ResultCount filtered={filteredPatients.length} total={patients.length} label="patients" />
        </FilterBar>

        <div className="bg-background rounded-2xl border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/20">
                  {["Patient","Email","Mobile","Practice","Registered","Actions"].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((p) => {
                  const practice = p.practices as { name: string; slug: string } | null;
                  return (
                    <tr key={p.id} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-semibold">{p.first_name} {p.last_name}</td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">{p.email ?? "—"}</td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">{p.mobile}</td>
                      <td className="py-3 px-4 text-xs">
                        {practice
                          ? <Link href={`/browse/${practice.slug}`} className="text-primary hover:underline">{practice.name}</Link>
                          : "—"}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {p.created_at ? format(new Date(p.created_at), "d MMM yyyy") : "—"}
                      </td>
                      <td className="py-3 px-4">
                        <Link href={`/admin/patients/${p.id}`} className="text-xs text-primary hover:underline">View bookings</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredPatients.length === 0 && (
              <div className="p-10 text-center text-muted-foreground text-sm">No patients match your filters.</div>
            )}
          </div>
        </div>
      </section>

      {/* ── BOOKINGS ── */}
      <section id="bookings" className="space-y-3">
        <h2 className="text-lg font-bold">Recent Bookings</h2>

        <FilterBar>
          <SearchInput value={bSearch} onChange={setBSearch} placeholder="Search patient or ref…" />
          <SelectFilter value={bStatus} onChange={setBStatus} placeholder="All statuses"
            options={[
              { label: "⏳ Pending",   value: "pending"   },
              { label: "✅ Confirmed", value: "confirmed" },
              { label: "✓ Completed", value: "completed" },
              { label: "✕ Cancelled", value: "cancelled" },
              { label: "👻 No Show",  value: "no_show"   },
            ]} />
          <SelectFilter value={bPractice} onChange={setBPractice} placeholder="All practices"
            options={practiceOptions} />
          {(bSearch || bStatus || bPractice) && (
            <button onClick={() => { setBSearch(""); setBStatus(""); setBPractice(""); }}
              className="text-xs text-destructive hover:underline">Clear</button>
          )}
          <ResultCount filtered={filteredBookings.length} total={bookings.length} label="bookings" />
        </FilterBar>

        <div className="bg-background rounded-2xl border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/20">
                  {["Ref","Patient","Practice","Doctor","Service","Date","Booked","Status"].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => {
                  const pat  = b.patients  as { first_name: string; last_name: string } | null;
                  const doc  = b.doctors   as { full_name: string; title: string } | null;
                  const svc  = b.services  as { name: string } | null;
                  const prc  = b.practices as { name: string; slug: string } | null;
                  return (
                    <tr key={b.id} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{b.reference_number}</td>
                      <td className="py-3 px-4 font-medium text-sm">{pat?.first_name} {pat?.last_name}</td>
                      <td className="py-3 px-4 text-xs">
                        {prc ? <Link href={`/browse/${prc.slug}`} className="text-primary hover:underline">{prc.name}</Link> : "—"}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">{doc?.title} {doc?.full_name}</td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">{svc?.name}</td>
                      <td className="py-3 px-4 text-xs font-mono">
                        <div>{format(new Date(b.starts_at), "d MMM yyyy")}</div>
                        <div className="text-muted-foreground">{format(new Date(b.starts_at), "HH:mm")}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {b.created_at ? format(new Date(b.created_at), "d MMM") : "—"}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold capitalize ${STATUS_COLOR[b.status] ?? "bg-muted text-muted-foreground"}`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredBookings.length === 0 && (
              <div className="p-10 text-center text-muted-foreground text-sm">No bookings match your filters.</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
