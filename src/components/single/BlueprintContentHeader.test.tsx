import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";
import BlueprintContentHeader from "./BlueprintContentHeader";

const sha = "1b472ffa07106d9380321fb46b1dbd5b465d483b";
const editorUrl = (position: string) =>
  `https://fbe.factorygamefan.com/?source=https://www.factorio.school/api/blueprintData/${sha}${position}`;

const book = {
  blueprint_book: {
    item: "blueprint-book",
    label: "Gleba book",
    blueprints: [
      { index: 0, blueprint: { item: "blueprint", label: "First" } },
      {
        index: 1,
        blueprint_book: {
          item: "blueprint-book",
          label: "Nested book",
          blueprints: [{ index: 0, blueprint: { item: "blueprint", label: "Nested first" } }],
        },
      },
    ],
  },
};

const editorLinks = () =>
  screen
    .queryAllByRole("button", { name: /Open in editor/ })
    .map((link) => link.getAttribute("href"));

describe("BlueprintContentHeader", () => {
  it("links a single blueprint to the editor at the blueprint root", () => {
    render(
      <BlueprintContentHeader
        data={{ blueprint: { item: "blueprint", label: "Solar array" } }}
        blueprintKey="-KYeNAYQVgk2DcbuORde"
        blueprintStringSha={sha}
      />,
    );

    expect(editorLinks()).toStrictEqual([editorUrl("/")]);
  });

  it("links each blueprint in a book to its position in the book", () => {
    render(
      <BlueprintContentHeader
        data={book}
        blueprintKey="-OJczvHV56up6wV6mI3k"
        blueprintStringSha={sha}
      />,
    );

    expect(editorLinks()).toStrictEqual([editorUrl("/position/0"), editorUrl("/position/1.0")]);
  });

  it("renders no editor link when the blueprint string sha is unknown", () => {
    render(<BlueprintContentHeader data={book} blueprintKey="preview" />);

    expect(editorLinks()).toStrictEqual([]);
  });
});
