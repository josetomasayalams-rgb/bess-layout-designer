import {
  BASE_MAP_STYLES,
  hasPremiumMapProvider,
  isBaseMapStyleAvailable,
  type BaseMapStyleId,
} from "@/data/mapStyles";

type BaseMapSelectorProps = {
  value: BaseMapStyleId;
  onChange: (value: BaseMapStyleId) => void;
  labels: Record<BaseMapStyleId, string>;
  unavailableLabel: string;
};

export function BaseMapSelector({
  value,
  onChange,
  labels,
  unavailableLabel,
}: BaseMapSelectorProps) {
  const hasPremiumProvider = hasPremiumMapProvider();

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950/90 p-1.5 text-xs text-slate-200 shadow-lg backdrop-blur">
      <div className="grid grid-cols-3 gap-1">
        {BASE_MAP_STYLES.map((style) => {
          const isAvailable = isBaseMapStyleAvailable(style.id);
          const isSelected = value === style.id;

          return (
            <button
              key={style.id}
              type="button"
              className={[
                "h-8 rounded-md border px-2 font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400",
                isSelected
                  ? "border-cyan-300 bg-cyan-300 text-slate-950"
                  : "border-slate-700 bg-slate-900/80 text-slate-200 hover:border-cyan-400 hover:text-cyan-100",
                isAvailable ? "" : "cursor-not-allowed opacity-45",
              ].join(" ")}
              disabled={!isAvailable}
              onClick={() => onChange(style.id)}
              title={
                !isAvailable && !hasPremiumProvider
                  ? unavailableLabel
                  : labels[style.id]
              }
            >
              {labels[style.id]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
