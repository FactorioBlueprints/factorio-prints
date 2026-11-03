import { render } from "@testing-library/react";
import { defaultTheme } from "react-select";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import ThemedSelect from "./ThemedSelect";

const capturedProps: Array<Record<string, unknown>> = [];

vi.mock("react-select", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-select")>();
  return {
    ...actual,
    default: (props: Record<string, unknown>) => {
      capturedProps.push(props);
      return null;
    },
  };
});

const expectedColors = {
  ...defaultTheme.colors,
  primary: "var(--fp-orange)",
  primary75: "var(--fp-orange-light)",
  primary50: "var(--fp-orange-dark)",
  primary25: "var(--fp-orange)",
  danger: "var(--fp-red)",
  dangerLight: "var(--fp-red-light)",
  neutral0: "var(--fp-textfield)",
  neutral20: "var(--fp-border)",
  neutral30: "var(--fp-border)",
  neutral40: "#3f3e3f",
  neutral50: "#5f5e5f",
  neutral60: "#3f3e3f",
  neutral80: "#000",
};

describe("ThemedSelect", () => {
  beforeEach(() => {
    capturedProps.length = 0;
  });

  it("passes the fp-select class prefix and the Factorio GUI theme to react-select", () => {
    const options = [{ value: "a", label: "A" }];
    render(<ThemedSelect options={options} placeholder="Pick" className="tag-form" />);

    const { theme, ...rest } = capturedProps[0] as { theme: (t: typeof defaultTheme) => unknown };

    expect({ props: rest, theme: theme(defaultTheme) }).toStrictEqual({
      props: {
        options,
        placeholder: "Pick",
        className: "tag-form",
        classNamePrefix: "fp-select",
      },
      theme: {
        borderRadius: 2,
        colors: expectedColors,
        spacing: { baseUnit: 4, controlHeight: 50, menuGutter: 4 },
      },
    });
  });

  it("uses compact spacing and the small modifier class when size is sm", () => {
    render(<ThemedSelect options={[]} size="sm" />);

    const { theme, ...rest } = capturedProps[0] as { theme: (t: typeof defaultTheme) => unknown };

    expect({ props: rest, theme: theme(defaultTheme) }).toStrictEqual({
      props: {
        options: [],
        className: "fp-select--sm",
        classNamePrefix: "fp-select",
      },
      theme: {
        borderRadius: 2,
        colors: expectedColors,
        spacing: { baseUnit: 2, controlHeight: 31, menuGutter: 4 },
      },
    });
  });
});
