import {
  Droplets,
  Construction,
  Zap,
  Trash2,
  Trees,
  Volume2,
  PawPrint,
  TriangleAlert,
  CircleHelp,
  Send,
  MailOpen,
  Loader,
  CircleCheck,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "@/lib/types";
import { CATEGORY_META } from "@/lib/meta";

const ICONS: Record<string, LucideIcon> = {
  Droplets,
  Construction,
  Zap,
  Trash2,
  Trees,
  Volume2,
  PawPrint,
  TriangleAlert,
  CircleHelp,
  Send,
  MailOpen,
  Loader,
  CircleCheck,
};

export function Icon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Cmp = ICONS[name] ?? CircleHelp;
  return <Cmp className={className} aria-hidden="true" />;
}

export function CategoryIcon({
  category,
  className,
}: {
  category: Category;
  className?: string;
}) {
  return <Icon name={CATEGORY_META[category].icon} className={className} />;
}
