export function createVitePreloadErrorHandler(
  reloadPage: () => void,
): (event: VitePreloadErrorEvent) => void {
  return () => {
    reloadPage();
  };
}
