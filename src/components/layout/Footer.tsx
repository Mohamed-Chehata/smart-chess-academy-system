import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

const Footer = () => {
  const links = {
    navigation: [
      { name: "Home", href: "/" },
      { name: "Features", href: "#features" },
      { name: "Locations", href: "#locations" },
    ],
    connect: [
      { name: "Member Sign In", href: "/login" },
      { name: "Contact Us", href: "#contact" },
    ],
  };

  return (
    <footer id="contact" className="bg-navy-dark py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-3 mb-4">
              <img 
                src={logo} 
                alt="Smart Chess Academy" 
                className="h-14 w-auto"
              />
            </Link>
            <p className="text-ivory/60 text-sm leading-relaxed">
              Empowering chess players of all levels to reach their full potential through expert coaching and comprehensive training.
            </p>
          </div>

          {/* Navigation Links */}
          <div>
            <h4 className="font-semibold text-ivory mb-4">Navigation</h4>
            <ul className="space-y-3">
              {links.navigation.map((link) => (
                <li key={link.name}>
                  {link.href.startsWith("/") ? (
                    <Link
                      to={link.href}
                      className="text-ivory/60 hover:text-gold transition-colors text-sm"
                    >
                      {link.name}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      className="text-ivory/60 hover:text-gold transition-colors text-sm"
                    >
                      {link.name}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Connect Links */}
          <div>
            <h4 className="font-semibold text-ivory mb-4">Connect</h4>
            <ul className="space-y-3">
              {links.connect.map((link) => (
                <li key={link.name}>
                  {link.href.startsWith("/") ? (
                    <Link
                      to={link.href}
                      className="text-ivory/60 hover:text-gold transition-colors text-sm"
                    >
                      {link.name}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      className="text-ivory/60 hover:text-gold transition-colors text-sm"
                    >
                      {link.name}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-ivory/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-ivory/40 text-sm">
            © 2026 Smart Chess Academy. All rights reserved.
          </p>
          <p className="text-ivory/40 text-sm">
            FIDE Certified Training Partner
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
