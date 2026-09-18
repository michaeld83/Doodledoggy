import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildPedigree, dogsToMap } from "@/lib/coi";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { PedigreeView } from "@/components/PedigreeView";
import { HealthForm } from "@/components/HealthForm";
import { DeleteDogButton } from "@/components/DeleteDogButton";

export const dynamic = "force-dynamic";

export default async function DogDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { gens?: string };
}) {
  const dog = await prisma.dog.findUnique({
    where: { id: params.id },
    include: {
      mother: true,
      father: true,
      healthRecords: { orderBy: { recordDate: "desc" } },
    },
  });
  if (!dog) notFound();

  const allDogs = await prisma.dog.findMany({
    select: { id: true, callName: true, registeredName: true, sex: true, motherId: true, fatherId: true },
  });
  const gens = Math.min(4, Math.max(2, Number(searchParams.gens || 3)));
  const tree = buildPedigree(dog.id, dogsToMap(allDogs), gens);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/dogs" className="text-sm text-[var(--gold-dark)] hover:underline">← Dogs</Link>
          <h1 className="page-title mt-1">{dog.callName}</h1>
          <p className="text-sm text-[var(--muted)]">{dog.registeredName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/dogs/${dog.id}/edit`} className="btn-primary">Edit</Link>
          <DeleteDogButton id={dog.id} name={dog.callName} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          {dog.photoPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dog.photoPath} alt={dog.callName} className="mb-4 h-48 w-full rounded-lg object-cover" />
          ) : (
            <div className="mb-4 flex h-48 items-center justify-center rounded-lg bg-[var(--cream-dark)] text-[var(--muted)]">
              No photo
            </div>
          )}
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-2"><dt className="text-[var(--muted)]">Sex</dt><dd>{dog.sex}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-[var(--muted)]">Breed</dt><dd>{dog.breed}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-[var(--muted)]">DOB</dt><dd>{formatDate(dog.dateOfBirth)}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-[var(--muted)]">Status</dt><dd><StatusBadge status={dog.status} /></dd></div>
            <div className="flex justify-between gap-2"><dt className="text-[var(--muted)]">Microchip</dt><dd>{dog.microchip || "—"}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-[var(--muted)]">Registration</dt><dd>{dog.registration || "—"}</dd></div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--muted)]">Mother</dt>
              <dd>{dog.mother ? <Link className="hover:underline" href={`/dogs/${dog.mother.id}`}>{dog.mother.callName}</Link> : "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--muted)]">Father</dt>
              <dd>{dog.father ? <Link className="hover:underline" href={`/dogs/${dog.father.id}`}>{dog.father.callName}</Link> : "—"}</dd>
            </div>
          </dl>
          {dog.notes && (
            <div className="mt-4 border-t pt-3 text-sm" style={{ borderColor: "var(--border)" }}>
              <div className="label">Notes</div>
              <p className="whitespace-pre-wrap">{dog.notes}</p>
            </div>
          )}
        </div>

        <div className="card lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-serif text-lg text-[var(--brown)]">Pedigree</h2>
            <div className="flex gap-1 text-sm">
              {[2, 3, 4].map((g) => (
                <Link
                  key={g}
                  href={`/dogs/${dog.id}?gens=${g}`}
                  className={`rounded px-2 py-1 ${gens === g ? "bg-[var(--gold-soft)]" : "hover:bg-[var(--cream-dark)]"}`}
                >
                  {g + 1} gens
                </Link>
              ))}
            </div>
          </div>
          <PedigreeView tree={tree} generations={gens} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-3 font-serif text-lg text-[var(--brown)]">Health timeline</h2>
          <ol className="relative space-y-4 border-l-2 pl-4" style={{ borderColor: "var(--gold-soft)" }}>
            {dog.healthRecords.map((h) => (
              <li key={h.id} className="relative">
                <span className="absolute -left-[1.4rem] top-1 h-2.5 w-2.5 rounded-full bg-[var(--gold)]" />
                <div className="text-xs text-[var(--muted)]">{formatDate(h.recordDate)}</div>
                <div className="font-medium">{h.title}</div>
                {h.notes && <p className="text-sm text-[var(--brown-soft)]">{h.notes}</p>}
                {h.followUpAt && (
                  <p className="text-xs text-[var(--warn)]">Follow-up: {formatDate(h.followUpAt)}</p>
                )}
                {h.filePath && (
                  <a href={h.filePath} className="text-xs text-[var(--gold-dark)] hover:underline" target="_blank" rel="noreferrer">
                    {h.fileName || "Download file"}
                  </a>
                )}
              </li>
            ))}
            {dog.healthRecords.length === 0 && (
              <li className="text-sm text-[var(--muted)]">No health records yet</li>
            )}
          </ol>
        </section>
        <section className="card">
          <h2 className="mb-3 font-serif text-lg text-[var(--brown)]">Add health / vet file</h2>
          <HealthForm dogId={dog.id} />
        </section>
      </div>
    </div>
  );
}
