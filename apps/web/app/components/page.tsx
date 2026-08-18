import type { Metadata } from "next";
import { LabHome } from "@/src/components/LabHome";
import { bento } from "@/src/registry-data";

export const metadata: Metadata = {
  title: "Components",
  description:
    "Motion and interaction components you can customize, extend, and build on. Open any for the live demo and the source you can copy or install with the shadcn CLI.",
  alternates: { canonical: "/components" },
  openGraph: {
    title: "Components | crafterui",
    description:
      "Motion and interaction components you can customize, extend, and build on. Open any for the live demo and installable source.",
    url: "/components",
  },
};

export default function ComponentsPage() {
  return <LabHome bento={bento} />;
}
