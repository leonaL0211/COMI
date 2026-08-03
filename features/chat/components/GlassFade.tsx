type GlassFadeProps = {
  position: "top" | "bottom";
};

export function GlassFade({ position }: GlassFadeProps) {
  if (position === "top") {
    return (
      <div className="glass-fade glass-fade-top" aria-hidden="true">
        <div className="glass-fade-top-mask">
          <div className="glass-fade-top-blur" />
          <div className="glass-fade-top-wash" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`glass-fade glass-fade-${position}`}
      aria-hidden="true"
    />
  );
}
