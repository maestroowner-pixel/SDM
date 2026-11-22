// The step-by-step manual of SDM Web (components/ManualSteps, Settings → Manual):
// a screen = where it is + what can be done there, each a chain of steps.
// English only: **Label** is the app's own English label (a button, a field or an
// icon), " → " joins a path. The mobile app has its own copy with phone steps
// (camera, share sheet, store purchases) — keep both in step when a flow changes.

export interface StepAct { t: string; steps: string[]; note?: string; premium?: boolean }
export interface StepScreen { id: string; title: string; path: string[]; intro: string; acts: StepAct[] }
export interface StepGroup { title: string; screens: StepScreen[] }

export const MANUAL_STEPS: StepGroup[] = [
  {
    title: 'Getting started',
    screens: [
      {
        id: 'first',
        title: 'First visit',
        path: ['web.kuka-soft.com'],
        intro: 'SDM Web works in the browser straight away, without an account. Your records are kept in this browser. A fictional seafarer fills every screen so you can try everything first.',
        acts: [
          {
            t: 'Move between screens',
            steps: [
              'Click a screen in the menu on the left',
            ],
          },
          {
            t: 'Try the example data',
            steps: [
              'Open any screen — Documents, Sea Service, CV…',
              'Edit, add or delete records as you like',
            ],
          },
          {
            t: 'Remove the example and start with your own data',
            steps: [
              'Strip at the top: «This is example data…» → **Delete**',
              'Confirm **Delete**',
              'All screens are empty — enter your own data',
            ],
            note: 'Your changes to the example are removed too. The example never comes back.',
          },
          {
            t: 'Bring your data from the phone app',
            steps: [
              'Sign in with the same account as in the phone app (see Account & sync)',
              'Or in the phone app save a backup and here **Settings** → **Import backup**',
            ],
            note: 'Scans and attachments do not sync — they come over only with a backup file.',
          },
        ],
      },
      {
        id: 'account',
        title: 'Account & sync',
        path: ['Settings', 'Account & Sync'],
        intro: 'Optional. With an account your records open on your phone and other computers and stay in sync, and the 14-day free trial starts.',
        acts: [
          {
            t: 'Create an account',
            steps: [
              '**Settings** → **Sign in to sync**',
              '**Create one**',
              'Type your email and a password twice → **Create account**',
              'Open the link in the email you receive',
              'Back here: **I\'ve verified — continue**',
            ],
            note: 'After you start your own data, SDM Web also offers this once: **Sign in** / **Not now**.',
          },
          {
            t: 'Sign in with an existing account',
            steps: [
              '**Settings** → **Sign in to sync**',
              'Type your email and password → **Sign in**',
            ],
            note: 'The phone app and SDM Web use the same account.',
          },
          {
            t: 'Reset a forgotten password',
            steps: [
              '**Settings** → **Sign in to sync** → **Forgot password?**',
              'Type your email → **Send reset link**',
              'Follow the link in the email',
            ],
          },
          {
            t: 'Stop syncing',
            steps: [
              '**Settings** → **Sign out**',
            ],
            note: 'Your data stays in this browser.',
          },
        ],
      },
    ],
  },
  {
    title: 'Your profile',
    screens: [
      {
        id: 'personal',
        title: 'Personal Information',
        path: ['Personal Information'],
        intro: 'The base of your CV and QR code: name, photo, contacts, visas and career preferences.',
        acts: [
          {
            t: 'Fill in or change your details',
            steps: [
              '**Edit Personal Information**',
              'Type the fields you need',
              '**Save Changes**',
            ],
          },
          {
            t: 'Add a photo',
            steps: [
              'Click the **camera** icon on the photo',
              'Choose an image file on the computer',
            ],
          },
          {
            t: 'Set the position, day rate and availability',
            steps: [
              '**Edit Personal Information**',
              '**Applied Position** — pick it, or **Other** and type your own',
              'Type the minimum day rate, pick the currency, tick negotiable if it is',
              'Set the date you are available from → **Save Changes**',
            ],
          },
        ],
      },
      {
        id: 'biometrics',
        title: 'Biometrics',
        path: ['Biometrics'],
        intro: 'Height, weight, shoe and overall size, eye and hair colour, blood type.',
        acts: [
          {
            t: 'Fill in your biometrics',
            steps: [
              '**Edit Biometrics**',
              'Type the sizes; pick eye colour, hair colour and blood type',
              '**Save Changes**',
            ],
          },
        ],
      },
      {
        id: 'education',
        title: 'Education',
        path: ['Education'],
        intro: 'Institution, degree, graduation year, languages and skills — printed in the CV.',
        acts: [
          {
            t: 'Fill in your education',
            steps: [
              '**Edit Education**',
              'Type the institution, degree, specialization and graduation year',
              'Add languages, English level and additional skills',
              '**Save Changes**',
            ],
          },
        ],
      },
      {
        id: 'nok',
        title: 'Emergency Contact',
        path: ['Emergency Contact'],
        intro: 'Your next of kin.',
        acts: [
          {
            t: 'Add your next of kin',
            steps: [
              '**Edit Next of Kin**',
              'Type the name, relationship, phone, email and address',
              '**Save Changes**',
            ],
            note: 'On the free plan the CV shows only the name.',
          },
        ],
      },
      {
        id: 'notes',
        title: 'Notes',
        path: ['Notes'],
        intro: 'Free text for anything that fits nowhere else. Saved as you type.',
        acts: [
          {
            t: 'Write a note',
            steps: [
              'Click the text field and type',
            ],
          },
          {
            t: 'Put the notes in your CV',
            steps: [
              'Tick **Include in CV**',
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'Documents and sea service',
    screens: [
      {
        id: 'documents',
        title: 'Documents',
        path: ['Documents'],
        intro: 'Certificates, passports and licences with their expiry dates and files.',
        acts: [
          {
            t: 'Add a document',
            steps: [
              '**+** (top right)',
              'Pick a category',
              'Type the name, number, issue date, expiry date and place of issue',
              'No expiry? Tick **No Expiry Date**',
              '**Save**',
            ],
            note: 'Free plan: the first 6 documents. More come over from the phone too, but stay locked until Premium.',
          },
          {
            t: 'Attach a PDF or a photo',
            steps: [
              'Open the document → **paperclip**',
              'Choose a PDF or an image on the computer',
              '**Save**',
            ],
            note: 'Click an attached file to open it in a new tab.',
          },
          {
            t: 'Find a document',
            steps: [
              'Type in **Search documents...** — name, number or category',
              'Or click a category chip to see only that type',
            ],
          },
          {
            t: 'Change or delete a document',
            steps: [
              'On the document card: **pencil** to edit, **bin** to delete',
            ],
          },
        ],
      },
      {
        id: 'seaservice',
        title: 'Sea Service',
        path: ['Sea Service'],
        intro: 'Every contract, with total sea time and STCW revalidation time counted for you.',
        acts: [
          {
            t: 'Add a contract',
            steps: [
              '**+** (top right)',
              'Type the vessel name, pick the vessel type and position',
              'Type flag, tonnage, engine, company; DP class and system; crane make, type and SWL',
              'Set **Sign On**; leave **Sign Off** empty while you are on board',
              '**Save**',
            ],
            note: 'Free plan: the first 6 contracts.',
          },
          {
            t: 'Attach a discharge or contract file',
            steps: [
              'Open the contract → **paperclip**',
              'Choose a PDF or an image → **Save**',
            ],
          },
          {
            t: 'Count a contract for revalidation, or leave it out',
            steps: [
              'Click the badge at the top right of the contract card — green counts, red does not',
              'The total is under **Sea service for revalidation**',
            ],
          },
          {
            t: 'Change or delete a contract',
            steps: [
              'On the contract card: **pencil** to edit, **bin** to delete',
            ],
          },
        ],
      },
      {
        id: 'scans',
        title: 'Scans Manager',
        path: ['Scans Manager'],
        intro: 'Every file in SDM Web in one list: files attached to documents and contracts, and your own uploads.',
        acts: [
          {
            t: 'Upload files',
            steps: [
              '**upload** icon (top right)',
              'Choose PDFs or images — several images become one PDF',
            ],
            note: 'A ZIP made in the phone app can be uploaded too — it is unpacked.',
          },
          {
            t: 'Open, download or rename a file',
            steps: [
              '**eye** — opens it in a new tab',
              '**download** — saves it to the computer',
              '**pencil** — type a new name',
            ],
          },
          {
            t: 'Download several files as one ZIP',
            steps: [
              'Click the files to select them',
              '**Archive & Send**',
            ],
          },
          {
            t: 'Delete files',
            steps: [
              'Select the files → **Delete** → confirm',
            ],
            note: 'They are also removed from their documents and contracts.',
          },
        ],
      },
    ],
  },
  {
    title: 'CV and contacts',
    screens: [
      {
        id: 'cv',
        title: 'Maritime CV',
        path: ['Maritime CV'],
        intro: 'A CV made from everything you entered, with a live preview on the right.',
        acts: [
          {
            t: 'Save your CV as a PDF',
            steps: [
              '**Generate & Share PDF**',
              'In the print window choose **Save as PDF** as the printer',
              '**Save**',
            ],
            note: 'Free plan: the Classic design, without document numbers, dates and next-of-kin contacts.',
          },
          {
            t: 'Change the design',
            premium: true,
            steps: [
              'Left panel → **Design**',
              'Pick a **Layout**, an **Accent color** (or type a HEX) and a **Font**',
              '**Elements**: photo, QR codes, uppercase headings, striped tables',
              'The preview on the right changes at once',
            ],
          },
          {
            t: 'Choose what goes in',
            premium: true,
            steps: [
              'Left panel → **Content**',
              '**Sections** — switch on or off, move up or down',
              'Hide table columns; untick documents or contracts you do not want in this CV',
            ],
          },
          {
            t: 'Keep several CVs',
            premium: true,
            steps: [
              '**CV versions** → **Duplicate**',
              '**Rename** it — e.g. «Offshore», «Tanker»',
              'Change its design and content; switch versions in the list',
            ],
            note: 'Versions are saved in this browser only.',
          },
        ],
      },
      {
        id: 'qr',
        title: 'Contact QR Code',
        path: ['Contact QR Code'],
        intro: 'A QR code with your name, position, phone, email and messengers.',
        acts: [
          {
            t: 'Share your contact',
            steps: [
              'Open **Contact QR Code** and let the other person scan the screen',
              'Or **Save as PDF** to print it or send it',
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'Logs (switch on in Settings)',
    screens: [
      {
        id: 'dp',
        title: 'DP Log',
        path: ['Settings', 'Modules', 'DP Log'],
        intro: 'DP hours in 30-minute slots, active and passive, and the letter for The Nautical Institute.',
        acts: [
          {
            t: 'Switch the DP Log on',
            steps: [
              '**Settings** → **Modules** → switch on **DP Log**',
              '**DP Log** appears in the menu',
            ],
          },
          {
            t: 'Fill in the DPO and vessel details',
            steps: [
              '**Enter DPO Information** (top card)',
              'Type the vessel, IMO, GRT, DP class, contract period, company and signatory',
              '**Save**',
            ],
          },
          {
            t: 'Log a DP day',
            steps: [
              '**Add DP Day** → pick the date → **Add**',
              'Click the 30-minute slots: once = **Active (A)**, twice = **Passive (P)**, three times = empty',
              '**Done**',
            ],
            note: 'A day counts as valid from 2 hours of DP.',
          },
          {
            t: 'Print the letter for revalidation',
            steps: [
              '**New Scheme Letter** or **Old Scheme Letter**',
              'Print it, or choose **Save as PDF** in the print window',
            ],
          },
        ],
      },
      {
        id: 'crane',
        title: 'Crane Log',
        path: ['Settings', 'Modules', 'Crane Log'],
        intro: 'Crane operator hours in 30-minute slots and a signed hours log.',
        acts: [
          {
            t: 'Switch the Crane Log on',
            steps: [
              '**Settings** → **Modules** → switch on **Crane Log**',
              '**Crane Log** appears in the menu',
            ],
          },
          {
            t: 'Fill in the crane and vessel details',
            steps: [
              '**Enter Crane Log Information** (top card)',
              'Type the vessel, IMO, crane make, type and SWL, contract period, company and signatory',
              '**Done**',
            ],
          },
          {
            t: 'Log a crane day',
            steps: [
              '**Add Crane Day** → pick the date → **Add**',
              'Click the 30-minute slots you worked the crane — click again to clear',
              '**Done**',
            ],
          },
          {
            t: 'Print the hours log',
            steps: [
              '**Crane Hours Log (PDF)**',
              'Print it, or choose **Save as PDF** in the print window',
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'Settings and Premium',
    screens: [
      {
        id: 'settings',
        title: 'Settings',
        path: ['Settings'],
        intro: 'Theme, language, modules, backups and your plan.',
        acts: [
          {
            t: 'Switch the theme or the language',
            steps: [
              '**Settings** → **Appearance** → **Dark mode** on or off',
              '**Language** — your system language or EN',
            ],
          },
          {
            t: 'Save a backup',
            premium: true,
            steps: [
              '**Settings** → **Data** → **Export backup (.sdm)**',
              '**Full backup**; tick **Protect with a password** and type it twice (recommended)',
              '**Save** — the .sdm file goes to Downloads',
            ],
            note: 'A forgotten password cannot be recovered. The same file opens in the phone app.',
          },
          {
            t: 'Make a file for the vessel',
            premium: true,
            steps: [
              '**Settings** → **Export backup (.sdm)** → **File for the vessel**',
              'Set a password → **Save** and send it to the vessel',
            ],
            note: 'Details, next of kin, documents and sea service — no biometrics, rate, photo or notes. It cannot be restored here.',
          },
          {
            t: 'Restore a backup',
            premium: true,
            steps: [
              '**Settings** → **Data** → **Import backup**',
              'Choose the .sdm file; type its password if asked → **Open**',
            ],
            note: 'Everything in this browser is replaced by the backup.',
          },
          {
            t: 'Delete all data',
            steps: [
              '**Settings** → **Data** → **Clear All Data**',
              'Confirm **Delete Everything**',
            ],
            note: 'Signed in? Choose whether to erase only this browser or every synced device.',
          },
        ],
      },
      {
        id: 'premium',
        title: 'Premium',
        path: ['Settings', 'Premium'],
        intro: 'Premium: unlimited documents and contracts, the CV editor and versions, full details in the CV, backups. A signed-in account gets 14 days free.',
        acts: [
          {
            t: 'Buy Premium',
            steps: [
              '**Settings** → **Premium** → **Upgrade**',
              '**Get Premium** — pay on the checkout page that opens',
              'Copy the license key from the email you receive',
            ],
          },
          {
            t: 'Activate the license key',
            steps: [
              '**Settings** → **Upgrade**',
              'Under **Already purchased?** paste the key → **Activate**',
            ],
            note: 'Signed in? The key goes with your account to your other browsers.',
          },
          {
            t: 'Use Premium bought in the phone app',
            steps: [
              'Sign in here with the same account as in the phone app',
            ],
          },
          {
            t: 'Free up the key on this computer',
            steps: [
              '**Settings** → **Upgrade** → **Remove from this device**',
            ],
          },
        ],
      },
    ],
  },
];
