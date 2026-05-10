export function UnavailableStatePanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <main className="page-shell">
      <section className="panel panel-muted">
        <h1 className="panel-title">{title}</h1>
        <p className="panel-copy">{description}</p>
      </section>
    </main>
  );
}
