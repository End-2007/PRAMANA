import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-x flex min-h-[70vh] flex-col items-start justify-center pt-24">
      <div className="eyebrow">404</div>
      <h1 className="mt-3 text-[40px] font-medium tracking-[-0.04em]">No evidence of this page.</h1>
      <p className="mt-2 text-ink-2">Under the routes we hold, at the paths we checked.</p>
      <Link href="/" className="btn-primary mt-8">
        Back to Pramana
      </Link>
    </div>
  );
}
