import Link from 'next/link';

export function NavBar() {
  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Link href="/" className="navbar__brand">
          Campus Events
        </Link>
        <nav className="navbar__links">
          <a href="#events">Browse</a>
          <a href="#create">Create</a>
          <a href="#about">Data</a>
        </nav>
      </div>
    </header>
  );
}
