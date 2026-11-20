import {
  Plus, BookOpen, ExternalLink, LogOut, Eye, EyeOff, Pencil, ArrowLeft, Check, Trash2, Image, X, FileText,
  Copy, GripVertical, Maximize2, TriangleAlert, Palette, type LucideIcon,
} from "lucide-react";

/* Admin icons, from Lucide (lucide.dev) */
const ICONS = {
  plus: Plus, book: BookOpen, open: ExternalLink, logout: LogOut, eye: Eye, eyeOff: EyeOff, pencil: Pencil,
  back: ArrowLeft, check: Check, trash: Trash2, image: Image, close: X, draft: FileText, copy: Copy,
  grip: GripVertical, expand: Maximize2, warn: TriangleAlert, palette: Palette,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  const C = ICONS[name];
  return <C className="icon" size={size} strokeWidth={1.8} aria-hidden="true" />;
}
