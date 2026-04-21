# bill-splitter

Static bill-splitting app with Supabase-backed sharing.

## Free Hosting

This repo can be hosted for free with GitHub Pages because the frontend is plain static files.

Expected app URL after Pages is enabled:

```text
https://thanapat2402.github.io/bill-splitter
```

## Deploy Steps

1. Push this repo to GitHub on the `main` branch.
2. In GitHub, open `Settings > Pages`.
3. Set `Source` to `GitHub Actions`.
4. Let the workflow in `.github/workflows/deploy-pages.yml` publish the site.

## Supabase App Base URL

After GitHub Pages is live, set this value in the deployed Supabase function environment:

```text
APP_BASE_URL=https://thanapat2402.github.io/bill-splitter
```

Then verify `create-trip` returns `viewUrl` and `editUrl` on the GitHub Pages origin instead of the Supabase Functions origin.