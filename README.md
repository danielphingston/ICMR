# Nourish • Clinical nutrition workspace

Nourish is a buildless, vanilla JavaScript progressive web app. It has no package dependencies and keeps patient records in this browser on this device.

## Start

Install Node.js 18 or newer, then run `npm start` in this folder. Open [http://127.0.0.1:4173](http://127.0.0.1:4173). No package installation or build step is needed. `npm test` runs the nutrition and storage unit tests.

Use the same address and browser profile each time. `localhost:4173` and `127.0.0.1:4173` are different storage origins.

The local server listens only on `127.0.0.1`. Browsers permit service workers and installation at `localhost`; a phone on the same network cannot use that loopback address. Installing on a phone requires serving the app from an HTTPS origin and configuring the server for that origin.

## Doctor workflow

1. Choose **New patient** and enter a name or patient identifier. The initial example patient is a demonstration and is never saved.
2. Record height, weight, age, sex and habitual activity. Moderate activity is the default. Optional investigations include fasting glucose, HbA1c, haemoglobin, creatinine and lipid values, with units and a lab date. Record conditions, allergies, medication and clinical goals in the notes.
3. Review BMI and choose an energy method: ICMR adult reference, a labelled weight-scaled estimate, or a clinician-entered target. Actual, BMI-22.5 reference, and optional adjusted weight are available for scaling. Set macro percentages totalling 100%.
4. Review vegetarian/non-vegetarian food-group quantities, edit daily raw amounts, divide them among five meals and add practical food instructions. Meal percentages must total 100%; rounding preserves daily quantities.
5. Review and save a dated plan snapshot. Use **Print / save as PDF** for the patient-facing layout. Editing a reviewed plan returns its current version to draft while retaining the earlier snapshot.

Search and switch patients from **Patients**. **Edit patient → Archive patient** hides a record without deleting it; restore it in **Device & data**. Backups include archived patients and review history. Import previews the record counts and skips existing patient IDs instead of overwriting them.

## Calculation basis

- ICMR–NIN 2020 adult reference energy: men 2,110 / 2,710 / 3,470 kcal; women 1,660 / 2,130 / 2,720 kcal for sedentary / moderate / heavy work. Reference weights are 65 / 55 kg. The reference-based scope is 18–60 years.
- The optional scaled method uses the rounded reference kcal/kg values (men 32 / 42 / 53; women 30 / 39 / 49). Scaling is explicitly a planning estimate.
- BMI uses kg/m² with WHO adult categories. BMI-22.5 reference weight and adjusted weight `reference + 0.25 × (actual − reference)` are labelled app/clinical conventions, not ICMR-prescribed ideal-weight formulas. Adjusted weight is unavailable at or below reference weight and is never selected automatically.
- The editable macro starting split is 55% carbohydrate, 15% protein and 30% fat. Energy factors are 4, 4 and 9 kcal/g.
- Food-group quantities use NIN's 2024 My Plate Tables 1.2a/b, scaled from 2,000 kcal. They are raw edible quantities, not cooked household servings, standardized exchanges or an exact nutrient analysis. They do not guarantee a match to custom macro targets.
- Children, pregnancy and lactation are outside the automatic planner. Above age 60 a clinician-entered target is required. Biochemical data is recorded without automatic diagnosis or therapy adjustments.

Reference explanations are bundled in the app's **ICMR reference** page. Opening original source documents requires an internet connection:

- [NIN RDA/EAR 2020 brief note](https://www.nin.res.in/rdabook/brief_note.pdf)
- [NIN What India Eats, Table 8](https://nin.res.in/downloads/What_India_Eats%20Report_13th_April_23.pdf)
- [NIN Dietary Guidelines for Indians 2024](https://nin.res.in/dietaryguidelines/pdfjs/locale/DGI_2024.pdf)
- [WHO Technical Report 916](https://iris.who.int/bitstream/handle/10665/42665/WHO_TRS_916.pdf)

## Patient data and privacy

Patient information is stored in browser `localStorage` without encryption. Anyone who can use the browser profile may be able to access it, and clearing browser data can remove it. Export backups regularly and store them securely. Backups contain patient information in readable JSON. This local app does not transmit data to a server, but browser extensions, device backups, and other software on the device are outside its control.

## Offline use

After the first successful visit, the service worker caches the app shell for offline access. While online, requests check the current app files first and refresh the offline cache; when offline, cached files keep the workspace available. The server is for local development and does not configure TLS, authentication, or secure multi-user access.

The manifest includes regular and maskable icons. Use **Install app** in a supporting browser; Safari home-screen instructions appear when a native install prompt is unavailable. Fonts, icons, illustrations and scripts are local, with no CDN or analytics dependencies. Motion respects the device's reduced-motion preference.
