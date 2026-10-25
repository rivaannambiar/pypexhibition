# Exhibition Workspace

**A private, connected workspace for a five-person PYP Exhibition group.** Chat, direct messages, live presence, project information, shared files, research, browser bookmarks, Roughbook notes, and the Padlet embed work together in one place.

## Zero-cost edition

This version is designed to run without paid services or a server runtime:

- **Firebase Spark plan** with Email/Password Authentication and Realtime Database.
- **Realtime Database only** for shared data and small file contents. No Firestore and no Firebase Storage.
- **No Cloud Functions, Node.js, npm, SMTP, email verification, search API key, or AI.**
- Static hosting can be deployed through a browser-based drag-and-drop upload to [Cloudflare Pages Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/), with no command-line tools needed.
- Research search uses Wikipedia's public search endpoint, so it has no sponsored result blocks or API key.

**Small-file trade-off:** Realtime Database is not a general-purpose file server. This version limits workspace uploads to **500 KB per file** and chat attachments to **150 KB**. Files are encoded into data URLs, which use more database space than the original file. For large files, save a shared link instead. Firebase documents the Spark Realtime Database no-cost quota as 1 GB stored and 10 GB/month downloaded; if you hit Spark limits, usage is restricted rather than billed automatically. Review the current [Realtime Database billing guide](https://firebase.google.com/docs/database/usage/billing).

The app is not connected to a Firebase project until you add your project's web config and publish the Realtime Database rules. Don't put private or sensitive information in a school prototype.

## What is included

### Collaboration and communication

1. Private workspace with five total seats shared between accepted members and pending invitations.
2. Realtime group chat.
3. One-to-one direct messages with participant-specific access rules.
4. Online presence based on Realtime Database connection sessions.
5. Live named collaborator cursors across workspace pages, including the research browser.
6. Member profiles and cursor colours.
7. Emoji reactions and message deletion by the message author.
8. Small chat attachments.
9. Shared activity history.
10. Invitation acceptance before a new member can join.

### Project hub

11. Shared central idea.
12. Lines of inquiry.
13. Transdisciplinary theme.
14. Key concepts and learner profile attributes.
15. SDG connection.
16. Action plan and weekly checkpoint.
17. Padlet iframe embed field, using your existing Padlet embed HTML as input.
18. Safe Padlet embed parsing: only the validated HTTPS Padlet iframe URL is rendered, not arbitrary pasted scripts.

### Files and thinking

19. Shared file library with a 500 KB per-file limit.
20. Nested folders.
21. Rename, move, and delete file/folder controls where provided by the interface.
22. Drag-and-drop upload area.
23. File types shown by a small type badge.
24. Roughbook with editable pages, source links, and a book-like layout.
25. Save selected text to Roughbook from the built-in research browser.
26. Chrome companion extension that adds **Add selection to Roughbook** to the right-click menu on normal webpages.
27. Source attribution for clipped passages.
28. Shared bookmarks.
29. Shared browsing history.
30. Search results using Wikipedia's public search endpoint, with no sponsored-result UI.
31. Browser tabs, back/forward history, reload, and open externally.

### Quality-of-life features

32. Dashboard with project overview and latest activity.
33. A shared weekly checkpoint.
34. Workspace-wide quick navigation/search.
35. Separate webpages and shared component styles/scripts.
36. Responsive dark UI, animated transitions, hover states, and motion effects.
37. Local demo mode so the UI can be explored before Firebase is configured.
38. Profile and interface preferences.
39. Invite links expire after seven days.
40. No email is sent automatically: the app prepares a link you send through your normal email app.

## Pages

| File | Purpose |
|---|---|
| `index.html` | Sign in, create an account, or enter demo mode |
| `dashboard.html` | Workspace overview and weekly checkpoint |
| `chat.html` | Group chat, direct messages, presence, small attachments |
| `files.html` | Shared folders and small file uploads |
| `project.html` | Central idea, lines of inquiry, PYP details, action plan, Padlet embed |
| `roughbook.html` | Animated Roughbook pages and saved clippings |
| `browser.html` | Search, tabs, bookmarks, browsing history, clipping |
| `members.html` | Member list, live presence, invitation links |
| `activity.html` | Shared activity history |
| `settings.html` | Profile and local interface settings |
| `join.html` | Review and explicitly accept an invitation |

The `assets/css/` and `assets/js/` directories keep the styles and feature logic split into separate files. `extension/` contains the Chrome Roughbook Clipper.

## 1. Configure Firebase (browser only, no command line)

### Create the free Firebase project

1. Open the [Firebase Console](https://console.firebase.google.com/) and create a project.
2. Keep it on the **Spark (no-cost) plan**. Do not link a billing account for this version.
3. Register a Firebase Web App in Project settings.
4. Under **Authentication → Sign-in method**, enable **Email/Password**.
5. Under **Realtime Database**, create a database.
6. In Realtime Database → **Rules**, paste the complete contents of `database.rules.json` and click **Publish**.
7. Add your eventual site hostname to Authentication → Settings → Authorized domains. For Cloudflare Pages, this will be your project's `*.pages.dev` hostname. For local preview, add `localhost` if needed.

**Do not create a Cloud Storage bucket.** Firebase's current documentation says that Cloud Storage for Firebase requires the Blaze pay-as-you-go plan for new buckets, so this project deliberately stores small files in Realtime Database instead. See [Firebase's Storage billing requirements](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024).

### Add the Firebase web config

Open `assets/js/firebase-config.js` and replace the placeholders with the values shown in Firebase Console → Project settings → Your apps. Keep the `databaseURL` exactly as Firebase provides it. No `storageBucket` field is needed.

Example shape (these are placeholders, not working credentials):

```js
export const firebaseConfig = {
  apiKey: "YOUR_WEB_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_FIREBASE_APP_ID",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com"
};
```

The Firebase web config is client-side information by design. **Security comes from Authentication and database rules**, not by hiding this config. Never place service-account credentials or private API keys in this website.

## 2. Deploy the static website without Node.js

Cloudflare Pages supports direct upload of a folder or ZIP from its dashboard. No Node.js, npm, Firebase CLI, or build step is required for this plain HTML/CSS/JS site.

1. Extract this project ZIP.
2. Open the [Cloudflare dashboard](https://dash.cloudflare.com/) and go to **Workers & Pages**.
3. Choose **Create application → Pages → Drag and drop your files** (wording can vary slightly).
4. Give the project a unique name and upload the extracted project folder or a ZIP of its contents.
5. Deploy. Cloudflare Pages will give you an HTTPS address ending in `pages.dev`. The site files are public to visitors, so never store secrets in the frontend source.
6. Add that exact hostname under Firebase Authentication → Settings → Authorized domains.
7. Open the deployed address, create your account, and create the workspace as the first member.

Reference: [Cloudflare Pages Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/).

For a local preview, run a simple HTTP server from the extracted folder if Python is already installed:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`. This local preview and local demo are only for trying the UI; multiple devices need the deployed HTTPS site and a configured Firebase project to share data.

## 3. Invite your four teammates (no SMTP or verification email)

1. Open **Members → Invite teammate**.
2. Enter the teammate's email and create the invitation.
3. Click **Open email draft** to open your normal email app with the invite link, or copy the link manually.
4. Send the email yourself. The website does not send email.
5. The teammate opens the invite link, uses the same email address entered by the inviter, and creates/signs into their Firebase account.
6. They press **Create account & accept** or **Sign in & accept**. Only after the acceptance workflow succeeds does the account become a workspace member.

Invitations expire after seven days and are single-use. Since email verification is disabled and no email is sent by the app, **the system cannot prove that the invitee owns the typed email address**. The random invitation link acts as the acceptance token, so share it only with the intended person. Anyone who obtains a still-valid invitation link and can create/sign in to an account with the invited email may attempt to accept it.

## 4. Storage rules — read this carefully

### Firebase Realtime Database rules

The actual shared file payloads live at `fileContents/<workspaceId>/<fileId>` in Realtime Database. Their access rules are included in `database.rules.json` and enforce membership, the uploader ID for initial writes, and a 500 KB maximum. Chat attachments are embedded in message records with a 150 KB limit.

In the Firebase Console, open **Realtime Database → Rules**, paste `database.rules.json` and publish it. This is essential; leaving the default open/test rules in place would expose the project.

### Firebase Storage rules

This project does **not** use Firebase Storage. `storage.rules` is intentionally deny-all:

```text
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

Do not create or deploy a Storage bucket for this no-payment version. If your Firebase project already has Storage rules configured, keep them deny-all for this app. The file library's permissions are governed by **Realtime Database rules**, not `storage.rules`.

### Important quota and privacy notes

- Realtime Database Spark includes a documented no-cost quota of 1 GB stored and 10 GB/month downloaded. Review current details in the [Firebase RTDB billing guide](https://firebase.google.com/docs/database/usage/billing).
- Base64/data-URL file payloads use more space than the original file and can increase database downloads. Keep uploads small; this is not intended for video or large PDFs.
- Anyone with accepted membership can read shared project files and group chat. Direct-message records have participant-specific read/write checks.
- A public-facing static host serves the frontend files publicly. The Firebase database remains protected by Authentication and its rules.
- No automated email is sent. The user manually sends the invitation URL via their usual email service.
- Padlet embedding validates and renders the iframe URL from the embed HTML. Arbitrary pasted scripts are not executed.
- The research browser is a research workspace, not a full Chrome replacement. Some external sites prohibit iframe embedding; open those in a normal tab and use the extension to clip text.

## Install the Roughbook Clipper (Chrome)

1. In Chrome, open `chrome://extensions`.
2. Turn on **Developer mode** and choose **Load unpacked**.
3. Select this project's `extension/` folder.
4. Open the extension's **Details → Extension options** page.
5. Paste your deployed workspace URL (for example, `https://your-project.pages.dev/`) and save it.
6. On an ordinary webpage, select text, right-click, and choose **Add selection to Roughbook**. The extension opens a Roughbook page with the selection, page title, and source URL prefilled. Review and save it.

The extension only receives the text selection and tab URL/title when you explicitly click its context-menu action. It does not continuously read page contents.

## Project structure

```text
.
├── index.html / dashboard.html / chat.html / files.html / ...
├── assets/
│   ├── css/          # tokens, layout, components, page styles, motion
│   └── js/           # Firebase setup, workspace shell, feature modules
├── extension/        # Chrome right-click Roughbook clipper
├── database.rules.json
└── storage.rules     # deny-all; Firebase Storage is unused
```

## Troubleshooting

- **The demo works but teammates do not sync:** Replace Firebase config placeholders, enable Email/Password Authentication, publish `database.rules.json`, and use the deployed HTTPS site.
- **Authentication says the domain is not authorised:** Add the exact `pages.dev` hostname under Firebase Authentication → Settings → Authorized domains.
- **Invite link opens but joining fails:** Verify the link is complete and not expired, the email matches, and the RTDB rules have been published.
- **Small file upload fails:** Check that the file is under 500 KB and that `database.rules.json` is current. The whole data URL is stored in Realtime Database.
- **Chat attachment fails:** Keep it under 150 KB.
- **A website won't display inside the research browser:** Open it in a normal tab; the website may block iframe embedding. Use the extension to clip text from that tab.
- **The extension opens the wrong URL:** Open its options and save the complete deployed HTTPS URL including its trailing slash.
