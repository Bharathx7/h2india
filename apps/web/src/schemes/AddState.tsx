"use client";

import { useRouter } from "next/navigation";

// "Add a state" on Compare states (751:7856).
export function AddState({ options, chosen }: { options: { value: string; name: string }[]; chosen: string[] }) {
  const router = useRouter();
  if (!options.length) return null;
  return (
    <label className="inline-flex">
      <span className="sr-only">Add a state</span>
      <select
        value=""
        onChange={(e) => {
          if (!e.target.value) return;
          const next = [...chosen, e.target.value].map((v) => `s=${v}`).join("&");
          router.push(`/states/compare?${next}`);
        }}
        className="h-8 cursor-pointer rounded-pill border-[1.5px] border-control bg-page px-3 type-label text-secondary hover:border-focus"
      >
        <option value="">Add a state</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
}
