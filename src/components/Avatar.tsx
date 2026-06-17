import { avatarColor, initials } from "@/lib/format";

export function Avatar({
  id,
  name,
  size = "md",
  dimmed = false,
}: {
  id: string;
  name: string;
  size?: "sm" | "md";
  dimmed?: boolean;
}) {
  const sizeCls = size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs";
  return (
    <span
      title={name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-black/20 ${avatarColor(
        id,
      )} ${sizeCls} ${dimmed ? "opacity-40 grayscale" : ""}`}
    >
      {initials(name)}
    </span>
  );
}
