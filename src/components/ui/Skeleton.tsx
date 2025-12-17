import { cn } from "../../lib/utils";

export const Skeleton = ({ className }: { className?: string }) => {
  return (
    <div className={cn("animate-pulse bg-stone-200/60 rounded", className)} />
  );
};
