# Pushing a large repo over HTTPS

If `git push` fails or times out with a large commit (e.g. thousands of generated HTML files), try these in order.

---

## 1. Increase Git’s HTTP buffer (recommended first step)

Git’s default HTTP post buffer is 1 MiB. For large pushes, raise it:

```bash
git config http.postBuffer 524288000
```

That sets 500 MiB. Then run:

```bash
git push
```

To set it only for this repo (not globally), run the same from the repo root without `--global`. To set globally:

```bash
git config --global http.postBuffer 524288000
```

---

## 2. Use SSH instead of HTTPS

SSH avoids the same buffer/HTTPS limits and is often more reliable for large pushes.

**Check current remote:**

```bash
git remote -v
```

**Switch to SSH:**

```bash
git remote set-url origin git@github.com:USERNAME/nameorigin.git
```

Replace `USERNAME/nameorigin` with your GitHub user and repo name. Then:

```bash
git push
```

You need an SSH key added to your GitHub account (Settings → SSH and GPG keys).

---

## 3. Don’t commit generated pages (smaller repo, build on deploy)

To keep the repo small and avoid large pushes, you can stop tracking generated output and build it on deploy.

**Ignore generated dirs** (add to `.gitignore`):

```
/name/
/names/
/programmatic/
/sitemaps/
all-name-pages.html
alphabet-name-pages.html
country-name-pages.html
last-name-pages.html
style-name-pages.html
sitemap.xml
```

**Remove them from Git but keep on disk:**

```bash
git rm -r --cached name names programmatic sitemaps 2>/dev/null
git rm --cached all-name-pages.html alphabet-name-pages.html country-name-pages.html last-name-pages.html style-name-pages.html sitemap.xml 2>/dev/null
git commit -m "Stop tracking generated pages; build on deploy"
git push
```

**On Cloudflare Pages (or CI):** set build command to:

```bash
node scripts/generate-programmatic-pages.js && node scripts/build-sitemap.js
```

Then the site is built from source at deploy time and you only push code + data.

---

## Summary

| Fix | When to use |
|-----|----------------|
| **1. `http.postBuffer`** | First try; keeps using HTTPS. |
| **2. SSH remote** | If buffer isn’t enough or HTTPS is flaky. |
| **3. Ignore generated + build on deploy** | If you want a small repo and are okay building on deploy. |
