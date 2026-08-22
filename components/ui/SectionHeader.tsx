interface SectionHeaderProps {
  title: string;
  description?: string;
  align?: "left" | "center";
}

export default function SectionHeader({
  title,
  description,
  align = "left",
}: SectionHeaderProps) {
  return (
    <div className={align === "center" ? "text-center" : "text-left"}>
      <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
        {title}
      </h2>
      {description && (
        <p className="mt-2 max-w-2xl text-muted sm:text-lg">
          {description}
        </p>
      )}
    </div>
  );
}
