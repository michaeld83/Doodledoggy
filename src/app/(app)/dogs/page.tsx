import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BREED_TYPES, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function DogsPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string; breed?: string };
}) {
  const status = searchParams.status;
  const breed = searchParams.breed;
  const q = searchParams.q?.trim();
  const dogs = await prisma.dog.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(breed ? { breed } : {}),
      ...(q
        ? {
            OR: [
              { callName: { contains: q } },
              { registeredName: { contains: q } },
              { breed: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: [{ status: "asc" }, { callName: "asc" }],
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Dogs</h1>
          <p className="text-sm text-[var(--muted)]">{dogs.length} records</p>
        </div>
        <Link href="/dogs/new" className="btn-primary">Add dog</Link>
      </div>

      <form className="card flex flex-wrap gap-3">
        <input name="q" className="input max-w-xs" placeholder="Search name or breed" defaultValue={q || ""} />
        <select name="status" className="input max-w-[10rem]" defaultValue={status || ""}>
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="RETIRED">Retired</option>
          <option value="DECEASED">Deceased</option>
          <option value="SOLD">Sold</option>
        </select>
        <select name="breed" className="input max-w-[14rem]" defaultValue={breed || ""}>
          <option value="">All breeds</option>
          {BREED_TYPES.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        <button type="submit" className="btn-secondary">Filter</button>
      </form>

      <div className="table-wrap bg-white">
        <table className="data">
          <thead>
            <tr>
              <th>Call name</th>
              <th>Registered</th>
              <th>Sex</th>
              <th>Breed</th>
              <th>DOB</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {dogs.map((d) => (
              <tr key={d.id}>
                <td>
                  <Link href={`/dogs/${d.id}`} className="font-medium text-[var(--brown)] hover:underline">
                    {d.callName}
                  </Link>
                </td>
                <td className="text-[var(--muted)]">{d.registeredName}</td>
                <td>{d.sex === "MALE" ? "♂ Male" : "♀ Female"}</td>
                <td>{d.breed}</td>
                <td>{formatDate(d.dateOfBirth)}</td>
                <td><StatusBadge status={d.status} /></td>
              </tr>
            ))}
            {dogs.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-[var(--muted)]">No dogs found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
