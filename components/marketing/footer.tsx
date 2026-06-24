export function Footer() {
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@plumberanswered.com";

  return (
    <footer
      className="px-6 py-8"
      style={{ borderTop: "1px solid #1a1a1a" }}
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="text-sm" style={{ color: "#A1A1AA" }}>
          <span className="font-bold text-white">PlumberAnswered</span>
          &nbsp;&middot;&nbsp;&copy; 2026 VeilCode Studio
        </div>
        <a
          href={`mailto:${email}`}
          className="text-sm hover:text-white transition-colors"
          style={{ color: "#A1A1AA" }}
        >
          {email}
        </a>
      </div>
    </footer>
  );
}
