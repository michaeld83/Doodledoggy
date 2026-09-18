import { prisma } from "@/lib/prisma";
import { DogForm } from "@/components/DogForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function NewDogPage() {
  const dogs = await prisma.dog.findMany({
    select: { id: true, callName: true, sex: true, registeredName: true },
    orderBy: { callName: "asc" },
  });
  return (
    <div className="space-y-4">
      <div>
        <Link href="/dogs" className="text-sm text-[var(--gold-dark)] hover:underline">← Dogs</Link>
        <h1 className="page-title mt-1">Add dog</h1>
      </div>
      <DogForm dogs={dogs} />
    </div>
  );
}
