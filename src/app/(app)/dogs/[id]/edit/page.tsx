import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DogForm } from "@/components/DogForm";

export const dynamic = "force-dynamic";

export default async function EditDogPage({ params }: { params: { id: string } }) {
  const dog = await prisma.dog.findUnique({ where: { id: params.id } });
  if (!dog) notFound();
  const dogs = await prisma.dog.findMany({
    select: { id: true, callName: true, sex: true, registeredName: true },
    orderBy: { callName: "asc" },
  });
  return (
    <div className="space-y-4">
      <div>
        <Link href={`/dogs/${dog.id}`} className="text-sm text-[var(--gold-dark)] hover:underline">← {dog.callName}</Link>
        <h1 className="page-title mt-1">Edit {dog.callName}</h1>
      </div>
      <DogForm dog={dog} dogs={dogs} />
    </div>
  );
}
