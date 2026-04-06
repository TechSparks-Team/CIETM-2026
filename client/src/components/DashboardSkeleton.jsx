import React from 'react';

const Skeleton = ({ className }) => (
  <div className={`skeleton ${className}`}></div>
);

const DashboardSkeleton = () => {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar Skeleton */}
      <aside className="hidden lg:flex w-[280px] bg-white border-r border-slate-100 flex-col p-8 space-y-8">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <Skeleton className="h-6 w-32 rounded-lg" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
        <div className="mt-auto space-y-4">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </aside>

      {/* Main Content Skeleton */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header Skeleton */}
        <header className="h-20 bg-white border-b border-slate-200 px-4 md:px-10 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
             <Skeleton className="lg:hidden w-9 h-9 rounded-xl" />
             <div className="flex flex-col gap-1.5 md:gap-2">
               <Skeleton className="h-5 md:h-7 w-24 md:w-48 rounded-lg" />
               <Skeleton className="hidden md:block h-3 w-32 rounded-lg" />
             </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <Skeleton className="h-8 md:h-10 w-20 md:w-32 rounded-xl" />
            <Skeleton className="w-8 h-8 md:w-10 md:h-10 rounded-xl" />
            <Skeleton className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-full" />
          </div>
        </header>

        {/* Content Skeleton */}
        <div className="flex-1 p-4 md:p-10 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6 md:space-y-10">
            {/* Top Stats/Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-28 md:h-32 rounded-[1.5rem] md:rounded-[2rem]" />
              ))}
            </div>

            {/* Main Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
              <Skeleton className="lg:col-span-2 h-[350px] md:h-[500px] rounded-[1.5rem] md:rounded-[2.5rem]" />
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 lg:space-y-8">
                <Skeleton className="h-[200px] md:h-[240px] rounded-[1.5rem] md:rounded-[2.5rem]" />
                <Skeleton className="h-[200px] md:h-[230px] rounded-[1.5rem] md:rounded-[2.5rem]" />
              </div>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .skeleton {
          background: linear-gradient(90deg, #f1f5f9 25%, #f8fafc 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite linear;
        }
      `}</style>
    </div>
  );
};

export default DashboardSkeleton;
