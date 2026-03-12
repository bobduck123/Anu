type ManaraMarkProps = {
  className?: string;
  ringClassName?: string;
};

export default function ManaraMark({ className = 'h-10 w-10', ringClassName = '' }: ManaraMarkProps) {
  return (
    <div
      aria-hidden="true"
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-full ${className}`}
      style={{
        background:
          'radial-gradient(circle at center, rgba(255,237,198,0.98) 0%, rgba(223,155,70,0.92) 22%, rgba(147,92,33,0.84) 38%, rgba(28,42,56,0.96) 68%, rgba(20,28,36,1) 100%)',
        boxShadow: '0 14px 32px rgba(30, 24, 16, 0.18)',
      }}
    >
      <span className={`absolute inset-[16%] rounded-full border border-white/18 ${ringClassName}`} />
      <span className={`absolute inset-[31%] rounded-full border border-white/22 ${ringClassName}`} />
      <span className="absolute inset-[44%] rounded-full bg-white/90 shadow-[0_0_18px_rgba(255,226,173,0.78)]" />
      <span className="absolute top-[14%] h-[30%] w-px bg-white/30" />
    </div>
  );
}
