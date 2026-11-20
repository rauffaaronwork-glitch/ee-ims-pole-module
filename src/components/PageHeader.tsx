export default function PageHeader({ title, subtitle, right }: { title: string; subtitle: string; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ims-line bg-black/20 px-4 py-5 lg:px-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">{title}</h1>
        <p className="mt-1 text-[15px] text-ims-muted">{subtitle}</p>
      </div>
      {right}
    </div>
  );
}
