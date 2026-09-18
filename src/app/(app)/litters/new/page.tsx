import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { LitterForm } from "@/components/LitterForm";

export const dynamic = "force-dynamic";

export default async function NewLitterPage() {
  const dogs = await prisma.dog.findMany({
    where: { status: { in: ["ACTIVE", "RETIRED"] } },
    select: { id: true, callName: true, sex: true },
    orderBy: { callName: "asc" },
  });
  return (
    <div className="space-y-4">
      <div>
        <Link href="/litters" className="text-sm text-[var(--gold-dark)] hover:underline">← Litters</Link>
        <h1 className="page-title mt-1">New litter</h1>
      </div>
      <LitterForm
        females={dogs.filter((d) => d.sex === "FEMALE")}
        males={dogs.filter((d) => d.sex === "MALE")}
      />
    </div>
  );
}
