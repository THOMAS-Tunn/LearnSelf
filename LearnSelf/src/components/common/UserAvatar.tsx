import { useEffect, useState } from 'react';

interface UserAvatarProps {
  name: string;
  avatarUrl?: string;
  className?: string;
}

export function UserAvatar({ name, avatarUrl = '', className = '' }: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [avatarUrl]);

  const initial = name.trim()[0]?.toUpperCase() || 'S';

  return (
    <div className={`user-avatar ${className}`.trim()} aria-label={`${name} avatar`}>
      {!imageFailed && avatarUrl ? (
        <img src={avatarUrl} alt="" onError={() => setImageFailed(true)} />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}
