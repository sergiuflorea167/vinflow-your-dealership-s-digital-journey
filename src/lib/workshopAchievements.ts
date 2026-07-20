import {
  LayoutDashboard, Warehouse, Workflow, ShoppingCart, ListTodo, CalendarDays,
  BarChart3, Zap as ZapIcon, Database, SlidersHorizontal,
  Rocket, Flag, Crown, Zap, CalendarClock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { WORKSHOP_ORDER, type WorkshopKey } from "@/store/workshopStore";
import { WORKSHOP_CHAPTER_LINKS } from "@/lib/workshopChapterLinks";
import type { ChapterProgress } from "@/store/workshopProgressStore";

// Bewusst ein eigenes, schlankes Icon-Set statt workshopRegistry.ts zu importieren —
// diese Datei wird von der Topbar (jede Seite!) geladen und soll nicht die komplette
// Workshop-Inhalts-Bundle (alle Kapitel-Texte) mitziehen.
const CHAPTER_ICONS: Record<WorkshopKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  fleet: Warehouse,
  processes: Workflow,
  purchase: ShoppingCart,
  todos: ListTodo,
  calendar: CalendarDays,
  kpis: BarChart3,
  insights: ZapIcon,
  master: Database,
  settings: SlidersHorizontal,
};

export interface Achievement {
  key: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  unlocked: boolean;
}

interface AchievementContext {
  progress: Partial<Record<WorkshopKey, ChapterProgress>>;
  completedCount: number;
}

const chapterTitle = (label: string) => label.replace(" Workshop", "").replace("-Workshop", "");

const buildContext = (progress: Partial<Record<WorkshopKey, ChapterProgress>>): AchievementContext => ({
  progress,
  completedCount: WORKSHOP_ORDER.filter((k) => progress[k]?.completed).length,
});

/**
 * Achievements = reine Funktion des gespeicherten Fortschritts, keine eigene
 * Tabelle nötig: 10 Kapitel-Badges + 5 Meilensteine rund um Tempo und Konstanz.
 */
export function computeAchievements(progress: Partial<Record<WorkshopKey, ChapterProgress>>): Achievement[] {
  const ctx = buildContext(progress);

  const chapterAchievements: Achievement[] = WORKSHOP_CHAPTER_LINKS.map((chapter) => ({
    key: `chapter-${chapter.key}`,
    title: `${chapterTitle(chapter.label)}-Profi`,
    desc: `„${chapter.label}“ komplett durchgespielt.`,
    icon: CHAPTER_ICONS[chapter.key as WorkshopKey],
    unlocked: ctx.progress[chapter.key as WorkshopKey]?.completed === true,
  }));

  const sameDayCompletion = Object.values(ctx.progress).some((p) =>
    p?.completed && p.firstOpenedAt && p.completedAt && p.firstOpenedAt.slice(0, 10) === p.completedAt.slice(0, 10),
  );
  const distinctLearningDays = new Set(
    Object.values(ctx.progress).flatMap((p) => (p?.firstOpenedAt ? [p.firstOpenedAt.slice(0, 10)] : [])),
  ).size;

  const milestoneAchievements: Achievement[] = [
    {
      key: "first-chapter",
      title: "Erste Schritte",
      desc: "Das erste Workshop-Kapitel abgeschlossen.",
      icon: Rocket,
      unlocked: ctx.completedCount >= 1,
    },
    {
      key: "halfway",
      title: "Halbzeit",
      desc: `5 von ${WORKSHOP_ORDER.length} Kapiteln abgeschlossen.`,
      icon: Flag,
      unlocked: ctx.completedCount >= 5,
    },
    {
      key: "all-chapters",
      title: "VINflow-Meister",
      desc: "Alle Workshop-Kapitel gemeistert — du kennst VINflow von A bis Z.",
      icon: Crown,
      unlocked: ctx.completedCount >= WORKSHOP_ORDER.length,
    },
    {
      key: "same-day",
      title: "Blitzstart",
      desc: "Ein Kapitel am selben Tag begonnen und abgeschlossen.",
      icon: Zap,
      unlocked: sameDayCompletion,
    },
    {
      key: "return-learner",
      title: "Dranbleiber",
      desc: "An mindestens zwei verschiedenen Tagen im Workshop gelernt.",
      icon: CalendarClock,
      unlocked: distinctLearningDays >= 2,
    },
  ];

  return [...chapterAchievements, ...milestoneAchievements];
}
