# GitHub My Reviews

A Chrome extension that highlights pull requests where your review is still
requested, regardless of other reviewers' approvals.

GitHub's own list keeps a PR under `review-requested:@me` until you submit a
review. This extension adds a "YOUR REVIEW NEEDED" badge and a colored border to
those rows so they stand out.

## How it works

The extension runs only on `github.com/pulls*` pages whose search includes
`review-requested:@me` (for example `/pulls/review-requested`). It reads the
page itself, so it needs **no access token, no API calls and no permissions**.

## Install from source

Requires [Bun](https://bun.sh).

```sh
bun install
bun run build
```

Then open `chrome://extensions`, enable **Developer mode**, click **Load
unpacked** and select the `dist/` folder.

## Development

```sh
bun run watch   # rebuild on change
bun run check   # typecheck, lint, format check
bun run format  # apply formatting
```

## Project layout

- `src/` – content script and DOM highlighter
- `styles/` – injected CSS
- `public/` – manifest and icons
- `design/` – icon source (not shipped)

## License

[MIT](LICENSE)
