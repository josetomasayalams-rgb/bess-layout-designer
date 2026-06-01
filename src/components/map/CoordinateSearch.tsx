import { FormEvent, useState } from "react";
import { Search } from "lucide-react";
import { parseLatLng } from "@/lib/geometry/parseCoordinate";

type CoordinateSearchProps = {
  placeholder: string;
  submitTitle: string;
  invalidMessage: string;
  onSearch: (coordinates: { lat: number; lng: number }) => void;
};

export function CoordinateSearch({
  placeholder,
  submitTitle,
  invalidMessage,
  onSearch,
}: CoordinateSearchProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const coordinates = parseLatLng(value);

    if (!coordinates) {
      setError(invalidMessage);
      return;
    }

    setError(null);
    onSearch(coordinates);
  };

  return (
    <form
      className="relative flex h-11 w-[min(340px,calc(100vw-96px))] items-center gap-1 rounded-lg border border-slate-700 bg-slate-950/90 p-1.5 text-xs text-slate-200 shadow-lg backdrop-blur"
      onSubmit={handleSubmit}
    >
      <input
        className="h-8 min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-900/80 px-2 font-mono text-xs text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        inputMode="decimal"
        aria-invalid={Boolean(error)}
      />
      <button
        type="submit"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-700 bg-slate-900/80 text-slate-200 transition hover:border-cyan-400 hover:text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
        title={submitTitle}
      >
        <Search className="h-4 w-4" aria-hidden="true" />
      </button>
      {error ? (
        <div className="absolute left-0 top-12 rounded-md border border-amber-700 bg-slate-950 px-2 py-1 text-[11px] text-amber-100 shadow-lg">
          {error}
        </div>
      ) : null}
    </form>
  );
}
