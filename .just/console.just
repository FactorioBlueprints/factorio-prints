# Text styling
ANSI_BOLD := `tput bold`
ANSI_DIM := `tput dim`
ANSI_ITALIC := `tput sitm`
ANSI_UNDERLINE := `tput smul`
ANSI_BLINK := `tput blink`
ANSI_REVERSE := `tput rev`
ANSI_HIDDEN := `tput invis`

# Reset all attributes
ANSI_NORMAL := `tput sgr0`
ANSI_RESET_BOLD := `tput rmso`
ANSI_RESET_DIM := `tput dim`
ANSI_RESET_ITALIC := `tput ritm`
ANSI_RESET_UNDERLINE := `tput rmul`
ANSI_RESET_BLINK := `tput blink`
ANSI_RESET_REVERSE := `tput rev`
ANSI_RESET_HIDDEN := `tput invis`

# Foreground colors (text)
ANSI_BLACK := `tput setaf 0`
ANSI_RED := `tput setaf 1`
ANSI_GREEN := `tput setaf 2`
ANSI_YELLOW := `tput setaf 3`
ANSI_BLUE := `tput setaf 4`
ANSI_MAGENTA := `tput setaf 5`
ANSI_CYAN := `tput setaf 6`
ANSI_WHITE := `tput setaf 7`
ANSI_GRAY := `tput setaf 8`
ANSI_DEFAULT := `tput op`

# Background colors
ANSI_BG_BLACK := `tput setab 0`
ANSI_BG_RED := `tput setab 1`
ANSI_BG_GREEN := `tput setab 2`
ANSI_BG_YELLOW := `tput setab 3`
ANSI_BG_BLUE := `tput setab 4`
ANSI_BG_MAGENTA := `tput setab 5`
ANSI_BG_CYAN := `tput setab 6`
ANSI_BG_WHITE := `tput setab 7`
ANSI_BG_GRAY := `tput setab 8`
ANSI_BG_DEFAULT := `tput setab 9`

# Bright foreground colors
ANSI_BRIGHT_BLACK := `tput setaf 8`
ANSI_BRIGHT_RED := `tput setaf 9`
ANSI_BRIGHT_GREEN := `tput setaf 10`
ANSI_BRIGHT_YELLOW := `tput setaf 11`
ANSI_BRIGHT_BLUE := `tput setaf 12`
ANSI_BRIGHT_MAGENTA := `tput setaf 13`
ANSI_BRIGHT_CYAN := `tput setaf 14`
ANSI_BRIGHT_WHITE := `tput setaf 15`

# Bright background colors
ANSI_BG_BRIGHT_BLACK := `tput setab 8`
ANSI_BG_BRIGHT_RED := `tput setab 9`
ANSI_BG_BRIGHT_GREEN := `tput setab 10`
ANSI_BG_BRIGHT_YELLOW := `tput setab 11`
ANSI_BG_BRIGHT_BLUE := `tput setab 12`
ANSI_BG_BRIGHT_MAGENTA := `tput setab 13`
ANSI_BG_BRIGHT_CYAN := `tput setab 14`
ANSI_BG_BRIGHT_WHITE := `tput setab 15`

# Run command, stripping ansi color codes
@_run command:
    echo "{{ANSI_BOLD}}Running command: {{ANSI_NORMAL}}{{command}}{{ANSI_NORMAL}}"
    eval "$(echo "{{command}}" | strip-ansi)"

# `echo` text in each color
@demo-console-colors:
    #!/usr/bin/env bash
    set -uo pipefail
    echo "{{ANSI_BOLD}}Bold{{ANSI_NORMAL}}"
    echo "{{ANSI_DIM}}Dim{{ANSI_NORMAL}}"
    echo "{{ANSI_ITALIC}}Italic{{ANSI_NORMAL}}"
    echo "{{ANSI_UNDERLINE}}Underline{{ANSI_NORMAL}}"
    echo "{{ANSI_BLINK}}Blink{{ANSI_NORMAL}}"
    echo "{{ANSI_REVERSE}}Reverse{{ANSI_NORMAL}}"
    echo "{{ANSI_HIDDEN}}Hidden{{ANSI_NORMAL}}"
    echo "{{ANSI_NORMAL}}Normal{{ANSI_NORMAL}}"
    echo "{{ANSI_RESET_BOLD}}Reset Bold{{ANSI_NORMAL}}"
    echo "{{ANSI_RESET_DIM}}Reset Dim{{ANSI_NORMAL}}"
    echo "{{ANSI_RESET_ITALIC}}Reset Italic{{ANSI_NORMAL}}"
    echo "{{ANSI_RESET_UNDERLINE}}Reset Underline{{ANSI_NORMAL}}"
    echo "{{ANSI_RESET_BLINK}}Reset Blink{{ANSI_NORMAL}}"
    echo "{{ANSI_RESET_REVERSE}}Reset Reverse{{ANSI_NORMAL}}"
    echo "{{ANSI_RESET_HIDDEN}}Reset Hidden{{ANSI_NORMAL}}"
    echo "{{ANSI_BLACK}}Black{{ANSI_NORMAL}}"
    echo "{{ANSI_RED}}Red{{ANSI_NORMAL}}"
    echo "{{ANSI_GREEN}}Green{{ANSI_NORMAL}}"
    echo "{{ANSI_YELLOW}}Yellow{{ANSI_NORMAL}}"
    echo "{{ANSI_BLUE}}Blue{{ANSI_NORMAL}}"
    echo "{{ANSI_MAGENTA}}Magenta{{ANSI_NORMAL}}"
    echo "{{ANSI_CYAN}}Cyan{{ANSI_NORMAL}}"
    echo "{{ANSI_WHITE}}White{{ANSI_NORMAL}}"
    echo "{{ANSI_GRAY}}Gray{{ANSI_NORMAL}}"
    echo "{{ANSI_DEFAULT}}Default{{ANSI_NORMAL}}"
    echo "{{ANSI_BG_BLACK}}Background Black{{ANSI_NORMAL}}"
    echo "{{ANSI_BG_RED}}Background Red{{ANSI_NORMAL}}"
    echo "{{ANSI_BG_GREEN}}Background Green{{ANSI_NORMAL}}"
    echo "{{ANSI_BG_YELLOW}}Background Yellow{{ANSI_NORMAL}}"
    echo "{{ANSI_BG_BLUE}}Background Blue{{ANSI_NORMAL}}"
    echo "{{ANSI_BG_MAGENTA}}Background Magenta{{ANSI_NORMAL}}"
    echo "{{ANSI_BG_CYAN}}Background Cyan{{ANSI_NORMAL}}"
    echo "{{ANSI_BG_WHITE}}Background White{{ANSI_NORMAL}}"
    echo "{{ANSI_BG_GRAY}}Background Gray{{ANSI_NORMAL}}"
    echo "{{ANSI_BG_DEFAULT}}Background Default{{ANSI_NORMAL}}"
    echo "{{ANSI_BRIGHT_BLACK}}Bright Black{{ANSI_NORMAL}}"
    echo "{{ANSI_BRIGHT_RED}}Bright Red{{ANSI_NORMAL}}"
    echo "{{ANSI_BRIGHT_GREEN}}Bright Green{{ANSI_NORMAL}}"
    echo "{{ANSI_BRIGHT_YELLOW}}Bright Yellow{{ANSI_NORMAL}}"
    echo "{{ANSI_BRIGHT_BLUE}}Bright Blue{{ANSI_NORMAL}}"
    echo "{{ANSI_BRIGHT_MAGENTA}}Bright Magenta{{ANSI_NORMAL}}"
    echo "{{ANSI_BRIGHT_CYAN}}Bright Cyan{{ANSI_NORMAL}}"
    echo "{{ANSI_BRIGHT_WHITE}}Bright White{{ANSI_NORMAL}}"
    echo "{{ANSI_BG_BRIGHT_BLACK}}Background Bright Black{{ANSI_NORMAL}}"
    echo "{{ANSI_BG_BRIGHT_RED}}Background Bright Red{{ANSI_NORMAL}}"
    echo "{{ANSI_BG_BRIGHT_GREEN}}Background Bright Green{{ANSI_NORMAL}}"
    echo "{{ANSI_BG_BRIGHT_YELLOW}}Background Bright Yellow{{ANSI_NORMAL}}"
    echo "{{ANSI_BG_BRIGHT_BLUE}}Background Bright Blue{{ANSI_NORMAL}}"
    echo "{{ANSI_BG_BRIGHT_MAGENTA}}Background Bright Magenta{{ANSI_NORMAL}}"
    echo "{{ANSI_BG_BRIGHT_CYAN}}Background Bright Cyan{{ANSI_NORMAL}}"
    echo "{{ANSI_BG_BRIGHT_WHITE}}Background Bright White{{ANSI_NORMAL}}"
