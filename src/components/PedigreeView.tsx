"use client";

import Link from "next/link";
import { PedigreeTree } from "@/lib/coi";

function Node({ node, empty }: { node: PedigreeTree; empty?: boolean }) {
  if (!node || empty) {
    return <div className="ped-node opacity-40">Unknown</div>;
  }
  return (
    <Link
      href={`/dogs/${node.id}`}
      className={`ped-node block hover:border-[var(--gold)] ${node.sex === "MALE" ? "male" : "female"}`}
      title={node.registeredName}
    >
      <div className="font-semibold text-[var(--brown)]">{node.callName}</div>
      <div className="truncate text-[10px] text-[var(--muted)]">{node.registeredName}</div>
      <div className="text-[10px] text-[var(--muted)]">{node.sex === "MALE" ? "♂" : "♀"}</div>
    </Link>
  );
}

function GenColumn({
  nodes,
  label,
}: {
  nodes: PedigreeTree[];
  label: string;
}) {
  return (
    <div className="flex flex-col justify-around gap-2">
      <div className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </div>
      {nodes.map((n, i) => (
        <Node key={i} node={n} />
      ))}
    </div>
  );
}

function collectGen(root: PedigreeTree, depth: number): PedigreeTree[] {
  if (depth === 0) return [root];
  const prev = collectGen(root, depth - 1);
  const next: PedigreeTree[] = [];
  for (const n of prev) {
    next.push(n?.father ?? null);
    next.push(n?.mother ?? null);
  }
  return next;
}

export function PedigreeView({ tree, generations = 3 }: { tree: PedigreeTree; generations?: number }) {
  if (!tree) {
    return <p className="text-sm text-[var(--muted)]">No pedigree data.</p>;
  }
  const gens = Math.min(Math.max(generations, 1), 4);
  const columns = Array.from({ length: gens + 1 }, (_, i) => collectGen(tree, i));
  const labels = ["Dog", "Parents", "Grandparents", "Great-grandparents", "Gen 4"];

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex min-w-full gap-4 p-2">
        {columns.map((nodes, i) => (
          <GenColumn key={i} nodes={nodes} label={labels[i] || `Gen ${i}`} />
        ))}
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]">
        Blue edge = male · Pink edge = female · Click a dog to open their record. Pedigree updates when
        mother/father links change.
      </p>
    </div>
  );
}
