import Select, { type GroupBase, type Props, type Theme } from "react-select";

type ThemedSelectProps<Option, IsMulti extends boolean, Group extends GroupBase<Option>> = Omit<
  Props<Option, IsMulti, Group>,
  "classNamePrefix" | "theme"
> & {
  /** Match `form-control-sm` inputs instead of full-size ones. */
  size?: "sm";
};

// react-select injects its hover/active styles after the app CSS, so the Factorio GUI
// palette goes through its theme rather than CSS overrides.
const themeFor =
  (size: "sm" | undefined) =>
  (theme: Theme): Theme => ({
    borderRadius: 2,
    colors: {
      ...theme.colors,
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
    },
    spacing:
      size === "sm"
        ? { baseUnit: 2, controlHeight: 31, menuGutter: 4 }
        : { baseUnit: 4, controlHeight: 50, menuGutter: 4 },
  });

const smallTheme = themeFor("sm");
const defaultSizeTheme = themeFor(undefined);

function ThemedSelect<
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>,
>({ size, className, ...props }: ThemedSelectProps<Option, IsMulti, Group>) {
  const classNames = [className, size === "sm" ? "fp-select--sm" : undefined].filter(Boolean);
  return (
    <Select<Option, IsMulti, Group>
      {...props}
      {...(classNames.length > 0 ? { className: classNames.join(" ") } : {})}
      classNamePrefix="fp-select"
      theme={size === "sm" ? smallTheme : defaultSizeTheme}
    />
  );
}

export default ThemedSelect;
