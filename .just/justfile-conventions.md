# Justfile Logging Patterns

## Git

Try to match the colors used by `git -c color.ui=auto` for ref decorations.

- Remote refs: `{{ANSI_BRIGHT_RED}}{{ANSI_BOLD}}`
- Local refs: `{{ANSI_BRIGHT_GREEN}}{{ANSI_BOLD}}`
- HEAD refs: `{{ANSI_BRIGHT_CYAN}}{{ANSI_BOLD}}`

## Maven

Try to match the colors used by `mvn --color=always`.

- Targets and phases: `{{ANSI_GREEN}}`
- Module names: `{{ANSI_CYAN}}`

And add a few conventions of our own.

- Flags: `{{ANSI_MAGENTA}}`
- Profiles: `{{ANSI_BLUE}}`

## Just

Invoking `just` from a `justfile` command rather than a recipe dependency is unusual. Highlight the word `just` in red to emphasize it.

## Other Colors

- Other variables or varying text: `{{ANSI_YELLOW}}`
- After any color change: `{{ANSI_DEFAULT}}`
- After any style change: `{{ANSI_NORMAL}}`

## Style Guidelines

- Use color and emphasis minimally, mostly on variables
- Avoid coloring entire phrases or sentences

In this example, we only highlight one of the two variables. It's the shorter and more important of the two.

```bash
echo "Skipping due to [{{ANSI_YELLOW}}${word}{{ANSI_DEFAULT}}] in commit: '${COMMIT_MESSAGE}'"
```

