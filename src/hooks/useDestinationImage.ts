import { useEffect, useState } from "react";
import { getDestinationImageUrl } from "../services/destinationImage";

export function useDestinationImage(destination: string): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    getDestinationImageUrl(destination).then((result) => {
      if (!cancelled) setUrl(result);
    });
    return () => {
      cancelled = true;
    };
  }, [destination]);

  return url;
}
