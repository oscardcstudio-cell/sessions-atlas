export function EmptyState() {
  return (
    <div className="h-full flex items-center justify-center bg-[#212121]">
      <div className="text-center">
        <div className="text-[#c96442] text-4xl mb-3 select-none">✱</div>
        <p className="text-[#555] text-sm">Sélectionne une conversation</p>
        <p className="text-[#3a3a3a] text-xs mt-1">ou ouvre un nouveau chat depuis la sidebar</p>
      </div>
    </div>
  );
}
