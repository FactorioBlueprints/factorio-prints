import LocalStorageWorker from "./localStorage.worker?worker";

// fallow treats the `?worker` import as a re-export of localStorage.worker.ts's
// default and never credits localStorage.ts's import of this default.
// fallow-ignore-next-line unused-export
export default LocalStorageWorker;
