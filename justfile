set shell := ["bash", "-O", "globstar", "-c"]
set dotenv-filename := ".envrc"

factorio_prints_dir := env('FACTORIO_PRINTS_DIR', '~/projects/factorio.school')
ui_module := env('UI_MODULE', 'factorio-prints-dropwizard-application-ui-static')

default:
    @just --list --unsorted

# Build and sync to {{FACTORIO_PRINTS_DIR}}
build:
    npm install --legacy-peer-deps
    GENERATE_SOURCEMAP=true op run --env-file=".envrc" -- npm run build
    npm run styles
    # Source maps are uploaded to Sentry during build, then deleted by the Sentry webpack plugin
    rsync -av build/ {{factorio_prints_dir}}/{{ui_module}}/src/main/resources/ui
    git -C {{factorio_prints_dir}} add {{ui_module}}/src/main/resources/ui
    git -C {{factorio_prints_dir}} commit --no-verify --message "Upgrade UI to $(git log -n1 --pretty='%H %s')" || true
    cd {{factorio_prints_dir}}/{{ui_module}} && just spotless json || true
    j absorb
    # git -C {{factorio_prints_dir}} push open-source HEAD:factorio.school

# `npm run start`
run:
    npm run start

# `factorio --dump-icon-sprites`
dump-icon-sprites:
    ~/Library/Application\ Support/Steam/SteamApps/common/Factorio/factorio.app/Contents/MacOS/factorio --dump-icon-sprites

# `rsync` icon sprites
sync-icon-sprites:
    rsync -av ~/Library/Application\ Support/factorio/script-output/entity/*.png         {{justfile_directory()}}/public/icons/entity/
    rsync -av ~/Library/Application\ Support/factorio/script-output/fluid/*.png          {{justfile_directory()}}/public/icons/fluid/
    rsync -av ~/Library/Application\ Support/factorio/script-output/item-group/*.png     {{justfile_directory()}}/public/icons/item-group/
    rsync -av ~/Library/Application\ Support/factorio/script-output/item/*.png           {{justfile_directory()}}/public/icons/item/
    rsync -av ~/Library/Application\ Support/factorio/script-output/quality/*.png        {{justfile_directory()}}/public/icons/quality/
    rsync -av ~/Library/Application\ Support/factorio/script-output/recipe/*.png         {{justfile_directory()}}/public/icons/recipe/
    rsync -av ~/Library/Application\ Support/factorio/script-output/space-location/*.png {{justfile_directory()}}/public/icons/space-location/
    rsync -av ~/Library/Application\ Support/factorio/script-output/technology/*.png     {{justfile_directory()}}/public/icons/technology/
    rsync -av ~/Library/Application\ Support/factorio/script-output/tile/*.png           {{justfile_directory()}}/public/icons/tile/
    rsync -av ~/Library/Application\ Support/factorio/script-output/virtual-signal/*.png {{justfile_directory()}}/public/icons/virtual-signal/

# Override this with a command called `woof` which notifies you in whatever ways you prefer.
# My `woof` command uses `echo`, `say`, and sends a Pushover notification.
echo_command := env('ECHO_COMMAND', "echo")

# Run lint check
lint:
    npx eslint src/**/*.{js,ts,tsx}

# Run type check
typecheck:
    npx tsc --noEmit

# Compile styles
styles:
    npm run styles

# Run tests
test:
    npm test -- --watchAll=false

# Run all validation checks before committing
precommit: lint typecheck styles test
