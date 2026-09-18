"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DOG_STATUSES, toInputDate } from "@/lib/utils";

type DogOption = { id: string; callName: string; sex: string; registeredName: string };

type Dog = {
  id?: string;
  registeredName: string;
  callName: string;
  sex: string;
  breed: string;
  dateOfBirth?: string | Date | null;
  status: string;
  microchip?: string | null;
  registration?: string | null;
  notes?: string | null;
  motherId?: string | null;
  fatherId?: string | null;
  photoPath?: string | null;
};

export function DogForm({ dog, dogs }: { dog?: Dog; dogs: DogOption[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const females = dogs.filter((d) => d.sex === "FEMALE" && d.id !== dog?.id);
  const males = dogs.filter((d) => d.sex === "MALE" && d.id !== dog?.id);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const url = dog?.id ? `/api/dogs/${dog.id}` : "/api/dogs";
    const method = dog?.id ? "PUT" : "POST";
    const res = await fetch(url, { method, body: form });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Save failed");
      return;
    }
    const saved = await res.json();
    router.push(`/dogs/${saved.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4" encType="multipart/form-data">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Registered name</label>
          <input name="registeredName" className="input" required defaultValue={dog?.registeredName || ""} />
        </div>
        <div>
          <label className="label">Call name</label>
          <input name="callName" className="input" required defaultValue={dog?.callName || ""} />
        </div>
        <div>
          <label className="label">Sex</label>
          <select name="sex" className="input" defaultValue={dog?.sex || "FEMALE"}>
            <option value="FEMALE">Female</option>
            <option value="MALE">Male</option>
          </select>
        </div>
        <div>
          <label className="label">Breed</label>
          <input name="breed" className="input" required defaultValue={dog?.breed || "Mini Golden Doodle"} />
        </div>
        <div>
          <label className="label">Date of birth</label>
          <input name="dateOfBirth" type="date" className="input" defaultValue={toInputDate(dog?.dateOfBirth)} />
        </div>
        <div>
          <label className="label">Status</label>
          <select name="status" className="input" defaultValue={dog?.status || "ACTIVE"}>
            {DOG_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Microchip</label>
          <input name="microchip" className="input" defaultValue={dog?.microchip || ""} />
        </div>
        <div>
          <label className="label">Registration #</label>
          <input name="registration" className="input" defaultValue={dog?.registration || ""} />
        </div>
        <div>
          <label className="label">Mother</label>
          <select name="motherId" className="input" defaultValue={dog?.motherId || ""}>
            <option value="">— Unknown —</option>
            {females.map((d) => (
              <option key={d.id} value={d.id}>{d.callName} ({d.registeredName})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Father</label>
          <select name="fatherId" className="input" defaultValue={dog?.fatherId || ""}>
            <option value="">— Unknown —</option>
            {males.map((d) => (
              <option key={d.id} value={d.id}>{d.callName} ({d.registeredName})</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label">Photo</label>
          <input name="photo" type="file" accept="image/*" className="input" />
          {dog?.photoPath && <p className="mt-1 text-xs text-[var(--muted)]">Current: {dog.photoPath}</p>}
        </div>
        <div className="sm:col-span-2">
          <label className="label">Notes</label>
          <textarea name="notes" rows={3} className="input" defaultValue={dog?.notes || ""} />
        </div>
      </div>
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Saving…" : "Save dog"}</button>
        <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancel</button>
      </div>
    </form>
  );
}
