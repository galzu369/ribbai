export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <section className="w-full max-w-3xl rounded-lg border bg-card p-8 text-card-foreground shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Foundation validated
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">RIBBAI OPS</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Infrastructure shell for the RIBBAI restaurant operations platform. Business modules will be
          implemented in later phases after the foundation is fully verified.
        </p>
      </section>
    </main>
  );
}
