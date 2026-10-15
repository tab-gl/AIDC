import * as Avatar from "@radix-ui/react-avatar";

type Props = {
  src?: string | null;
  name: string;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
  delayMs?: number;
};

/** Accessible image/fallback avatar built on Radix UI Avatar. */
export function IdentityAvatar({ src, name, className, imageClassName, fallbackClassName, delayMs = 120 }: Props) {
  const initial = name.trim().charAt(0).toLocaleUpperCase() || "?";
  return <Avatar.Root className={className} aria-label={name}>
    <Avatar.Image src={src || undefined} alt="" className={imageClassName} referrerPolicy="no-referrer" />
    <Avatar.Fallback className={fallbackClassName} delayMs={delayMs}>{initial}</Avatar.Fallback>
  </Avatar.Root>;
}
