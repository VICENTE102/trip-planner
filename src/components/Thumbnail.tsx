import { useState } from "react";
import { Icon } from "./Icon";
import type { IconName } from "./Icon";

interface ThumbnailProps {
  src: string | null;
  alt: string;
  fallbackIcon: IconName;
  size?: "sm" | "lg";
  shape?: "square" | "circle";
}

const SIZE_CLASSES: Record<NonNullable<ThumbnailProps["size"]>, string> = {
  sm: "h-10 w-10",
  lg: "h-20 w-20 lg:h-24 lg:w-24",
};

export function Thumbnail({ src, alt, fallbackIcon, size = "sm", shape = "square" }: ThumbnailProps) {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;
  const shapeClass = shape === "circle" ? "rounded-full" : "rounded-xl";
  const iconSize = size === "lg" ? 28 : 18;

  return (
    <div className={`flex-none overflow-hidden bg-sunset-50 ${SIZE_CLASSES[size]} ${shapeClass}`}>
      {showImage ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sunset-400">
          <Icon name={fallbackIcon} size={iconSize} />
        </div>
      )}
    </div>
  );
}
