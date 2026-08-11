type COMIIconProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "master" | "app" | "body";
};

const srcByVariant: Record<NonNullable<COMIIconProps["variant"]>, string> = {
  master: "/comi/comi-master.svg",
  app: "/comi/figma/welcome-comi.png",
  body: "/comi/figma/welcome-comi.png",
};

export function COMIIcon({
  className = "",
  size = "md",
  variant = "master",
}: COMIIconProps) {
  return (
    <span className={["comi-icon", `comi-icon-${size}`, className].join(" ")}>
      <img src={srcByVariant[variant]} alt="" draggable={false} />
    </span>
  );
}
