import { Globe, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguageStore, Lang } from "@/store/languageStore";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";

const OPTIONS: { code: Lang; label: string; flag: string }[] = [
  { code: "de", label: "Deutsch",  flag: "🇩🇪" },
  { code: "en", label: "English",  flag: "🇬🇧" },
];

export const LanguageSwitcher = () => {
  const lang = useLanguageStore((s) => s.lang);
  const setLang = useLanguageStore((s) => s.setLang);
  const t = useT();

  const select = (code: Lang) => {
    if (code === lang) return;
    setLang(code);
    toast.success(t("language.changed"));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 px-2 gap-1.5 text-muted-foreground hover:text-foreground"
          aria-label={t("menu.language")}
        >
          <Globe className="size-4" />
          <span className="text-xs font-mono uppercase tracking-wider">{lang}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {t("menu.language")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTIONS.map((o) => (
          <DropdownMenuItem key={o.code} onClick={() => select(o.code)} className="gap-2">
            <span className="text-base leading-none">{o.flag}</span>
            <span className="flex-1">{o.label}</span>
            {lang === o.code && <Check className="size-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
