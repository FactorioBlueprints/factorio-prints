import { useCallback, useState } from "react";
import {
  ClipboardCopyStatus,
  copyBlueprintStringToClipboard,
} from "../utils/collectionBlueprintBook";

interface CopyToClipboardState {
  copiedText: boolean;
  copyError: string;
  copyToClipboard: (text: string) => Promise<void>;
}

export const useCopyToClipboard = (): CopyToClipboardState => {
  const [copiedText, setCopiedText] = useState(false);
  const [copyError, setCopyError] = useState("");

  const copyToClipboard = useCallback(async (text: string) => {
    if (!text) return;

    setCopiedText(false);
    setCopyError("");

    const result = await copyBlueprintStringToClipboard(text);
    if (result.status !== ClipboardCopyStatus.Copied) {
      setCopyError(result.errorMessage);
      return;
    }

    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  }, []);

  return { copiedText, copyError, copyToClipboard };
};

export default useCopyToClipboard;
