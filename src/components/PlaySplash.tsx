import { GeometricBird } from "@/components/BrandMark";

export default function PlaySplash({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex h-[100dvh] w-full flex-col items-center justify-center gap-5 bg-[#06161a] px-6 text-white">
      <div className="sf-splash-mark flex flex-col items-center gap-3">
        <GeometricBird width={80} height={64} />
        <p className="font-display text-xl font-bold tracking-tight text-lime-50">
          Squat Flappy
        </p>
      </div>
      <p className="text-sm text-teal-200/70">{label}</p>
    </div>
  );
}
