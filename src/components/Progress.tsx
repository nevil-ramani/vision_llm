import React from 'react';

function formatBytes(size: number): string {
  const i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
  return (
    +(size / Math.pow(1024, i)).toFixed(2) * 1 +
    ["B", "kB", "MB", "GB", "TB"][i]
  );
}

interface ProgressProps {
  text: string;
  percentage?: number;
  total?: number;
}

export default function Progress({ text, percentage, total }: ProgressProps) {
  const gradientFrom = "from-blue-300";
  const gradientTo = "to-purple-400";
  percentage ??= 0;
  
  return (
    <div className="p-2 relative">
      <div className="w-full bg-gray-100 dark:bg-gray-700 text-left rounded-full overflow-hidden mb-0.5">
        <div
          className={`bg-gradient-to-r ${gradientFrom} ${gradientTo} text-zinc-900 whitespace-nowrap px-2 py-1 text-sm rounded-full`}
          style={{ width: `${percentage}%` }}
        >
          <div className="flex items-center justify-between w-full">
            <div className="font-medium text-sm text-zinc-800">{text}</div>
            <div className="text-xs font-semibold ml-4 text-zinc-800">
              {percentage.toFixed(1)}%
              {total !== undefined && !isNaN(total) && (
                <span className="ml-1 text-zinc-800">
                  of {formatBytes(total)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}