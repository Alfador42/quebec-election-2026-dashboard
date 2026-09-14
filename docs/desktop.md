# Windows desktop edition

Project location: `C:\Users\D\dev\Quebec election 2026 dashboard`.

Open `desktop-app/Quebec-2026-Dashboard.exe` or the `Open Dashboard` shortcut in the project folder. The portable Windows application opens its own window without Vite, a localhost server, or an external browser. Keep the executable inside the project folder so it can locate the live dataset. The application includes its display runtime; Node is only needed for development and the polling pipeline.

The application reads `public/data/dashboard.json` from this project every 60 seconds. It does not maintain a separate polling database. A failed refresh retains the last loaded data and shows a warning. The Dashboard menu also provides a manual refresh and an action to open the project folder. Source citations open in the default browser.

Collection remains the responsibility of the configured daily updater, which must run on an available host. Opening the desktop window does not itself collect new polls. The existing election-day cutoff applies to the collection pipeline.

## Development

- `npm ci` installs locked dependencies.
- `npm run desktop` builds the display and launches Electron.
- `npm run desktop:package` builds the Windows portable executable in `desktop-app`.
- `npm run desktop:smoke` checks a real desktop render and writes diagnostics and, where Windows capture is supported, a screenshot into `tmp/desktop`.
- `npm test` includes project discovery and resource boundary checks.

After UI changes, rebuild the desktop package. Dataset-only updates are picked up automatically and do not require repackaging. Generated executables and installed dependencies are ignored by Git.

## Architecture

Electron hosts the existing React presentation layer in a sandboxed, isolated renderer with Node integration disabled. A restricted `quebec://dashboard` protocol serves built presentation assets and the generated live dataset. It does not expose the raw filesystem or source documents to the renderer. Permissions are denied, new windows are blocked, and HTTPS citations are delegated to the operating system. Content Security Policy restricts scripts and connections to the application itself.

The executable locates the canonical project relative to its own location; it does not embed the old absolute workspace path. If opened outside the project tree, it asks for the project folder. Polling evidence, identity, review, and aggregation logic remain in the existing pipeline.

## Appearance controls

The Background selector in the header offers Light, Dark, and Warm paper. Your selection is saved locally and restored on reopening in the same browser profile or desktop app. Party-colour bars in the polling average are 9px thick. The donut uses a raised lower edge, shadow and rim highlights, preserving its top-face slice angles and original percentage labels.
