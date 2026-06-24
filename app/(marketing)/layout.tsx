export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      {/* scroll reveal observer */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('DOMContentLoaded', function() {
              var observer = new IntersectionObserver(
                function(entries) {
                  entries.forEach(function(e) {
                    if (e.isIntersecting) e.target.classList.add('revealed');
                  });
                },
                { threshold: 0.15 }
              );
              document.querySelectorAll('.reveal-on-scroll').forEach(function(el) {
                observer.observe(el);
              });
            });
          `,
        }}
      />
    </>
  );
}
