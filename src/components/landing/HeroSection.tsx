import { Trophy, Users, TrendingUp } from "lucide-react";
import ContactModal from "./ContactModal";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.png";

const HeroSection = () => {
  const stats = [
    { icon: Users, value: "500+", label: "Active Students" },
    { icon: Trophy, value: "50+", label: "Tournament Wins" },
    { icon: TrendingUp, value: "200+", label: "FIDE Rated Players" },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      <div className="absolute inset-0 bg-navy-dark/85" />
      
      {/* Gradient Overlay for extra depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-navy-dark/50 via-transparent to-navy-dark/90" />

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Floating Chess Pieces Decoration */}
      <div className="absolute top-20 left-10 w-20 h-20 text-ivory/10 animate-float">
        <svg viewBox="0 0 45 45" fill="currentColor">
          <g fillRule="evenodd" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22.5 11.63V6M20 8h5" strokeLinejoin="miter"/>
            <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="currentColor" strokeLinecap="butt" strokeLinejoin="miter"/>
            <path d="M12.5 37c5.5 3.5 14.5 3.5 20 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7" fill="currentColor"/>
            <path d="M12.5 30c5.5-3 14.5-3 20 0M12.5 33.5c5.5-3 14.5-3 20 0M12.5 37c5.5-3 14.5-3 20 0"/>
          </g>
        </svg>
      </div>

      <div className="absolute bottom-32 right-20 w-16 h-16 text-ivory/10 animate-float" style={{ animationDelay: "1.5s" }}>
        <svg viewBox="0 0 45 45" fill="currentColor">
          <g fillRule="evenodd" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="currentColor"/>
            <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" fill="currentColor"/>
            <path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0" fill="currentColor" stroke="currentColor"/>
            <path d="M15 15.5a.5 1.5 0 1 1-1 0 .5 1.5 0 1 1 1 0" transform="rotate(30 14.5 15.5)" fill="currentColor" stroke="currentColor"/>
          </g>
        </svg>
      </div>

      <div className="container mx-auto px-4 pt-20 lg:pt-0 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ivory/10 border border-ivory/20 text-ivory/80 text-sm font-medium mb-8 animate-fade-in backdrop-blur-sm">
            <Trophy className="w-4 h-4 text-gold" />
            FIDE Certified Training Academy
          </div>

          {/* Heading */}
          <h1 className="font-display text-4xl sm:text-5xl lg:text-7xl font-bold text-ivory mb-6 leading-tight animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Master the Art of{" "}
            <span className="text-gold">Strategic Thinking</span>
          </h1>

          {/* Subheading */}
          <p className="text-lg sm:text-xl text-ivory/70 max-w-2xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Join our elite chess academy where grandmasters guide your journey from beginner to champion. Track your FIDE progress, compete in tournaments, and elevate your game.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <ContactModal />
            <a href="/login">
              <Button variant="heroOutline" size="xl">
                Member Sign In
              </Button>
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "0.4s" }}>
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-ivory/10 mb-3 backdrop-blur-sm">
                  <stat.icon className="w-6 h-6 text-gold" />
                </div>
                <div className="text-3xl font-bold text-ivory mb-1">{stat.value}</div>
                <div className="text-ivory/60 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default HeroSection;
