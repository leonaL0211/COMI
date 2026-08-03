type GlassFadeProps = {
  position: "top" | "bottom";
};

export function GlassFade({ position }: GlassFadeProps) {
  return (
    <div
      className={`glass-fade glass-fade-${position}`}
      aria-hidden="true"
    />
  );
}
