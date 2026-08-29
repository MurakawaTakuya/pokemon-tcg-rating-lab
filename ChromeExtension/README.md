# Kaggle Rating Lab — Chrome extension

This unpacked Manifest V3 extension adds a rating-history side panel to Kaggle
competition pages. It uses the Kaggle session already active in the current
Chrome profile, so it does not need `auth.json`, Playwright, MySQL, or a local
server.

## Install locally

1. Open `chrome://extensions` in the Chrome profile where Kaggle is signed in.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this `ChromeExtension` directory.
5. Reload the Kaggle submissions page.

Click the **Rating Lab** button at the bottom-right of a Kaggle competition
page. The first open makes four paced requests: competitions, submissions, and
one episode-list request for each of the latest two submissions. Results are
cached locally. Further requests happen only when **Refresh** is pressed.

The extension only runs on `https://www.kaggle.com/competitions/*` and requests
only Chrome's local `storage` permission.
