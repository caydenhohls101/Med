"use client";

import dynamic from "next/dynamic";
import type { MapPractice } from "@/components/map/practice-map";

const PracticeMap = dynamic(
  () => import("@/components/map/practice-map").then((m) => m.PracticeMap),
  {
    ssr: false,
    loading: () => <div className="bg-muted animate-pulse h-48 rounded-lg" />,
  }
);

export function DetailMap({ practice }: { practice: MapPractice }) {
  return (
    <PracticeMap
      practices={[practice]}
      center={[practice.latitude, practice.longitude]}
      zoom={15}
      height="240px"
      singleMarker
    />
  );
}
