import { useEffect, useState } from "react";
import { sha1Hex } from "../utils/sha1";

/*
  The sha of the blueprint string, which is how the blueprint API addresses a
  stored blueprint. Hashing is async (crypto.subtle), so this is undefined for
  the first render and again whenever the string changes.
*/
export function useBlueprintStringSha(blueprintString?: string): string | undefined {
  const [sha, setSha] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!blueprintString) {
      setSha(undefined);
      return;
    }

    let current = true;
    setSha(undefined);
    sha1Hex(blueprintString).then((hashed) => {
      if (current) {
        setSha(hashed);
      }
    });

    return () => {
      current = false;
    };
  }, [blueprintString]);

  return sha;
}
