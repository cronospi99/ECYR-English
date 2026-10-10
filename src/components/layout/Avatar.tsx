import { useAvatar, type AvatarConfig } from '@/store/avatar';
import { AvatarView } from '@/features/avatar/AvatarView';

/**
 * The learner's avatar. Renders the saved avatar (initials, portrait or
 * builder) from the avatar store, or a specific `config` when given (previews).
 */
export function Avatar({ name, size = 36, className, config }: { name: string; size?: number; className?: string; config?: AvatarConfig }) {
  const saved = useAvatar((s) => s.config);
  return <AvatarView config={config ?? saved} name={name} size={size} className={className} />;
}
