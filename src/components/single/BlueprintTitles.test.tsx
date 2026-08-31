import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";
import BlueprintTitles from "./BlueprintTitles";

const sha = "1b472ffa07106d9380321fb46b1dbd5b465d483b";

describe("BlueprintTitles", () => {
  it("passes the blueprint string sha down to the editor link", () => {
    render(
      <BlueprintTitles
        blueprintKey="-KYeNAYQVgk2DcbuORde"
        parsedData={{ blueprint: { item: "blueprint", label: "Solar array" } }}
        blueprintStringSha={sha}
      />,
    );

    expect(screen.getByRole("button", { name: /Open in editor/ })).toHaveAttribute(
      "href",
      `https://fbe.factorygamefan.com/?source=https://factorioprints.xyz/api/blueprintData/${sha}/`,
    );
  });
});
