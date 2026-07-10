import { toAbsoluteUrl } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

function AvatarGroup({ size, group, more, className }) {
  const avatarSize = size ? size : 'size-7';

  const renderItem = (each, index) => {
    return (
      <Avatar key={index} className={cn(avatarSize)}>
        {each.filename || each.path ? (
          <AvatarImage
            src={toAbsoluteUrl(each.path || `/media/avatars/${each.filename}`)}
            alt="image"
            className={cn(
              ' border-1 border-background hover:z-10',
              each.variant,
            )}
          />
        ) : null}
        {each.fallback ? (
          <AvatarFallback
            className={cn(
              'relative border-1 border-background hover:z-10 text-[11px]',
              size,
              each.variant,
            )}
          >
            {each.fallback}
          </AvatarFallback>
        ) : null}
      </Avatar>
    );
  };

  return (
    <div className={cn('flex -space-x-2', className)}>
      {group.map((each, index) => renderItem(each, index))}
      {more && (
        <span
          className={cn(
            'flex items-center cursor-default justify-center relative shrink-0 rounded-full border-1 border-background hover:z-10 font-semibold text-[11px] leading-none',
            avatarSize,
            more.variant,
          )}
        >
          +{more.number || more.label}
        </span>
      )}
    </div>
  );
}

export { AvatarGroup };
