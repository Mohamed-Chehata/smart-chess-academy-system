import { 
  TrendingUp, 
  Calendar, 
  ClipboardCheck, 
  Trophy, 
  MessageSquare,
  Award
} from "lucide-react";

const FeaturesSection = () => {
  const features = [
    {
      icon: TrendingUp,
      title: "FIDE Rating Tracker",
      description: "Monitor your chess rating progression with beautiful charts. Track your journey from unrated to titled player.",
    },
    {
      icon: Calendar,
      title: "Smart Scheduling",
      description: "Book group or private lessons with our intuitive calendar. Never miss a training session again.",
    },
    {
      icon: ClipboardCheck,
      title: "Attendance System",
      description: "Coaches can easily mark attendance on any device. Parents receive real-time notifications.",
    },
    {
      icon: Trophy,
      title: "Tournament Portal",
      description: "Register for academy events, view standings, and track your competitive achievements.",
    },
    {
      icon: MessageSquare,
      title: "Coach Feedback",
      description: "Receive personalized game analysis and improvement notes from your coach after each session.",
    },
    {
      icon: Award,
      title: "Tournament Excellence",
      description: "Register for academy tournaments, view live pairings, and track your standings in real-time.",
    },
  ];

  return (
    <section id="features" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-gold font-medium text-sm uppercase tracking-wider">
            Platform Features
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mt-4 mb-6">
            Everything You Need to Excel
          </h2>
          <p className="text-muted-foreground text-lg">
            Our comprehensive platform brings together players, coaches, and administrators in one seamless experience.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group p-8 rounded-2xl bg-gradient-card border border-border hover:border-gold/30 transition-all duration-300 hover:shadow-elevated animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-gold/10 transition-colors">
                <feature.icon className="w-7 h-7 text-primary group-hover:text-gold transition-colors" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
