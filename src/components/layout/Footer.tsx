export function Footer() {
  return (
    <footer className="border-t border-surface-elevated bg-obsidian py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-sm text-foreground/60">
            &copy; {new Date().getFullYear()} Stakyfi. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-foreground/60">
            <a href="#" className="hover:text-cyan transition-colors">Terms</a>
            <a href="#" className="hover:text-cyan transition-colors">Privacy</a>
            <a href="#" className="hover:text-cyan transition-colors">Docs</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
