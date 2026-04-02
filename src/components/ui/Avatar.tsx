import React from 'react';
import { cn, getInitials } from '../../lib/utils';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

const sizeMap = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-10 w-10 text-sm',
  xl: 'h-16 w-16 text-xl',
};

const colorMap = [
  'bg-purple-100 text-purple-700',
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-teal-100 text-teal-700',
  'bg-indigo-100 text-indigo-700',
  'bg-yellow-100 text-yellow-700',
];

function getColorFromName(name: string): string {
  const index = name.charCodeAt(0) % colorMap.length;
  return colorMap[index];
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name = '',
  size = 'md',
  className,
  onClick,
}) => {
  const [imgError, setImgError] = React.useState(false);
  const showFallback = !src || imgError;

  return (
    <div
      className={cn(
        'relative flex-shrink-0 rounded-full overflow-hidden select-none',
        sizeMap[size],
        showFallback && getColorFromName(name),
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {!showFallback ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-semibold">
          {getInitials(name)}
        </div>
      )}
    </div>
  );
};

interface AvatarGroupProps {
  users: Array<{ id: string; full_name: string; avatar_url?: string | null }>;
  max?: number;
  size?: AvatarProps['size'];
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  users,
  max = 3,
  size = 'sm',
}) => {
  const visible = users.slice(0, max);
  const remaining = users.length - max;

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((user) => (
        <Avatar
          key={user.id}
          src={user.avatar_url}
          name={user.full_name}
          size={size}
          className="ring-2 ring-white"
        />
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            'flex items-center justify-center rounded-full ring-2 ring-white bg-slate-200 text-slate-600 font-medium',
            sizeMap[size],
            'text-xs'
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
};
