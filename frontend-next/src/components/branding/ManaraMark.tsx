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
          'radial-gradient(circle at center, rgba(246,212,203,0.98) 0%, rgba(224,177,21,0.92) 22%, rgba(124,65,60,0.84) 38%, rgba(30,2,39,0.96) 68%, rgba(30,2,39,1) 100%)',
        boxShadow: '0 14px 32px rgba(30,2,39,0.18)',
      }}
    >
      <span className={`absolute inset-[16%] rounded-full border border-[color:rgba(246,212,203,0.18)] ${ringClassName}`} />
      <span className={`absolute inset-[31%] rounded-full border border-[color:rgba(246,212,203,0.22)] ${ringClassName}`} />
      <span className="absolute inset-[44%] rounded-full bg-[color:rgba(246,212,203,0.9)] shadow-[0_0_18px_rgba(246,212,203,0.78)]" />
      <span className="absolute top-[14%] h-[30%] w-px bg-[color:rgba(246,212,203,0.3)]" />
    </div>
  );
}
