/* i18n.js — Maquette Atelier interface texts: French (default), English, Taqbaylit (Kabyle, Latin script) with
 * optional Tifinagh rendering of the Kabyle texts. Each entry is [fr, en, kab]; placeholders look like {n}.
 * The Kabyle texts are a first draft — corrections are welcome. Original texts, MIT licence. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.I18N = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const S = {
    skip: ['Aller à l’aperçu', 'Skip to the preview', 'Ddu ɣer teskant'],
    tagline: ['Maquettes réalistes de vos créations, en vraie perspective — tout reste sur votre appareil', 'Realistic mockups of your designs, in true perspective — everything stays on your device', 'Imedyaten n tefluka-k s tmuɣli n tidet — kullec yeqqim ɣur-k'],
    language: ['Langue', 'Language', 'Tutlayt'],
    tifinagh: ['Tifinagh', 'Tifinagh', 'S tifinaɣ'],
    uiTheme: ['Thème clair / sombre', 'Light / dark theme', 'Asentel aceɛlal / aberkan'],
    help: ['Aide', 'Help', 'Tallalt'],
    close: ['Fermer', 'Close', 'Mdel'],
    preview: ['Aperçu', 'Preview', 'Taskant'],
    settings: ['Réglages', 'Settings', 'Iɣewwaren'],
    viewerLabel: ['Aperçu de la maquette', 'Mockup preview', 'Taskant n umedya'],
    freeMode: ['Perspective libre', 'Free perspective', 'Tamuɣli tilellit'],
    resetPts: ['Réinitialiser les coins', 'Reset corners', 'Ales tiɣmert'],
    freeHint: ['Glissez les poignées rondes pour déplacer les coins (clavier : Tab sur l’aperçu, [ ] pour choisir un coin, flèches pour le déplacer).', 'Drag the round handles to move the corners (keyboard: Tab to the preview, [ ] to pick a corner, arrows to move it).', 'Zuɣer tiqeffalin akken ad tesnekzeḍ tiɣmert (anasiw: [ ] i ufran, tineccabin i usenkez).'],
    cornerN: ['Coin {n} / {t}', 'Corner {n} / {t}', 'Taɣmert {n} / {t}'],
    edited: ['perspective modifiée', 'perspective edited', 'tamuɣli tettwabeddel'],
    dropHere: ['Déposez vos visuels ici', 'Drop your designs here', 'Sers tugniwin-ik dagi'],
    // designs
    secDesigns: ['Vos visuels', 'Your designs', 'Tugniwin-ik'],
    addDesign: ['Ajouter des visuels', 'Add designs', 'Rnu tugniwin'],
    demoDesigns: ['Visuels de démo', 'Demo designs', 'Imedyaten'],
    designsHint: ['PNG, JPG, WebP ou SVG — glissez-déposez ou collez (Ctrl+V). Jusqu’à 6 visuels ; ils ne quittent jamais votre appareil.', 'PNG, JPG, WebP or SVG — drag and drop or paste (Ctrl+V). Up to 6 designs; they never leave your device.', 'PNG, JPG, WebP neɣ SVG — zuɣer neɣ senṭeḍ (Ctrl+V). Alamma d 6 n tugniwin; ur ttffeɣent ara seg ibenk-ik.'],
    designN: ['Visuel {n}', 'Design {n}', 'Tugna {n}'],
    remove: ['Retirer {name}', 'Remove {name}', 'Kkes {name}'],
    demoTag: ['démo', 'demo', 'amedya'],
    added: ['{n} visuel(s) ajouté(s).', '{n} design(s) added.', '{n} n tugniwin ttwarnant.'],
    maxDesigns: ['Six visuels au maximum.', 'Six designs at most.', 'Sḍis n tugniwin kan.'],
    loadErr: ['Impossible de lire « {f} ».', '“{f}” could not be read.', 'Ur yettwaɣer ara « {f} ».'],
    // scenes
    secScene: ['Scène', 'Scene', 'Asayes'],
    sc_poster: ['Affiche au mur', 'Poster on a wall', 'Aɣmis ɣef lḥiḍ'],
    sc_cards: ['Cartes de visite', 'Business cards', 'Tikarḍiwin n tirza'],
    sc_flyer: ['Flyer A4 / en-tête', 'A4 flyer / letterhead', 'Tawriqt A4'],
    sc_book: ['Livre / magazine', 'Book / magazine', 'Adlis / tasɣunt'],
    sc_phone: ['Téléphone', 'Phone', 'Tilifun'],
    sc_laptop: ['Ordinateur portable', 'Laptop', 'Aselkim amaḥmul'],
    sc_social: ['Publication réseaux', 'Social post', 'Tasuffeɣt n iẓeḍwan'],
    sc_box: ['Boîte d’emballage', 'Packaging box', 'Tabwaṭ n ukemmus'],
    sc_tote: ['Tote bag', 'Tote bag', 'Taqrabt n uceṭṭiḍ'],
    sc_billboard: ['Panneau / affichage', 'Billboard / signage', 'Tafelwit n udellel'],
    sc_libre: ['Perspective libre (votre photo)', 'Free perspective (your photo)', 'Tamuɣli tilellit (tawlaft-ik)'],
    sceneOpts: ['Options de la scène', 'Scene options', 'Iɣewwaren n usayes'],
    o_ratio: ['Proportions', 'Proportions', 'Assaɣ'], o_frame: ['Cadre', 'Frame', 'Akatar'], o_mat: ['Passe-partout (%)', 'Mat border (%)', 'Iri amellal (%)'],
    o_decor: ['Meuble et vase', 'Sideboard and vase', 'Aḥanut d ubuqal'], o_layout: ['Disposition', 'Layout', 'Asuddes'],
    o_radius: ['Coins arrondis (mm)', 'Rounded corners (mm)', 'Tiɣmert tibrurin (mm)'], o_thick: ['Épaisseur', 'Thickness', 'Tuzert'],
    o_format: ['Format', 'Format', 'Amasal'], o_second: ['Deuxième feuille', 'Second sheet', 'Tawriqt tis snat'], o_pencil: ['Crayon', 'Pencil', 'Akeryun'],
    o_pose: ['Position', 'Position', 'Addad'], o_size: ['Taille', 'Size', 'Tiddi'], o_spine: ['Texte du dos', 'Spine text', 'Aḍris n weɛrur'],
    o_island: ['Îlot de caméra', 'Camera island', 'Tigzirt n tkamiṛat'], o_open: ['Ouverture de l’écran (°)', 'Screen opening (°)', 'Alday n ugdil (°)'],
    o_dark: ['Mode sombre', 'Dark mode', 'Askar aberkan'], o_account: ['Nom du compte', 'Account name', 'Isem n umiḍan'],
    o_bw: ['Largeur (mm)', 'Width (mm)', 'Tehri (mm)'], o_bd: ['Profondeur (mm)', 'Depth (mm)', 'Tiqit (mm)'], o_bh: ['Hauteur (mm)', 'Height (mm)', 'Teɣzi (mm)'],
    o_finish: ['Finition', 'Finish', 'Taggara'], o_fabric: ['Couleur du tissu', 'Fabric colour', 'Ini n uceṭṭiḍ'], o_print: ['Taille de l’impression (%)', 'Print size (%)', 'Tiddi n usiggez (%)'],
    o_time: ['Moment', 'Time of day', 'Akud'], o_lamps: ['Projecteurs', 'Lamps', 'Tiftilin'], o_paper: ['Support papier', 'Paper backing', 'Lkaɣeḍ ddaw-as'],
    o_shadowOn: ['Ombre portée', 'Drop shadow', 'Tili'],
    'c_a-p': ['A (portrait)', 'A (portrait)', 'A (ibedd)'], 'c_a-l': ['A (paysage)', 'A (landscape)', 'A (yeknu)'],
    c_none: ['Aucun', 'None', 'Ulac'], c_black: ['Noir', 'Black', 'Aberkan'], c_white: ['Blanc', 'White', 'Amellal'], c_oak: ['Chêne', 'Oak', 'Akerruc'], c_alu: ['Aluminium', 'Aluminium', 'Aluminyum'],
    c_pair: ['Recto + verso', 'Front + back', 'Udem + deffir'], c_stack: ['Pile', 'Stack', 'Tazegrart'],
    c_a4: ['A4', 'A4', 'A4'], c_letter: ['US Letter', 'US Letter', 'US Letter'], c_dl: ['DL (99 × 210)', 'DL (99 × 210)', 'DL (99 × 210)'],
    c_stand: ['Debout', 'Standing', 'Ibedd'], c_lying: ['À plat', 'Lying flat', 'Yeknu'], c_flat: ['À plat sur le bureau', 'Flat on the desk', 'Yeknu ɣef ṭṭabla'],
    c_b5: ['17 × 24 cm', '17 × 24 cm', '17 × 24 cm'], c_a5: ['A5', 'A5', 'A5'], c_sq: ['Carré 20 cm', 'Square 20 cm', 'Amkuẓ 20 cm'], c_mag: ['Magazine 21 × 28', 'Magazine 21 × 28', 'Tasɣunt 21 × 28'],
    c_matte: ['Mat', 'Matte', 'Amaṭ'], c_gloss: ['Brillant', 'Gloss', 'Ifeǧǧeǧ'], c_kraft: ['Carton kraft', 'Kraft cardboard', 'Akarṭun kraft'],
    'c_4:3': ['4 × 3 m', '4 × 3 m', '4 × 3 m'], 'c_3:1': ['Bandeau 3:1', 'Banner 3:1', 'Abandu 3:1'], c_mupi: ['Abribus (sucette)', 'Street panel', 'Tafelwit n webrid'],
    c_day: ['Jour', 'Day', 'Ass'], c_dusk: ['Coucher de soleil', 'Sunset', 'Tafat n tmeddit'], c_night: ['Nuit', 'Night', 'Iḍ'],
    // slots
    secSlots: ['Emplacements', 'Slots', 'Imukan'],
    slPoster: ['Affiche', 'Poster', 'Aɣmis'], slFront: ['Face avant', 'Front', 'Udem'], slBack: ['Verso', 'Back', 'Deffir'],
    slSheet1: ['Feuille 1', 'Sheet 1', 'Tawriqt 1'], slSheet2: ['Feuille 2', 'Sheet 2', 'Tawriqt 2'], slCover: ['Couverture', 'Cover', 'Tadlist'],
    slSpine: ['Dos', 'Spine', 'Aɛrur'], slScreen: ['Écran', 'Screen', 'Agdil'], slPost: ['Image', 'Image', 'Tugna'], slSide: ['Côté', 'Side', 'Tama'],
    slTop: ['Dessus', 'Top', 'Ufella'], slPrint: ['Impression', 'Print', 'Asiggez'], slPanel: ['Affiche', 'Poster', 'Aɣmis'], slDesign: ['Visuel', 'Design', 'Tugna'],
    srcDef: ['Automatique', 'Automatic', 'Awurman'], srcAuto: ['Couleur dominante', 'Dominant colour', 'Ini agejdan'], srcNone: ['Vide', 'Empty', 'D ilem'],
    fit: ['Ajustement', 'Fit', 'Aserreg'], fitCover: ['Remplir', 'Fill', 'Ččar'], fitContain: ['Contenir', 'Contain', 'Sekcem'], fitStretch: ['Étirer', 'Stretch', 'Zzuɣer'],
    rotation: ['Rotation', 'Rotation', 'Tuzzya'],
    // view
    secView: ['Cadrage & caméra', 'Framing & camera', 'Asfeṛṛes & tkamiṛat'],
    aspect: ['Format de l’image', 'Image format', 'Amasal n tugna'], zoom: ['Zoom (%)', 'Zoom (%)', 'Asemɣer (%)'],
    yaw: ['Rotation de la caméra (°)', 'Camera rotation (°)', 'Tuzzya n tkamiṛat (°)'], pitch: ['Hauteur de la caméra (°)', 'Camera height (°)', 'Teɣzi n tkamiṛat (°)'],
    noCam: ['Dans cette scène, réglez la perspective avec les quatre coins.', 'In this scene, set the perspective with the four corners.', 'Deg usayes-a, serreg tamuɣli s rebɛa n tiɣmert.'],
    camReset: ['Les coins déplacés à la main ont été réinitialisés.', 'Hand-moved corners were reset.', 'Tiɣmert yettwasenkzen s ufus ttwalsent.'],
    // look
    secLook: ['Ambiance & couleurs', 'Mood & colours', 'Tagnit & initen'],
    themeLabel: ['Thème de couleurs', 'Colour theme', 'Asentel n yiniten'],
    th_lin: ['Lin', 'Linen', 'Ḍḍil'], th_atlas: ['Atlas', 'Atlas', 'Atlas'], th_terracotta: ['Terre cuite', 'Terracotta', 'Akal yeɣlin'], th_menthe: ['Menthe', 'Mint', 'Naɛnaɛ'],
    th_nuit: ['Nuit', 'Night', 'Iḍ'], th_safran: ['Safran', 'Saffron', 'Zeɛfran'], th_bois: ['Bois', 'Wood', 'Asɣar'], th_beton: ['Béton', 'Concrete', 'Abiṭun'], th_custom: ['Personnalisé', 'Custom', 'Udmawan'],
    bgMode: ['Fond', 'Background', 'Agilal'], bm_scene: ['Décor de la scène', 'Scene setting', 'Asayes'], bm_solid: ['Couleur unie', 'Solid colour', 'Yiwen yini'], bm_gradient: ['Dégradé', 'Gradient', 'Asefsex'], bm_none: ['Transparent', 'Transparent', 'Afrawan'],
    bg1: ['Fond 1', 'Background 1', 'Agilal 1'], bg2: ['Fond 2', 'Background 2', 'Agilal 2'], bgAngle: ['Angle du dégradé (°)', 'Gradient angle (°)', 'Tiɣmert n usefsex (°)'],
    material: ['Matière (mur / table)', 'Material (wall / table)', 'Tanga (lḥiḍ / ṭṭabla)'],
    mat_plain: ['Uni', 'Plain', 'Yiwen yini'], mat_wood: ['Bois', 'Wood', 'Asɣar'], mat_concrete: ['Béton', 'Concrete', 'Abiṭun'], mat_linen: ['Lin', 'Linen', 'Ḍḍil'],
    mat_plaster: ['Enduit', 'Plaster', 'Lǧir'], mat_brick: ['Brique', 'Brick', 'Ajur'], mat_terrazzo: ['Terrazzo', 'Terrazzo', 'Terrazzo'],
    surface: ['Mur / table', 'Wall / table', 'Lḥiḍ / ṭṭabla'], paper: ['Papier', 'Paper', 'Lkaɣeḍ'], device: ['Appareils', 'Devices', 'Ibenkan'], accent: ['Accent', 'Accent', 'Ini n tezmert'],
    bgPhoto: ['Photo de fond', 'Background photo', 'Tawlaft n ugilal'], bgPhotoBtn: ['Choisir une photo', 'Choose a photo', 'Fren tawlaft'], bgPhotoClear: ['Retirer la photo', 'Remove the photo', 'Kkes tawlaft'],
    bgPhotoHint: ['Votre propre photo (mur, vitrine, t-shirt…) : placez les quatre coins sur la surface, l’impression « encrée » se fond dans la photo.', 'Your own photo (wall, shop window, T-shirt…): put the four corners on the surface; “inked” printing blends into the photo.', 'Tawlaft-ik (lḥiḍ, tamsalt…): sers rebɛa n tiɣmert ɣef wudem.'],
    // light
    secLight: ['Lumière & matière', 'Light & material', 'Tafat & tanga'],
    light: ['Direction de la lumière (°)', 'Light direction (°)', 'Tanila n tafat (°)'], lightK: ['Intensité de la lumière', 'Light strength', 'Tazmert n tafat'],
    shadow: ['Ombres', 'Shadows', 'Tili'], soft: ['Douceur des ombres', 'Shadow softness', 'Leqqaqa n tili'], gloss: ['Brillance / reflets', 'Gloss / reflections', 'Afeǧǧeǧ'],
    ink: ['Impression « encrée » (produit)', '“Inked” print (multiply)', 'Asiggez s lmidad (multiply)'], paperTex: ['Texture du papier', 'Paper texture', 'Taɣessa n lkaɣeḍ'],
    grain: ['Grain', 'Grain', 'Iẓẓan'], vignette: ['Vignettage', 'Vignette', 'Aɣlaf'],
    deco: ['Ombres décoratives', 'Decorative shadows', 'Tili n ucebbeḥ'], deco_none: ['Aucune', 'None', 'Ulac'], deco_leaves: ['Feuillage', 'Leaves', 'Ifriwen'], deco_blinds: ['Store', 'Blinds', 'Asatu'],
    decoK: ['Intensité', 'Strength', 'Tazmert'],
    // export
    secExport: ['Exporter', 'Export', 'Sifeḍ'],
    exportSize: ['Taille (bord long, px)', 'Size (long edge, px)', 'Tiddi (iri ameqqran, px)'],
    transparent: ['Fond transparent (PNG)', 'Transparent background (PNG)', 'Agilal afrawan (PNG)'],
    png: ['Exporter PNG', 'Export PNG', 'Sifeḍ PNG'], jpg: ['Exporter JPG', 'Export JPG', 'Sifeḍ JPG'], jpgQ: ['Qualité JPG', 'JPG quality', 'Taɣara n JPG'],
    settingsJson: ['Réglages (JSON)', 'Settings (JSON)', 'Iɣewwaren (JSON)'], importJson: ['Importer des réglages', 'Import settings', 'Kter iɣewwaren'],
    copyLink: ['Copier le lien', 'Copy link', 'Nɣel aseɣwen'], resetAll: ['Tout réinitialiser', 'Reset all', 'Ales kullec'],
    exportHint: ['Le PNG/JPG est rendu à la taille choisie (jusqu’à 4K, 3840 px). Le lien et le JSON contiennent les réglages, jamais vos images.', 'PNG/JPG is rendered at the chosen size (up to 4K, 3840 px). The link and the JSON hold the settings, never your images.', 'PNG/JPG yettwasekles s tiddi i tferneḍ (alamma d 4K). Aseɣwen d JSON sɛan iɣewwaren kan, mačči tugniwin.'],
    exporting: ['Rendu en cours…', 'Rendering…', 'Asekkem…'],
    copied: ['Copié dans le presse-papiers.', 'Copied to the clipboard.', 'Yettwanɣel.'],
    downloaded: ['Fichier enregistré : {f}', 'File saved: {f}', 'Afaylu yettwasekles: {f}'],
    imported: ['Réglages importés.', 'Settings imported.', 'Iɣewwaren ttwaketren.'],
    importErr: ['Fichier de réglages invalide.', 'Invalid settings file.', 'Afaylu n yiɣewwaren ur iṣeḥḥa ara.'],
    resetDone: ['Réglages réinitialisés.', 'Settings reset.', 'Iɣewwaren ttwalsen.'],
    backend: ['Rendu : {b}', 'Renderer: {b}', 'Asekkem: {b}'],
    privacy: ['Vos visuels ne quittent jamais votre appareil : tout est calculé dans le navigateur, les scènes sont dessinées par le code (aucune photo de banque d’images).', 'Your designs never leave your device: everything is computed in the browser, and the scenes are drawn by code (no stock photos).', 'Tugniwin-ik ur ttffeɣent ara seg ibenk-ik: kullec yettwasiḍen deg yiminig, isayesen ttwasunɣen s tengalt.'],
    source: ['Code source', 'Source code', 'Tangalt taɣbalut'],
    helpBody: [
      `<p><strong>Maquette Atelier</strong> place vos créations dans des scènes réalistes, en vraie perspective (homographie à 4 coins), entièrement dans votre navigateur.</p>
<ol><li><strong>Visuels</strong> : ajoutez, glissez-déposez ou collez (Ctrl+V) jusqu’à 6 images PNG, JPG, WebP ou SVG. Des visuels de démo s’affichent tant que vous n’avez rien ajouté.</li>
<li><strong>Scène</strong> : affiche encadrée, cartes de visite, flyer A4, livre, téléphone, ordinateur, publication réseaux, boîte (3 faces), tote bag, panneau 4 × 3 ou abribus, ou perspective libre sur <em>votre</em> photo.</li>
<li><strong>Emplacements</strong> : choisissez quel visuel va sur chaque face (recto/verso, dos du livre, côtés de la boîte…), l’ajustement et la rotation.</li>
<li><strong>Perspective libre</strong> : affichez les poignées et déplacez les coins à la souris, au doigt ou au clavier.</li>
<li><strong>Caméra & ambiance</strong> : tournez la caméra, changez le format, le thème de couleurs, la matière du mur ou de la table, le fond (décor, uni, dégradé, transparent).</li>
<li><strong>Lumière</strong> : direction, intensité, ombres, brillance, impression « encrée » (le visuel se multiplie avec le papier), texture du papier, grain, vignettage, ombres de feuillage ou de store.</li>
<li><strong>Exportez</strong> en PNG (jusqu’à 4K, fond transparent possible) ou JPG ; partagez les réglages par lien ou fichier JSON.</li></ol>
<p>Clavier : <kbd>F</kbd> perspective libre, <kbd>[</kbd> <kbd>]</kbd> coin précédent / suivant, flèches = déplacer (<kbd>Maj</kbd> = ×10), <kbd>R</kbd> réinitialiser les coins.</p>`,
      `<p><strong>Maquette Atelier</strong> puts your designs into realistic scenes, in true perspective (4-corner homography), entirely in your browser.</p>
<ol><li><strong>Designs</strong>: add, drag and drop or paste (Ctrl+V) up to 6 PNG, JPG, WebP or SVG images. Demo designs are shown until you add your own.</li>
<li><strong>Scene</strong>: framed poster, business cards, A4 flyer, book, phone, laptop, social post, box (3 faces), tote bag, 4 × 3 billboard or street panel, or free perspective on <em>your own</em> photo.</li>
<li><strong>Slots</strong>: choose which design goes on each face (front/back, book spine, box sides…), the fit and the rotation.</li>
<li><strong>Free perspective</strong>: show the handles and move the corners with the mouse, a finger or the keyboard.</li>
<li><strong>Camera & mood</strong>: rotate the camera, change the format, colour theme, wall or table material, background (setting, solid, gradient, transparent).</li>
<li><strong>Light</strong>: direction, strength, shadows, gloss, “inked” printing (the design multiplies with the paper), paper texture, grain, vignette, leaf or blind shadows.</li>
<li><strong>Export</strong> PNG (up to 4K, optional transparent background) or JPG; share the settings by link or JSON file.</li></ol>
<p>Keyboard: <kbd>F</kbd> free perspective, <kbd>[</kbd> <kbd>]</kbd> previous / next corner, arrows = move (<kbd>Shift</kbd> = ×10), <kbd>R</kbd> reset corners.</p>`,
      `<p><strong>Maquette Atelier</strong> yessenṭaḍ tifluka-k deg isayesen n tidet, s tmuɣli tusridt, deg yiminig-ik kan.</p>
<ol><li><strong>Tugniwin</strong>: rnu, zuɣer neɣ senṭeḍ (Ctrl+V) alamma d 6 n tugniwin PNG, JPG, WebP neɣ SVG.</li>
<li><strong>Asayes</strong>: aɣmis, tikarḍiwin, tawriqt A4, adlis, tilifun, aselkim, tasuffeɣt, tabwaṭ, taqrabt, tafelwit n udellel, neɣ tamuɣli tilellit ɣef tewlaft-ik.</li>
<li><strong>Imukan</strong>: fren anwa tugna ara yilin ɣef yal udem.</li>
<li><strong>Tamuɣli tilellit</strong>: senkez tiɣmert s umumed, s uḍad neɣ s unasiw.</li>
<li><strong>Takamiṛat & tagnit</strong>: zzi takamiṛat, beddel amasal, initen, tanga d ugilal.</li>
<li><strong>Tafat</strong>: tanila, tazmert, tili, afeǧǧeǧ, asiggez s lmidad, taɣessa, iẓẓan.</li>
<li><strong>Sifeḍ</strong> PNG (alamma d 4K) neɣ JPG; bḍu iɣewwaren s useɣwen neɣ JSON.</li></ol>
<p>Anasiw: <kbd>F</kbd>, <kbd>[</kbd> <kbd>]</kbd>, tineccabin, <kbd>R</kbd>.</p>`,
    ],
  };
  const LANGS = ['fr', 'en', 'kab'];
  const idx = (lang) => Math.max(0, LANGS.indexOf(lang));
  // Kabyle Latin → Tifinagh (neo-Tifinagh as used for Taqbaylit). Acronyms, units, names and words with digits are kept.
  const TF = { a: 'ⴰ', b: 'ⴱ', c: 'ⵛ', č: 'ⵞ', d: 'ⴷ', ḍ: 'ⴹ', e: 'ⴻ', é: 'ⴻ', ɛ: 'ⵄ', f: 'ⴼ', g: 'ⴳ', ǧ: 'ⴵ', ɣ: 'ⵖ', h: 'ⵀ', ḥ: 'ⵃ', i: 'ⵉ', j: 'ⵊ', k: 'ⴽ', l: 'ⵍ', m: 'ⵎ', n: 'ⵏ',
    o: 'ⵓ', p: 'ⵒ', q: 'ⵇ', r: 'ⵔ', ṛ: 'ⵕ', s: 'ⵙ', ṣ: 'ⵚ', t: 'ⵜ', ṭ: 'ⵟ', u: 'ⵓ', v: 'ⵠ', w: 'ⵡ', x: 'ⵅ', y: 'ⵢ', z: 'ⵣ', ẓ: 'ⵥ' };
  const KEEP = /^(Maquette|Atelier|Ctrl|WebP|WebGL|Canvas|Atlas|Terrazzo|Letter|US|DL|kraft|multiply|px|cm|mm|github|com|salimadour31-boop|maquette-atelier|MIT)$/;
  function toTifinagh(text) {
    return String(text).replace(/(<[^>]*>)|(\{[^}]*\})|([^<{]+)/g, (m, tag, ph, txt) => tag || ph || txt.replace(/[\p{L}\d-]+/gu, (w) => {
      if (/\d/.test(w) || (w.length > 1 && w === w.toUpperCase() && /[A-Z]/.test(w)) || KEEP.test(w)) return w;
      return Array.from(w.toLowerCase()).map((ch) => TF[ch] || ch).join('');
    }));
  }
  /** Translate key into lang; vars fill {placeholders}; tfng renders Kabyle in Tifinagh. Unknown keys → null-safe fallback. */
  function t(key, lang = 'fr', vars, tfng = false) {
    const e = S[key];
    let s = e ? e[idx(lang)] : key;
    if (lang === 'kab' && tfng) s = toTifinagh(s);
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
    return s;
  }
  const has = (key) => Object.prototype.hasOwnProperty.call(S, key);
  return { S, LANGS, t, has, toTifinagh };
});
