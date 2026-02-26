figma.showUI(__html__, { width: 320, height: 180 });

const TOKENS = {
  colors: {
    background: '#F8FAFC',
    card: '#FFFFFF',
    primary: '#0F766E',
    accent: '#10B981',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    border: '#E2E8F0',
    shadow: '#0F172A',
    softPrimary: '#ECFDF5'
  },
  spacing: {
    s1: 8,
    s2: 16,
    s3: 24,
    s4: 32
  },
  radius: {
    md: 12,
    lg: 16,
    pill: 999
  },
  typography: {
    h1: 40,
    h2: 24,
    h3: 18,
    body: 14,
    small: 12
  }
};

const FONT_REGULAR = { family: 'Inter', style: 'Regular' };
const FONT_MEDIUM = { family: 'Inter', style: 'Medium' };
const FONT_SEMIBOLD = { family: 'Inter', style: 'Semi Bold' };
const FONT_BOLD = { family: 'Inter', style: 'Bold' };

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  const bigint = parseInt(value, 16);
  return {
    r: ((bigint >> 16) & 255) / 255,
    g: ((bigint >> 8) & 255) / 255,
    b: (bigint & 255) / 255
  };
}

function solidPaint(hex) {
  return [{ type: 'SOLID', color: hexToRgb(hex) }];
}

function setAutoLayout(node, mode, spacing, padding) {
  node.layoutMode = mode;
  node.itemSpacing = spacing;
  node.primaryAxisSizingMode = 'AUTO';
  node.counterAxisSizingMode = 'AUTO';
  node.paddingLeft = padding;
  node.paddingRight = padding;
  node.paddingTop = padding;
  node.paddingBottom = padding;
}

function shadowEffect() {
  return [
    {
      type: 'DROP_SHADOW',
      color: { ...hexToRgb(TOKENS.colors.shadow), a: 0.08 },
      offset: { x: 0, y: 6 },
      radius: 16,
      spread: 0,
      visible: true,
      blendMode: 'NORMAL'
    }
  ];
}

function createText(content, size, font, color, lineHeight) {
  const text = figma.createText();
  text.fontName = font;
  text.fontSize = size;
  text.characters = content;
  text.fills = solidPaint(color);
  if (lineHeight) {
    text.lineHeight = { value: lineHeight, unit: 'PIXELS' };
  }
  return text;
}

function createCardShell(width) {
  const card = figma.createFrame();
  setAutoLayout(card, 'VERTICAL', TOKENS.spacing.s2, TOKENS.spacing.s2);
  card.resize(width, 10);
  card.primaryAxisSizingMode = 'AUTO';
  card.counterAxisSizingMode = 'FIXED';
  card.fills = solidPaint(TOKENS.colors.card);
  card.strokes = solidPaint(TOKENS.colors.border);
  card.strokeWeight = 1;
  card.cornerRadius = TOKENS.radius.lg;
  card.effects = shadowEffect();
  return card;
}

function createButtonSeed(label, variant) {
  const frame = figma.createFrame();
  setAutoLayout(frame, 'HORIZONTAL', 8, 12);
  frame.layoutAlign = 'STRETCH';
  frame.primaryAxisAlignItems = 'CENTER';
  frame.counterAxisAlignItems = 'CENTER';
  frame.cornerRadius = TOKENS.radius.lg;
  frame.strokes = [];
  frame.minHeight = 48;

  const text = createText(label, TOKENS.typography.body, FONT_SEMIBOLD, variant === 'primary' ? '#FFFFFF' : TOKENS.colors.textPrimary, 20);
  frame.appendChild(text);

  if (variant === 'primary') {
    frame.fills = solidPaint(TOKENS.colors.primary);
  } else {
    frame.fills = solidPaint('#FFFFFF');
    frame.strokes = solidPaint(TOKENS.colors.border);
    frame.strokeWeight = 1;
  }

  return frame;
}

function createTemplateTileSeed(name, subtitle, selected) {
  const tile = figma.createFrame();
  setAutoLayout(tile, 'VERTICAL', 10, 12);
  tile.primaryAxisAlignItems = 'MIN';
  tile.counterAxisAlignItems = 'MIN';
  tile.resize(220, 118);
  tile.primaryAxisSizingMode = 'FIXED';
  tile.counterAxisSizingMode = 'FIXED';
  tile.cornerRadius = TOKENS.radius.lg;
  tile.fills = solidPaint(selected ? TOKENS.colors.softPrimary : '#FFFFFF');
  tile.strokes = solidPaint(selected ? TOKENS.colors.accent : TOKENS.colors.border);
  tile.strokeWeight = selected ? 2 : 1;

  const title = createText(name, 16, FONT_SEMIBOLD, TOKENS.colors.textPrimary, 22);
  const body = createText(subtitle, TOKENS.typography.small, FONT_REGULAR, TOKENS.colors.textSecondary, 18);

  const preview = figma.createRectangle();
  preview.resize(196, 42);
  preview.fills = solidPaint(selected ? '#D1FAE5' : '#F1F5F9');
  preview.cornerRadius = 10;

  tile.appendChild(title);
  tile.appendChild(body);
  tile.appendChild(preview);

  return tile;
}

function createTabSeed(label, active) {
  const tab = figma.createFrame();
  setAutoLayout(tab, 'HORIZONTAL', 8, 10);
  tab.cornerRadius = TOKENS.radius.pill;
  tab.fills = solidPaint(active ? TOKENS.colors.primary : '#FFFFFF');
  tab.strokes = active ? [] : solidPaint(TOKENS.colors.border);
  tab.strokeWeight = active ? 0 : 1;

  const text = createText(label, TOKENS.typography.body, FONT_MEDIUM, active ? '#FFFFFF' : TOKENS.colors.textSecondary, 20);
  tab.appendChild(text);
  return tab;
}

function createDropzoneSeed() {
  const dropzone = figma.createFrame();
  setAutoLayout(dropzone, 'VERTICAL', 10, 16);
  dropzone.primaryAxisAlignItems = 'CENTER';
  dropzone.counterAxisAlignItems = 'CENTER';
  dropzone.fills = solidPaint('#FFFFFF');
  dropzone.strokes = solidPaint(TOKENS.colors.border);
  dropzone.strokeWeight = 1;
  dropzone.dashPattern = [8, 6];
  dropzone.cornerRadius = TOKENS.radius.lg;
  dropzone.resize(500, 148);

  const iconWrap = figma.createFrame();
  setAutoLayout(iconWrap, 'HORIZONTAL', 0, 0);
  iconWrap.fills = [];
  iconWrap.resize(32, 32);

  const iconBox = figma.createRectangle();
  iconBox.resize(24, 24);
  iconBox.fills = solidPaint('#D1FAE5');
  iconBox.cornerRadius = 6;

  const iconBar = figma.createRectangle();
  iconBar.resize(12, 3);
  iconBar.fills = solidPaint(TOKENS.colors.primary);
  iconBar.x = 6;
  iconBar.y = 10;

  iconWrap.appendChild(iconBox);
  iconWrap.appendChild(iconBar);

  const title = createText('Drop file here or click to upload', TOKENS.typography.body, FONT_SEMIBOLD, TOKENS.colors.textPrimary, 20);
  const helper = createText('Supports .txt and .md', TOKENS.typography.small, FONT_REGULAR, TOKENS.colors.textSecondary, 18);

  dropzone.appendChild(iconWrap);
  dropzone.appendChild(title);
  dropzone.appendChild(helper);

  return dropzone;
}

function createToastSeed() {
  const toast = figma.createFrame();
  setAutoLayout(toast, 'HORIZONTAL', 10, 12);
  toast.cornerRadius = 12;
  toast.fills = solidPaint('#ECFDF5');
  toast.strokes = solidPaint('#A7F3D0');
  toast.strokeWeight = 1;

  const dot = figma.createEllipse();
  dot.resize(10, 10);
  dot.fills = solidPaint(TOKENS.colors.accent);

  const message = createText('Variants generated successfully.', TOKENS.typography.body, FONT_MEDIUM, '#065F46', 20);

  toast.appendChild(dot);
  toast.appendChild(message);
  return toast;
}

function createLibrary(page) {
  const library = figma.createFrame();
  library.name = '00 Components';
  setAutoLayout(library, 'VERTICAL', TOKENS.spacing.s2, TOKENS.spacing.s2);
  library.fills = solidPaint('#F1F5F9');
  library.cornerRadius = TOKENS.radius.lg;
  library.resize(420, 1200);
  library.x = 40;
  library.y = 40;
  page.appendChild(library);

  const heading = createText('Component Library', TOKENS.typography.h3, FONT_BOLD, TOKENS.colors.textPrimary, 26);
  library.appendChild(heading);

  const btnPrimaryNode = createButtonSeed('Generate 3 Tailored CVs ->', 'primary');
  library.appendChild(btnPrimaryNode);
  const btnPrimary = figma.createComponentFromNode(btnPrimaryNode);
  btnPrimary.name = 'Button/Primary';

  const btnSecondaryNode = createButtonSeed('Paste text', 'secondary');
  library.appendChild(btnSecondaryNode);
  const btnSecondary = figma.createComponentFromNode(btnSecondaryNode);
  btnSecondary.name = 'Button/Secondary';

  const cardNode = createCardShell(320);
  cardNode.appendChild(createText('Card Title', 16, FONT_SEMIBOLD, TOKENS.colors.textPrimary, 22));
  cardNode.appendChild(createText('Card helper text', TOKENS.typography.body, FONT_REGULAR, TOKENS.colors.textSecondary, 20));
  library.appendChild(cardNode);
  const cardComponent = figma.createComponentFromNode(cardNode);
  cardComponent.name = 'Card/Base';

  const tileSelectedNode = createTemplateTileSeed('Classic', 'Structured and formal', true);
  const tileUnselectedNode = createTemplateTileSeed('Classic', 'Structured and formal', false);
  library.appendChild(tileSelectedNode);
  library.appendChild(tileUnselectedNode);
  const tileSelected = figma.createComponentFromNode(tileSelectedNode);
  const tileUnselected = figma.createComponentFromNode(tileUnselectedNode);
  tileSelected.name = 'TemplateTile/State=Selected';
  tileUnselected.name = 'TemplateTile/State=Unselected';
  const templateTileSet = figma.combineAsVariants([tileSelected, tileUnselected], library);
  templateTileSet.name = 'TemplateTile';

  const tabActiveNode = createTabSeed('Classic', true);
  const tabInactiveNode = createTabSeed('Modern', false);
  library.appendChild(tabActiveNode);
  library.appendChild(tabInactiveNode);
  const tabActive = figma.createComponentFromNode(tabActiveNode);
  const tabInactive = figma.createComponentFromNode(tabInactiveNode);
  tabActive.name = 'Tab/State=Active';
  tabInactive.name = 'Tab/State=Inactive';
  const tabSet = figma.combineAsVariants([tabActive, tabInactive], library);
  tabSet.name = 'Tab';

  const dropzoneNode = createDropzoneSeed();
  library.appendChild(dropzoneNode);
  const dropzone = figma.createComponentFromNode(dropzoneNode);
  dropzone.name = 'Dropzone/Base';

  const toastNode = createToastSeed();
  library.appendChild(toastNode);
  const toast = figma.createComponentFromNode(toastNode);
  toast.name = 'Toast/Success';

  return {
    buttonPrimary: btnPrimary,
    buttonSecondary: btnSecondary,
    card: cardComponent,
    templateTile: templateTileSet,
    tab: tabSet,
    dropzone,
    toast
  };
}

function makeSectionTitle(label, helper) {
  const wrap = figma.createFrame();
  setAutoLayout(wrap, 'VERTICAL', 4, 0);
  wrap.fills = [];
  wrap.paddingLeft = 0;
  wrap.paddingTop = 0;
  wrap.paddingRight = 0;
  wrap.paddingBottom = 0;
  const title = createText(label, TOKENS.typography.h3, FONT_BOLD, TOKENS.colors.textPrimary, 26);
  const body = createText(helper, TOKENS.typography.body, FONT_REGULAR, TOKENS.colors.textSecondary, 20);
  wrap.appendChild(title);
  wrap.appendChild(body);
  return wrap;
}

function createStepCard(width, title, helper) {
  const card = createCardShell(width);
  card.name = title;
  card.appendChild(makeSectionTitle(title, helper));
  return card;
}

function createTemplateInstances(components, labels, selectedIndex) {
  const row = figma.createFrame();
  setAutoLayout(row, 'HORIZONTAL', TOKENS.spacing.s2, 0);
  row.paddingLeft = 0;
  row.paddingTop = 0;
  row.paddingRight = 0;
  row.paddingBottom = 0;
  row.fills = [];
  row.counterAxisAlignItems = 'MIN';

  labels.forEach(function (item, index) {
    const tile = components.templateTile.createInstance();
    tile.setProperties({ State: index === selectedIndex ? 'Selected' : 'Unselected' });

    const titleNode = tile.findOne(function (n) {
      return n.type === 'TEXT';
    });
    if (titleNode && titleNode.type === 'TEXT') {
      titleNode.characters = item.title;
    }

    const textNodes = tile.findAll(function (n) {
      return n.type === 'TEXT';
    });
    if (textNodes[1] && textNodes[1].type === 'TEXT') {
      textNodes[1].characters = item.subtitle;
    }

    row.appendChild(tile);
  });

  return row;
}

function createDesktopFrame(components, page) {
  const desktop = figma.createFrame();
  desktop.name = 'Desktop - CV Tailor Studio';
  desktop.resize(1440, 2100);
  desktop.x = 560;
  desktop.y = 40;
  desktop.fills = solidPaint(TOKENS.colors.background);
  desktop.layoutMode = 'VERTICAL';
  desktop.primaryAxisSizingMode = 'FIXED';
  desktop.counterAxisSizingMode = 'FIXED';
  desktop.counterAxisAlignItems = 'CENTER';
  desktop.itemSpacing = TOKENS.spacing.s3;
  desktop.paddingTop = 48;
  desktop.paddingLeft = 0;
  desktop.paddingRight = 0;
  desktop.paddingBottom = 48;
  page.appendChild(desktop);

  const content = figma.createFrame();
  content.name = 'Desktop Content';
  setAutoLayout(content, 'VERTICAL', TOKENS.spacing.s2, 0);
  content.paddingLeft = 0;
  content.paddingRight = 0;
  content.paddingTop = 0;
  content.paddingBottom = 0;
  content.fills = [];
  content.resize(1100, 100);
  content.primaryAxisSizingMode = 'AUTO';
  content.counterAxisSizingMode = 'FIXED';
  desktop.appendChild(content);

  const header = createCardShell(1100);
  header.appendChild(createText('CV Tailor Studio', TOKENS.typography.h1, FONT_BOLD, TOKENS.colors.textPrimary, 48));
  header.appendChild(
    createText(
      'Turn one CV into three role-targeted variants with a guided workflow.',
      16,
      FONT_REGULAR,
      TOKENS.colors.textSecondary,
      24
    )
  );
  content.appendChild(header);

  const step1 = createStepCard(1100, 'Step 1 - Add Job Posting', 'Drop a file or paste text into the guided modal.');
  const step1Actions = figma.createFrame();
  setAutoLayout(step1Actions, 'HORIZONTAL', 12, 0);
  step1Actions.paddingLeft = 0;
  step1Actions.paddingTop = 0;
  step1Actions.paddingRight = 0;
  step1Actions.paddingBottom = 0;
  step1Actions.fills = [];

  const dz1 = components.dropzone.createInstance();
  dz1.layoutGrow = 1;
  step1.appendChild(dz1);
  step1Actions.appendChild(components.buttonSecondary.createInstance());
  step1Actions.appendChild(components.buttonSecondary.createInstance());
  const step1Texts = step1Actions.findAll(function (n) { return n.type === 'TEXT'; });
  if (step1Texts[0]) step1Texts[0].characters = 'Upload file';
  if (step1Texts[1]) step1Texts[1].characters = 'Paste text';
  step1.appendChild(step1Actions);
  content.appendChild(step1);

  const step2 = createStepCard(1100, 'Step 2 - Upload Your CV', 'Use your latest CV. Keep formatting simple for best parsing.');
  const dz2 = components.dropzone.createInstance();
  dz2.layoutGrow = 1;
  step2.appendChild(dz2);
  const step2Actions = figma.createFrame();
  setAutoLayout(step2Actions, 'HORIZONTAL', 12, 0);
  step2Actions.paddingLeft = 0;
  step2Actions.paddingTop = 0;
  step2Actions.paddingRight = 0;
  step2Actions.paddingBottom = 0;
  step2Actions.fills = [];
  step2Actions.appendChild(components.buttonSecondary.createInstance());
  step2Actions.appendChild(components.buttonSecondary.createInstance());
  const step2Texts = step2Actions.findAll(function (n) { return n.type === 'TEXT'; });
  if (step2Texts[0]) step2Texts[0].characters = 'Upload CV';
  if (step2Texts[1]) step2Texts[1].characters = 'Paste text';
  step2.appendChild(step2Actions);
  content.appendChild(step2);

  const step3 = createStepCard(1100, 'Step 3 - Choose Output Style', 'We generate all 3 variants, this picks your default view.');
  const templates = createTemplateInstances(
    components,
    [
      { title: 'Classic', subtitle: 'Structured and formal' },
      { title: 'Modern', subtitle: 'Contemporary and concise' },
      { title: 'ATS-Friendly', subtitle: 'Machine readable emphasis' }
    ],
    1
  );
  step3.appendChild(templates);

  const cta = components.buttonPrimary.createInstance();
  cta.layoutAlign = 'STRETCH';
  step3.appendChild(cta);
  content.appendChild(step3);

  const hiddenNote = components.toast.createInstance();
  const noteText = hiddenNote.findOne(function (n) {
    return n.type === 'TEXT';
  });
  if (noteText && noteText.type === 'TEXT') {
    noteText.characters = 'Results are hidden by default and appear after generation.';
  }
  content.appendChild(hiddenNote);

  const results = createStepCard(1100, 'Your Tailored CV Variants', 'Generated results with clean preview and export actions.');

  // Tabs are preferred over side-by-side cards here because they reduce scanning load,
  // keep action placement consistent, and adapt better to the 375 mobile width.
  const tabsRow = figma.createFrame();
  setAutoLayout(tabsRow, 'HORIZONTAL', 8, 0);
  tabsRow.paddingLeft = 0;
  tabsRow.paddingTop = 0;
  tabsRow.paddingRight = 0;
  tabsRow.paddingBottom = 0;
  tabsRow.fills = [];
  const tab1 = components.tab.createInstance();
  tab1.setProperties({ State: 'Active' });
  const tab2 = components.tab.createInstance();
  tab2.setProperties({ State: 'Inactive' });
  const tab3 = components.tab.createInstance();
  tab3.setProperties({ State: 'Inactive' });
  const tabTexts = [tab1, tab2, tab3].map(function (tab) {
    return tab.findOne(function (n) { return n.type === 'TEXT'; });
  });
  if (tabTexts[0] && tabTexts[0].type === 'TEXT') tabTexts[0].characters = 'Classic';
  if (tabTexts[1] && tabTexts[1].type === 'TEXT') tabTexts[1].characters = 'Modern';
  if (tabTexts[2] && tabTexts[2].type === 'TEXT') tabTexts[2].characters = 'ATS';
  tabsRow.appendChild(tab1);
  tabsRow.appendChild(tab2);
  tabsRow.appendChild(tab3);

  const preview = figma.createFrame();
  setAutoLayout(preview, 'VERTICAL', 8, 14);
  preview.layoutAlign = 'STRETCH';
  preview.fills = solidPaint('#F8FAFC');
  preview.strokes = solidPaint(TOKENS.colors.border);
  preview.strokeWeight = 1;
  preview.cornerRadius = 12;

  preview.appendChild(createText('Professional Summary', 16, FONT_SEMIBOLD, TOKENS.colors.textPrimary, 22));
  preview.appendChild(
    createText(
      'Product-minded engineer with 6+ years building cloud-first web products across fintech and B2B SaaS.',
      TOKENS.typography.body,
      FONT_REGULAR,
      TOKENS.colors.textSecondary,
      20
    )
  );
  preview.appendChild(createText('Experience Highlights', 16, FONT_SEMIBOLD, TOKENS.colors.textPrimary, 22));
  preview.appendChild(
    createText('- Reduced deployment rollback rate by 42% through CI policy updates.', TOKENS.typography.body, FONT_REGULAR, TOKENS.colors.textSecondary, 20)
  );
  preview.appendChild(
    createText('- Led migration to event-driven architecture supporting 3x throughput.', TOKENS.typography.body, FONT_REGULAR, TOKENS.colors.textSecondary, 20)
  );

  const resultActions = figma.createFrame();
  setAutoLayout(resultActions, 'HORIZONTAL', 10, 0);
  resultActions.paddingLeft = 0;
  resultActions.paddingTop = 0;
  resultActions.paddingRight = 0;
  resultActions.paddingBottom = 0;
  resultActions.fills = [];

  const a1 = components.buttonSecondary.createInstance();
  const a2 = components.buttonSecondary.createInstance();
  const a3 = components.buttonSecondary.createInstance();
  const actionTexts = [a1, a2, a3].map(function (btn) {
    return btn.findOne(function (n) { return n.type === 'TEXT'; });
  });
  if (actionTexts[0] && actionTexts[0].type === 'TEXT') actionTexts[0].characters = 'Download PDF';
  if (actionTexts[1] && actionTexts[1].type === 'TEXT') actionTexts[1].characters = 'Download Word';
  if (actionTexts[2] && actionTexts[2].type === 'TEXT') actionTexts[2].characters = 'Copy';

  resultActions.appendChild(a1);
  resultActions.appendChild(a2);
  resultActions.appendChild(a3);

  results.appendChild(tabsRow);
  results.appendChild(preview);
  results.appendChild(resultActions);
  content.appendChild(results);

  return desktop;
}

function createMobileFrame(components, page) {
  const mobile = figma.createFrame();
  mobile.name = 'Mobile - CV Tailor Studio';
  mobile.resize(375, 2200);
  mobile.x = 2040;
  mobile.y = 40;
  mobile.fills = solidPaint(TOKENS.colors.background);
  mobile.layoutMode = 'VERTICAL';
  mobile.primaryAxisSizingMode = 'FIXED';
  mobile.counterAxisSizingMode = 'FIXED';
  mobile.counterAxisAlignItems = 'CENTER';
  mobile.itemSpacing = TOKENS.spacing.s2;
  mobile.paddingTop = 20;
  mobile.paddingBottom = 20;
  page.appendChild(mobile);

  const content = figma.createFrame();
  content.name = 'Mobile Content';
  setAutoLayout(content, 'VERTICAL', TOKENS.spacing.s2, 0);
  content.paddingLeft = 0;
  content.paddingTop = 0;
  content.paddingRight = 0;
  content.paddingBottom = 0;
  content.fills = [];
  content.resize(343, 100);
  content.primaryAxisSizingMode = 'AUTO';
  content.counterAxisSizingMode = 'FIXED';
  mobile.appendChild(content);

  const header = createCardShell(343);
  header.appendChild(createText('CV Tailor Studio', 28, FONT_BOLD, TOKENS.colors.textPrimary, 34));
  header.appendChild(createText('Guided CV tailoring in three steps.', TOKENS.typography.body, FONT_REGULAR, TOKENS.colors.textSecondary, 20));
  content.appendChild(header);

  const s1 = createStepCard(343, 'Step 1 - Add Job Posting', 'Upload or paste text.');
  s1.appendChild(components.dropzone.createInstance());
  const s1Actions = figma.createFrame();
  setAutoLayout(s1Actions, 'VERTICAL', 8, 0);
  s1Actions.paddingLeft = 0;
  s1Actions.paddingTop = 0;
  s1Actions.paddingRight = 0;
  s1Actions.paddingBottom = 0;
  s1Actions.fills = [];
  const s1b1 = components.buttonSecondary.createInstance();
  const s1b2 = components.buttonSecondary.createInstance();
  s1b1.layoutAlign = 'STRETCH';
  s1b2.layoutAlign = 'STRETCH';
  const s1t = [s1b1, s1b2].map(function (btn) { return btn.findOne(function (n) { return n.type === 'TEXT'; }); });
  if (s1t[0] && s1t[0].type === 'TEXT') s1t[0].characters = 'Upload file';
  if (s1t[1] && s1t[1].type === 'TEXT') s1t[1].characters = 'Paste text';
  s1Actions.appendChild(s1b1);
  s1Actions.appendChild(s1b2);
  s1.appendChild(s1Actions);
  content.appendChild(s1);

  const s2 = createStepCard(343, 'Step 2 - Upload Your CV', 'Use your latest CV.');
  s2.appendChild(components.dropzone.createInstance());
  const s2Actions = figma.createFrame();
  setAutoLayout(s2Actions, 'VERTICAL', 8, 0);
  s2Actions.paddingLeft = 0;
  s2Actions.paddingTop = 0;
  s2Actions.paddingRight = 0;
  s2Actions.paddingBottom = 0;
  s2Actions.fills = [];
  const s2b1 = components.buttonSecondary.createInstance();
  const s2b2 = components.buttonSecondary.createInstance();
  s2b1.layoutAlign = 'STRETCH';
  s2b2.layoutAlign = 'STRETCH';
  const s2t = [s2b1, s2b2].map(function (btn) { return btn.findOne(function (n) { return n.type === 'TEXT'; }); });
  if (s2t[0] && s2t[0].type === 'TEXT') s2t[0].characters = 'Upload CV';
  if (s2t[1] && s2t[1].type === 'TEXT') s2t[1].characters = 'Paste text';
  s2Actions.appendChild(s2b1);
  s2Actions.appendChild(s2b2);
  s2.appendChild(s2Actions);
  content.appendChild(s2);

  const s3 = createStepCard(343, 'Step 3 - Choose Output Style', 'Default tab selection after generation.');
  const tileCol = figma.createFrame();
  setAutoLayout(tileCol, 'VERTICAL', 8, 0);
  tileCol.paddingLeft = 0;
  tileCol.paddingTop = 0;
  tileCol.paddingRight = 0;
  tileCol.paddingBottom = 0;
  tileCol.fills = [];

  ['Classic', 'Modern', 'ATS-Friendly'].forEach(function (name, idx) {
    const t = components.templateTile.createInstance();
    t.setProperties({ State: idx === 0 ? 'Selected' : 'Unselected' });
    t.layoutAlign = 'STRETCH';
    const tText = t.findOne(function (n) { return n.type === 'TEXT'; });
    if (tText && tText.type === 'TEXT') tText.characters = name;
    tileCol.appendChild(t);
  });

  s3.appendChild(tileCol);
  const mobileCta = components.buttonPrimary.createInstance();
  mobileCta.layoutAlign = 'STRETCH';
  s3.appendChild(mobileCta);
  content.appendChild(s3);

  const results = createStepCard(343, 'Results', 'Tabbed variant preview for compact mobile scanning.');
  const tabRow = figma.createFrame();
  setAutoLayout(tabRow, 'HORIZONTAL', 8, 0);
  tabRow.paddingLeft = 0;
  tabRow.paddingTop = 0;
  tabRow.paddingRight = 0;
  tabRow.paddingBottom = 0;
  tabRow.fills = [];

  const mt1 = components.tab.createInstance();
  mt1.setProperties({ State: 'Active' });
  const mt2 = components.tab.createInstance();
  mt2.setProperties({ State: 'Inactive' });
  const mt3 = components.tab.createInstance();
  mt3.setProperties({ State: 'Inactive' });
  tabRow.appendChild(mt1);
  tabRow.appendChild(mt2);
  tabRow.appendChild(mt3);

  const preview = figma.createFrame();
  setAutoLayout(preview, 'VERTICAL', 8, 12);
  preview.layoutAlign = 'STRETCH';
  preview.fills = solidPaint('#F8FAFC');
  preview.strokes = solidPaint(TOKENS.colors.border);
  preview.strokeWeight = 1;
  preview.cornerRadius = 12;
  preview.appendChild(createText('Preview snippet...', TOKENS.typography.body, FONT_REGULAR, TOKENS.colors.textSecondary, 20));

  const actions = figma.createFrame();
  setAutoLayout(actions, 'VERTICAL', 8, 0);
  actions.paddingLeft = 0;
  actions.paddingTop = 0;
  actions.paddingRight = 0;
  actions.paddingBottom = 0;
  actions.fills = [];
  const mb1 = components.buttonSecondary.createInstance();
  const mb2 = components.buttonSecondary.createInstance();
  const mb3 = components.buttonSecondary.createInstance();
  mb1.layoutAlign = 'STRETCH';
  mb2.layoutAlign = 'STRETCH';
  mb3.layoutAlign = 'STRETCH';
  const mTexts = [mb1, mb2, mb3].map(function (btn) { return btn.findOne(function (n) { return n.type === 'TEXT'; }); });
  if (mTexts[0] && mTexts[0].type === 'TEXT') mTexts[0].characters = 'Download PDF';
  if (mTexts[1] && mTexts[1].type === 'TEXT') mTexts[1].characters = 'Download Word';
  if (mTexts[2] && mTexts[2].type === 'TEXT') mTexts[2].characters = 'Copy';
  actions.appendChild(mb1);
  actions.appendChild(mb2);
  actions.appendChild(mb3);

  results.appendChild(tabRow);
  results.appendChild(preview);
  results.appendChild(actions);
  content.appendChild(results);

  return mobile;
}

async function generateDesign() {
  await Promise.all([
    figma.loadFontAsync(FONT_REGULAR),
    figma.loadFontAsync(FONT_MEDIUM),
    figma.loadFontAsync(FONT_SEMIBOLD),
    figma.loadFontAsync(FONT_BOLD)
  ]);

  const page = figma.createPage();
  page.name = 'CV Tailor Studio';
  figma.currentPage = page;

  const components = createLibrary(page);
  const desktop = createDesktopFrame(components, page);
  createMobileFrame(components, page);

  figma.currentPage.selection = [desktop];
  figma.viewport.scrollAndZoomIntoView([desktop]);
}

figma.ui.onmessage = async function (msg) {
  if (msg.type !== 'generate-design') return;

  try {
    await generateDesign();
    figma.notify('CV Tailor Studio design generated');
    figma.closePlugin();
  } catch (error) {
    figma.notify('Could not generate design. Check console for details.');
    console.error(error);
  }
};
