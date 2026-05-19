import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, X, Check, MousePointerClick } from "lucide-react";
import { cn } from "@/lib/utils";

export type Placement = "top" | "bottom" | "left" | "right" | "center";

export interface WorkshopStep {
  selector?: string;
  awaitSelector?: string;
  title: string;
  body: string;
  task?: string;
  icon: React.ComponentType<{ className?: string }>;
  placement?: Placement;
}

interface Props {
  active: boolean;
  step: number;
  steps: WorkshopStep[];
  rootRoute: string;             // wohin navigiert wird, wenn Workshop startet
  labelPrefix: string;           // z. B. "Bestand-Workshop"
  next: () => void;
  prev: () => void;
  stop: () => void;
}

const PAD = 8;
const TIP_W = 360;
const TIP_GAP = 14;

function rectsEqual(a: DOMRect | null, b: DOMRect | null) {
  if (!a || !b) return a === b;
  return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;
}

export const WorkshopPilot = ({ active, step, steps, rootRoute, labelPrefix, next, prev, stop }: Props) => {
  const navigate = useNavigate();
  const [rect, setRectState] = useState<DOMRect | null>(null);
  const [ready, setReady] = useState(false);
  const rectRef = useRef<DOMRect | null>(null);
  const rafRef = useRef<number | null>(null);

  const current = steps[step];
  const isLast = step === steps.length - 1;

  const setRect = useCallback((r: DOMRect | null) => {
    if (rectsEqual(rectRef.current, r)) return;
    rectRef.current = r;
    setRectState(r);
  }, []);

  useEffect(() => {
    if (active && window.location.pathname !== rootRoute) navigate(rootRoute);
  }, [active, navigate, rootRoute]);

  useLayoutEffect(() => {
    if (!active) return;
    setReady(false);
    if (!current?.selector) {
      setRect(null);
      setReady(true);
      return;
    }
    let cancelled = false;
    let attempts = 0;
    const tryFind = () => {
      if (cancelled) return;
      const el = document.querySelector(current.selector!) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        window.setTimeout(() => {
          if (cancelled) return;
          setRect(el.getBoundingClientRect());
          setReady(true);
        }, 350);
      } else if (attempts++ < 20) {
        window.setTimeout(tryFind, 100);
      } else {
        setRect(null);
        setReady(true);
      }
    };
    tryFind();
    return () => { cancelled = true; };
  }, [active, step, current, setRect]);

  useEffect(() => {
    if (!active || !current?.selector || !ready) return;
    const loop = () => {
      const el = document.querySelector(current.selector!) as HTMLElement | null;
      if (el) setRect(el.getBoundingClientRect());
      rafRef.current = window.requestAnimationFrame(loop);
    };
    rafRef.current = window.requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [active, current, ready, setRect]);

  useEffect(() => {
    if (!active || !current?.awaitSelector) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest(current.awaitSelector!)) {
        window.setTimeout(() => { if (!isLast) next(); }, 150);
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [active, current, next, isLast]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") stop();
      if (e.key === "ArrowRight" || e.key === "Enter") isLast ? stop() : next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, isLast, next, prev, stop]);

  if (!active || !ready) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let tipStyle: React.CSSProperties = {};

  if (!rect || current.placement === "center") {
    tipStyle = { top: vh / 2 - 140, left: vw / 2 - TIP_W / 2, width: TIP_W };
  } else {
    const placement = current.placement ?? "bottom";
    let top = 0; let left = 0;
    if (placement === "bottom") { top = rect.bottom + TIP_GAP; left = rect.left + rect.width / 2 - TIP_W / 2; }
    else if (placement === "top") { top = rect.top - TIP_GAP - 240; left = rect.left + rect.width / 2 - TIP_W / 2; }
    else if (placement === "right") { top = rect.top + rect.height / 2 - 120; left = rect.right + TIP_GAP; }
    else if (placement === "left") { top = rect.top + rect.height / 2 - 120; left = rect.left - TIP_GAP - TIP_W; }
    left = Math.max(12, Math.min(left, vw - TIP_W - 12));
    top = Math.max(12, Math.min(top, vh - 260));
    tipStyle = { top, left, width: TIP_W };
  }

  const Icon = current.icon;
  const overlayBg = "hsl(var(--background) / 0.55)";
  const cutout = rect && current.placement !== "center";
  const t = cutout ? Math.max(0, rect.top - PAD) : 0;
  const l = cutout ? Math.max(0, rect.left - PAD) : 0;
  const w = cutout ? rect.width + PAD * 2 : 0;
  const h = cutout ? rect.height + PAD * 2 : 0;

  return createPortal(
    <div className="fixed inset-0 z-[120] pointer-events-none">
      {cutout ? (
        <>
          <div className="absolute left-0 right-0 top-0" style={{ height: t, background: overlayBg }} />
          <div className="absolute left-0 bottom-0 right-0" style={{ top: t + h, background: overlayBg }} />
          <div className="absolute" style={{ top: t, left: 0, width: l, height: h, background: overlayBg }} />
          <div className="absolute" style={{ top: t, left: l + w, right: 0, height: h, background: overlayBg }} />
          <div
            className="absolute rounded-xl ring-2 ring-primary pointer-events-none transition-[top,left,width,height] duration-200 ease-out"
            style={{
              top: t, left: l, width: w, height: h,
              boxShadow: "0 0 0 2px hsl(var(--primary) / 0.35), 0 0 40px 4px hsl(var(--primary) / 0.4)",
            }}
          />
        </>
      ) : (
        <div className="absolute inset-0" style={{ background: overlayBg }} />
      )}

      <div
        className="absolute pointer-events-auto rounded-2xl border-2 border-primary/40 bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        style={tipStyle}
      >
        <div className="flex items-start gap-3 p-4 pb-3">
          <div className="size-10 shrink-0 rounded-lg bg-gradient-brand grid place-items-center">
            <Icon className="size-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-mono uppercase tracking-wider text-primary">
              {labelPrefix} · Schritt {step + 1}/{steps.length}
            </span>
            <h3 className="text-base font-semibold leading-tight font-heading mt-0.5">{current.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">{current.body}</p>
            {current.task && (
              <div className="mt-3 flex items-start gap-2 px-2.5 py-2 rounded-md bg-primary/10 border border-primary/20">
                <MousePointerClick className="size-3.5 text-primary shrink-0 mt-0.5 animate-pulse" />
                <span className="text-[11px] font-medium text-primary leading-snug">
                  <span className="font-semibold">Aufgabe:</span> {current.task}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={stop}
            className="size-7 -mr-1 -mt-1 rounded-md grid place-items-center text-muted-foreground hover:bg-muted/60 transition-smooth"
            aria-label="Workshop beenden"
          >
            <X className="size-3.5" />
          </button>
        </div>
        <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-t border-border">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <span key={i} className={cn(
                "h-1.5 rounded-full transition-all",
                i === step ? "w-5 bg-primary" : i < step ? "w-1.5 bg-primary/60" : "w-1.5 bg-muted-foreground/30",
              )} />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {step > 0 && (
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={prev}>
                <ArrowLeft className="size-3 mr-1" /> Zurück
              </Button>
            )}
            {!isLast ? (
              <Button size="sm" className="h-7 px-3 text-xs bg-gradient-brand" onClick={next}>
                Weiter <ArrowRight className="size-3 ml-1" />
              </Button>
            ) : (
              <Button size="sm" className="h-7 px-3 text-xs bg-gradient-brand" onClick={stop}>
                <Check className="size-3 mr-1" /> Fertig
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
