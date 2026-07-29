import { cleanup } from "@testing-library/react";
import { afterEach } from "vite-plus/test";
import "@testing-library/jest-dom";

afterEach(() => {
  cleanup();
});
