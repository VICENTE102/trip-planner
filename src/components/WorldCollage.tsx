import { useState } from "react";
import { WORLD_COLLAGE_PHOTOS } from "../constants/collagePhotos";

function CollageTile({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <div className="bg-ink-900" />;
  }

  return (
    <img
      src={src}
      alt=""
      className="h-full w-full object-cover"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

// Fixed mosaic of the whole world behind the search form — never protagonist,
// just ambience, so it always sits under a dark overlay applied by the caller.
export function WorldCollage() {
  return (
    <div className="absolute inset-0 grid grid-cols-5 grid-rows-2">
      {WORLD_COLLAGE_PHOTOS.map((src) => (
        <CollageTile key={src} src={src} />
      ))}
    </div>
  );
}
