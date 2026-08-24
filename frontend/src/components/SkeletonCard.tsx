
export default function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex gap-5">
      {/* Skeleton ring */}
      <div className="w-16 h-16 rounded-full skeleton flex-shrink-0" />

      {/* Skeleton content */}
      <div className="flex-1 space-y-3">
        <div className="skeleton h-5 w-3/4 rounded" />
        <div className="skeleton h-4 w-1/2 rounded" />
        <div className="flex gap-2 mt-2">
          <div className="skeleton h-6 w-20 rounded-md" />
          <div className="skeleton h-6 w-24 rounded-md" />
        </div>
        <div className="flex gap-2 mt-3">
          <div className="skeleton h-6 w-16 rounded-md" />
          <div className="skeleton h-6 w-20 rounded-md" />
        </div>
      </div>
    </div>
  );
}
