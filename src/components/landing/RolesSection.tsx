import { GraduationCap, User, ChevronRight } from "lucide-react";
import ContactModal from "./ContactModal";
import { Button } from "@/components/ui/button";

const RolesSection = () => {
  const roles = [
    {
      icon: GraduationCap,
      role: "Coach",
      title: "Training Excellence",
      description: "Focus on what matters most - developing your students. All scheduling and administrative tasks simplified.",
      features: [
        "Class scheduling",
        "Attendance tracking",
        "Student feedback notes",
        "Tournament coaching",
      ],
      iconBg: "bg-gold/10",
    },
    {
      icon: User,
      role: "Player",
      title: "Your Chess Journey",
      description: "Track your progress, book lessons, and compete in tournaments. Parents can monitor their child's development.",
      features: [
        "FIDE rating tracker",
        "Lesson booking",
        "Tournament registration",
        "Coach feedback access",
      ],
      iconBg: "bg-navy/10",
    },
  ];

  return (
    <section id="programs" className="py-24 bg-muted/50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-gold font-medium text-sm uppercase tracking-wider">
            For Everyone
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mt-4 mb-6">
            Tailored for Coaches & Players
          </h2>
          <p className="text-muted-foreground text-lg">
            Whether you're coaching the next generation or tracking your own chess journey, we've got you covered.
          </p>
        </div>

        {/* Roles Grid - Centered 2 cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {roles.map((item, index) => (
            <div
              key={item.role}
              className="relative group animate-fade-in"
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              <div className="h-full p-8 rounded-2xl bg-card border border-border hover:border-gold/30 transition-all duration-300 hover:shadow-elevated">
                {/* Icon & Role Badge */}
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-14 h-14 rounded-xl ${item.iconBg} flex items-center justify-center`}>
                    <item.icon className="w-7 h-7 text-foreground" />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
                    {item.role}
                  </span>
                </div>

                {/* Content */}
                <h3 className="text-2xl font-semibold text-foreground mb-3">
                  {item.title}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {item.description}
                </p>

                {/* Features List */}
                <ul className="space-y-3 mb-8">
                  {item.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm text-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-gold" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <ContactModal>
                  <Button variant={item.role === "Coach" ? "gold" : "navy"} className="w-full">
                    Join as {item.role}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </ContactModal>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RolesSection;
