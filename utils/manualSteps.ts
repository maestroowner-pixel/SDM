// The step-by-step manual (components/ManualSteps, first chip of the Manual):
// a screen = where it is + what can be done there, each a chain of steps.
// English only, like the rest of the Manual: **Label** is the app's own English
// label (a button, a field or an icon), " → " joins a path. Keep it in step with
// the screens when a label or a flow changes.

export interface StepAct { t: string; steps: string[]; note?: string; premium?: boolean }
export interface StepScreen { id: string; title: string; path: string[]; intro: string; acts: StepAct[] }
export interface StepGroup { title: string; screens: StepScreen[] }

export const MANUAL_STEPS: StepGroup[] = [
  {
    title: 'Getting started',
    screens: [
      {
        id: 'first',
        title: 'First launch',
        path: ['Open the app'],
        intro: 'The app works straight away, on the phone, without an account. A fictional seafarer fills every screen so you can try everything first.',
        acts: [
          {
            t: 'Open the app the first time',
            steps: [
              'Read the Terms of Service and the Privacy Policy',
              'Accept them to continue',
              'The app opens on **Personal Information**, filled with example data',
            ],
          },
          {
            t: 'Move between screens',
            steps: [
              'Tap an icon in the bar at the bottom',
              'Or swipe left / right on a screen to go to the next one',
            ],
          },
          {
            t: 'Try the example data',
            steps: [
              'Open any screen — Documents, Sea Service, CV…',
              'Edit, add or delete records as you like',
            ],
            note: 'Example documents expire on different dates, so you can also try the expiry badges and the reminders.',
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
        ],
      },
      {
        id: 'account',
        title: 'Account & sync',
        path: ['Settings', 'Account & Sync'],
        intro: 'Optional. With an account your records open on your other devices and in SDM Web (web.kuka-soft.com) and stay in sync. Scans and attachments are not synced.',
        acts: [
          {
            t: 'Create an account',
            steps: [
              '**Settings** → **Sign in to sync**',
              '**Create one**',
              'Type your email and a password twice → **Create account**',
              'Open the link in the email you receive',
              'Back in the app: **I\'ve verified — continue**',
            ],
            note: 'After you start your own data, the app also offers this once: **Sign in** / **Not now**.',
          },
          {
            t: 'Sign in on another device',
            steps: [
              '**Settings** → **Sign in to sync**',
              'Type the same email and password → **Sign in**',
              'If both sides already hold different data, choose **Use cloud data** or **Upload phone data**',
            ],
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
              '**Settings** → **Sign out** → confirm',
            ],
            note: 'Your data stays on this device.',
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
              '**Edit Personal Information** (bottom of the screen)',
              'Type the fields you need',
              '**Save Changes**',
            ],
          },
          {
            t: 'Add a photo',
            steps: [
              'Tap the **camera** icon on the photo',
              'Choose a photo from the gallery or take one',
            ],
          },
          {
            t: 'Set the position you apply for',
            steps: [
              '**Edit Personal Information** → **Applied Position**',
              'Pick it from the list, or **Other** and type your own',
              '**Save Changes**',
            ],
            note: 'It is shown under your name in the CV and in the QR code.',
          },
          {
            t: 'Set your day rate and availability',
            steps: [
              '**Edit Personal Information**',
              'Type the minimum day rate and pick the currency; tick negotiable if it is',
              'Set the date you are available from',
              '**Save Changes**',
            ],
          },
        ],
      },
      {
        id: 'biometrics',
        title: 'Biometrics',
        path: ['Biometrics'],
        intro: 'Height, weight, shoe and overall size, eye and hair colour, blood type — what crewing agencies ask for.',
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
            note: '**Additional Skills** is a good place for ECDIS types, DP and crane experience.',
          },
        ],
      },
      {
        id: 'nok',
        title: 'Next of Kin',
        path: ['Next of Kin'],
        intro: 'Your emergency contact.',
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
              'Tap the text field and type',
            ],
          },
          {
            t: 'Put the notes in your CV',
            steps: [
              'Tick **Include in CV**',
            ],
            note: 'The notes go at the end of the CV — handy for a short cover letter.',
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
        intro: 'Certificates, passports and licences with their expiry dates and scans.',
        acts: [
          {
            t: 'Add a document',
            steps: [
              '**+** (top right)',
              'Pick a category — Passport, Seaman\'s Book, Diplomas, Medical, STCW, Offshore, National Endorsements, Other',
              'Type the name, number, issue date, expiry date and place of issue',
              'No expiry? Tick **No Expiry Date**',
              '**Save**',
            ],
            note: 'Free plan: up to 5 documents.',
          },
          {
            t: 'Attach a scan or a PDF',
            steps: [
              'Open the document → paperclip',
              '**From my scans**, **From phone files** or **Scan with camera**',
              'For a camera scan: take the photo, drag the corners to crop → **Done**',
              '**Save**',
            ],
            note: 'The file is renamed after the document automatically.',
          },
          {
            t: 'Find a document',
            steps: [
              'Type in the **search** field — name, number or category',
              'Or tap a category chip to see only that type',
              'The **list / clock** button switches between grouping by type and sorting by expiry date',
            ],
          },
          {
            t: 'Change or delete a document',
            steps: [
              'On the document card: **pencil** to edit, **bin** to delete',
            ],
            note: 'Deleting a document also deletes its attached scan.',
          },
          {
            t: 'Read the expiry colours',
            steps: [
              'Red — less than 60 days left or expired',
              'Yellow — 60 to 90 days left',
              'Green — more than 90 days left',
            ],
          },
          {
            t: 'Get reminders before documents expire',
            steps: [
              '**Settings** → **Notifications** → switch on **Document expiry notifications**',
              'Allow notifications when the phone asks',
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
              'Type the vessel name and pick the vessel type and position',
              'Type flag, gross tonnage, engine type and power, company',
              'Set **Sign On**; leave **Sign Off** empty while you are still on board',
              'DP vessel: type DP class and DP system; crane operator: crane make, type and SWL',
              '**Save**',
            ],
          },
          {
            t: 'Attach a contract document or discharge',
            steps: [
              'Open the contract → paperclip',
              '**From my scans**, **From phone files** or **Scan with camera**',
              '**Save**',
            ],
          },
          {
            t: 'Count a contract for revalidation, or leave it out',
            steps: [
              'Tap the **R** badge on the contract card — green counts, grey does not',
              'The header shows the total under **Sea service for revalidation**',
            ],
            note: 'Tap **ⓘ** next to the total for how STCW months are counted. Contracts without a sign-off date are not counted.',
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
        intro: 'Every file in the app in one list: scans attached to documents and contracts, and your own camera scans.',
        acts: [
          {
            t: 'Scan a paper with the camera',
            steps: [
              '**+** (top right)',
              'Allow the camera the first time',
              'Take the photo, drag the corners to crop → **Done**',
              'More pages? **Add page**; finished → **Save PDF**',
            ],
            note: 'The new PDF can then be attached to any document: paperclip → **From my scans**.',
          },
          {
            t: 'Look at or rename a file',
            steps: [
              '**eye** icon — opens the PDF',
              '**pencil** icon — type a new name',
            ],
          },
          {
            t: 'Send several files at once',
            steps: [
              'Tap the files to select them',
              '**Archive & Send**',
              'Choose email, a messenger or Files',
            ],
          },
          {
            t: 'Delete files',
            steps: [
              'Select the files → **Delete** → confirm',
            ],
            note: 'The files are also removed from their documents and contracts. This cannot be undone.',
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
        intro: 'A PDF résumé made from everything you entered.',
        acts: [
          {
            t: 'Make and send your CV',
            steps: [
              'Fill in Personal Information, Documents and Sea Service first',
              'Open **Maritime CV**',
              'Pick a design — Classic, Executive, Minimal, Offshore or Panels',
              '**Generate & Share PDF**',
              'Send it by email or a messenger, or save it to Files',
            ],
            note: 'Free plan: document numbers and dates and next-of-kin contacts are hidden in the CV.',
          },
        ],
      },
      {
        id: 'qr',
        title: 'Contact QR Code',
        path: ['Contact QR Code'],
        intro: 'A QR code with your name, position, phone, email and messengers. No home address.',
        acts: [
          {
            t: 'Share your contact',
            steps: [
              'Open **Contact QR Code**',
              'Show the screen to the other person',
              'They scan it with the phone camera and save the contact',
            ],
            note: 'The code is made from Personal Information — fill in phone, email and messengers there.',
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
        path: ['Settings', 'DP Log', 'DP Log tab'],
        intro: 'DP hours in 30-minute slots, active and passive, and the letter for The Nautical Institute.',
        acts: [
          {
            t: 'Switch the DP Log on',
            steps: [
              '**Settings** → switch on **DP Log (english only)**',
              'The **DP Log** tab appears in the bottom bar',
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
              'Tap the 30-minute slots: once = **Active (A)**, twice = **Passive (P)**, three times = empty',
              '**Done**',
            ],
            note: 'A day counts as valid from 2 hours of DP.',
          },
          {
            t: 'Change or delete a day',
            steps: [
              'Tap the day card',
              'Change the slots → **Done**, or **bin** to delete the day',
            ],
          },
          {
            t: 'Print the letter for revalidation',
            steps: [
              '**New Scheme Letter** or **Old Scheme Letter** (below the days)',
              'Share or print the PDF and have it signed',
            ],
          },
        ],
      },
      {
        id: 'crane',
        title: 'Crane Log',
        path: ['Settings', 'Crane Log', 'Crane Log tab'],
        intro: 'Crane operator hours in 30-minute slots and a signed hours log.',
        acts: [
          {
            t: 'Switch the Crane Log on',
            steps: [
              '**Settings** → switch on **Crane Log (english only)**',
              'The **Crane Log** tab appears in the bottom bar',
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
              'Tap the 30-minute slots you worked the crane — tap again to clear',
              '**Done**',
            ],
          },
          {
            t: 'Print the hours log',
            steps: [
              '**Crane Hours Log (PDF)**',
              'Share or print it and have it signed',
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'Settings',
    screens: [
      {
        id: 'settings',
        title: 'Settings',
        path: ['Settings'],
        intro: 'Theme, language, reminders, backups and your plan.',
        acts: [
          {
            t: 'Switch the theme',
            steps: [
              '**Settings** → **Appearance** → **Theme** — Dark or Light',
            ],
          },
          {
            t: 'Change the language',
            steps: [
              '**Settings** → **Language** → tap a language',
              '**Restart Now**',
            ],
          },
          {
            t: 'Save a backup',
            premium: true,
            steps: [
              '**Settings** → **Export Backup**',
              '**Full backup**',
              'Tick **Protect with a password** and type it twice (recommended)',
              '**Save** → keep the .sdm file in iCloud, Google Drive or email',
            ],
            note: 'A forgotten password cannot be recovered. Without a password anyone with the file can read your passport numbers.',
          },
          {
            t: 'Make a file for the vessel',
            premium: true,
            steps: [
              '**Settings** → **Export Backup** → **File for the vessel**',
              'Set a password → **Save** and send it to the vessel',
            ],
            note: 'It holds your details, next of kin, documents and sea service — no biometrics, rate, photo or notes. It cannot be restored in this app.',
          },
          {
            t: 'Restore a backup',
            premium: true,
            steps: [
              '**Settings** → **Import Backup**',
              'Pick the .sdm file; type its password if asked → **Open**',
            ],
            note: 'Everything on the phone is replaced by the backup.',
          },
          {
            t: 'Delete all data',
            steps: [
              '**Settings** → **Clear All Data**',
              'Confirm **Delete Everything**',
            ],
            note: 'Signed in? Choose whether to erase only this phone or every synced device. Save a backup first.',
          },
          {
            t: 'Get Unlimited',
            steps: [
              '**Settings** → **Get Unlimited**',
              'Pick monthly or lifetime and pay in the store',
            ],
            note: 'Unlimited: unlimited documents, full CV, backups. Reinstalled or a new phone? Open Settings — the purchase is restored from the store.',
          },
          {
            t: 'Update the app',
            steps: [
              'When a new version is out, the app asks once a day: **Update** opens the store page',
            ],
          },
        ],
      },
    ],
  },
];
