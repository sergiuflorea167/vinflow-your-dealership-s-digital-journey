interface VincentFaceProps {
  className?: string;
}

/**
 * VINcents Gesicht: eine warme, leicht plastische Figur (Glanzlicht, Iris,
 * Lachfältchen) statt eines flachen Icons. Selbstständiger Kreis inkl.
 * Verlauf in Markenfarbe — braucht keinen umschließenden Gradient-Container.
 * Überall dort verwendet, wo VINcent als Figur auftritt (Launcher, Chat,
 * Einführungs-Tour).
 */
export const VincentFace = ({ className }: VincentFaceProps) => (
  <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <radialGradient id="vincent-face-grad" cx="32%" cy="26%" r="85%">
        <stop offset="0" stopColor="hsl(var(--primary-glow))" />
        <stop offset="1" stopColor="hsl(var(--primary))" />
      </radialGradient>
    </defs>
    <circle cx="24" cy="24" r="20" fill="url(#vincent-face-grad)" />
    <ellipse cx="16.5" cy="12.5" rx="7.5" ry="4.5" fill="#fff" opacity="0.16" transform="rotate(-24 16.5 12.5)" />
    <path d="M12.5 15.3 Q17 13 21.5 15" stroke="#12203a" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    <path d="M26.5 15 Q31 13 35.5 15.3" stroke="#12203a" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    <ellipse cx="17" cy="22.3" rx="4.3" ry="5.1" fill="#fff" />
    <ellipse cx="31" cy="22.3" rx="4.3" ry="5.1" fill="#fff" />
    <circle cx="17.6" cy="23.1" r="2.6" fill="#12203a" />
    <circle cx="31.6" cy="23.1" r="2.6" fill="#12203a" />
    <circle cx="16.7" cy="22" r="0.9" fill="#fff" />
    <circle cx="30.7" cy="22" r="0.9" fill="#fff" />
    <path d="M14.3 25.7 Q17 27.1 19.7 25.7" stroke="#12203a" strokeWidth="1.1" strokeLinecap="round" fill="none" opacity="0.5" />
    <path d="M28.3 25.7 Q31 27.1 33.7 25.7" stroke="#12203a" strokeWidth="1.1" strokeLinecap="round" fill="none" opacity="0.5" />
    <path d="M16.5 31 Q24 39.5 31.5 31 Q24 35.3 16.5 31 Z" fill="#12203a" />
    <path d="M19 31.6 Q24 34.2 29 31.6" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" fill="none" opacity="0.9" />
  </svg>
);
