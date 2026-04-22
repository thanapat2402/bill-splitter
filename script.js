const data = {
  title: "แบ่งหารบิล",
  persons: [],
  expenses: [],
};

const TRIP_SCHEMA_VERSION = 1;
const SHARE_API_BASE_URL = "https://edpcqatatjkfgjxnogvq.functions.supabase.co";
const SUPABASE_PROJECT_URL = "https://edpcqatatjkfgjxnogvq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_j41m4XEbr49hZSehREyKsw_xsvko8E_";
const REALTIME_SYNC_EVENT = "trip-updated";
const PROJECT_NAME = "หารกัน";
const DEFAULT_TRIP_TITLE = "แบ่งหารบิล";
const SHORTCUT_SCROLL_DURATION_MS = 1800;
const SUMMARY_DETAIL_ANIMATION_FALLBACK_MS = 420;
const DEMO_TRIP_PRESET = {
  schemaVersion: TRIP_SCHEMA_VERSION,
  title: "ทริปเชียงใหม่ Mock",
  persons: ["Alice", "Bob", "Dog", "Nan"],
  expenses: [
    {
      id: 101,
      name: "ค่าที่พัก",
      amount: 4200,
      subExpenses: [
        { name: "คืนวันศุกร์", amount: 2100 },
        { name: "คืนวันเสาร์", amount: 2100 },
      ],
      paidBy: "Alice",
      splitAmong: ["Alice", "Bob", "Dog", "Nan"],
      date: "22/4/2569",
    },
    {
      id: 102,
      name: "หมูกระทะมื้อใหญ่",
      amount: 1280,
      subExpenses: [
        { name: "ชุดหมู", amount: 780 },
        { name: "เครื่องดื่ม", amount: 300 },
        { name: "ของหวาน", amount: 200 },
      ],
      paidBy: "Bob",
      splitAmong: ["Alice", "Bob", "Dog", "Nan"],
      date: "22/4/2569",
    },
    {
      id: 103,
      name: "ค่าน้ำมันรถ",
      amount: 1800,
      subExpenses: [],
      paidBy: "Dog",
      splitAmong: ["Alice", "Bob", "Dog"],
      date: "22/4/2569",
    },
    {
      id: 104,
      name: "ค่าเข้าคาเฟ่",
      amount: 540,
      subExpenses: [
        { name: "กาแฟ", amount: 260 },
        { name: "เค้ก", amount: 280 },
      ],
      paidBy: "Nan",
      splitAmong: ["Alice", "Nan"],
      date: "22/4/2569",
    },
    {
      id: 105,
      name: "ของฝาก",
      amount: 950,
      subExpenses: [],
      paidBy: "Alice",
      splitAmong: ["Bob", "Dog", "Nan"],
      date: "22/4/2569",
    },
  ],
};

const appState = {
  mode: "local",
  tripId: null,
  shareToken: "",
  role: "edit",
  version: null,
  isDirty: false,
  isSaving: false,
  lastSavedAt: "",
  saveError: "",
  loadError: "",
  hasRemoteUpdate: false,
  remoteVersion: null,
  autosaveTimerId: null,
  versionPollTimerId: null,
  realtimeClient: null,
  realtimeChannel: null,
  realtimeJoinPromise: null,
  realtimeStatus: "idle",
  shareLinks: {
    viewUrl: "",
    editUrl: "",
  },
  isHeaderShareMenuOpen: false,
};

let supabaseModulePromise = null;

const {
  roundCurrency,
  formatAmount,
  calculateSummary,
  getPersonDetails,
  getBalanceMeta,
  getBalanceClass,
  calculateSettlement,
  exportTripData: exportTripSnapshot,
  importTripData: importTripSnapshot,
} = window.TripLogic;

const { createTripUiController } = window.TripUI;
const { createExpenseFormController } = window.ExpenseForm;
const { createTripActionsController } = window.TripActions;
const { createAppShellController } = window.AppShell;
const { createShareController } = window.ShareFlow;

const dom = {
  firstStepGuide: document.getElementById("firstStepGuide"),
  focusAddPersonBtn: document.getElementById("focusAddPersonBtn"),
  loadDemoPresetGuideBtn: document.getElementById("loadDemoPresetGuideBtn"),
  personForm: document.getElementById("personForm"),
  personNameInput: document.getElementById("personName"),
  tripTitleInput: document.getElementById("tripTitleInput"),
  shortcutLinks: Array.from(
    document.querySelectorAll('.shortcut-chip[href^="#"]'),
  ),
  headerShareMenuBtn: document.getElementById("headerShareMenuBtn"),
  headerShareMenu: document.getElementById("headerShareMenu"),
  headerShareEditBtn: document.getElementById("headerShareEditBtn"),
  headerShareViewBtn: document.getElementById("headerShareViewBtn"),
  overviewPersonsCount: document.getElementById("overviewPersonsCount"),
  overviewExpensesCount: document.getElementById("overviewExpensesCount"),
  overviewTotalAmount: document.getElementById("overviewTotalAmount"),
  overviewModeText: document.getElementById("overviewModeText"),
  addExpenseSection: document.getElementById("addExpenseSection"),
  addExpenseDescription: document.getElementById("addExpenseDescription"),
  addPersonSection: document.getElementById("addPersonSection"),
  addPersonDescription: document.getElementById("addPersonDescription"),
  personsList: document.getElementById("personsList"),
  expenseForm: document.getElementById("expenseForm"),
  expenseNameInput: document.getElementById("expenseName"),
  expenseTotalInput: document.getElementById("expenseTotal"),
  subExpensesPanel: document.getElementById("subExpensesPanel"),
  subExpensesContainer: document.getElementById("subExpenses"),
  toggleSubExpensesBtn: document.getElementById("toggleSubExpensesBtn"),
  addSubExpenseBtn: document.getElementById("addSubExpenseBtn"),
  clearSubExpensesBtn: document.getElementById("clearSubExpensesBtn"),
  paidBySelect: document.getElementById("paidBy"),
  splitPersonsDiv: document.getElementById("splitPersons"),
  expensesList: document.getElementById("expensesList"),
  expensesDescription: document.getElementById("expensesDescription"),
  expensesCountMeta: document.getElementById("expensesCountMeta"),
  expensesTotalMeta: document.getElementById("expensesTotalMeta"),
  noExpensesMsg: document.getElementById("noExpenses"),
  summaryContent: document.getElementById("summaryContent"),
  settlementContent: document.getElementById("settlementContent"),
  noSettlementMsg: document.getElementById("noSettlement"),
  newTripBtn: document.getElementById("newTripBtn"),
  newTripGroupLabel: document.getElementById("newTripGroupLabel"),
  newTripHelperText: document.getElementById("newTripHelperText"),
  loadDemoPresetBtn: document.getElementById("loadDemoPresetBtn"),
  resetBtn: document.getElementById("resetBtn"),
  selectAllBtn: document.getElementById("selectAllBtn"),
  deselectAllBtn: document.getElementById("deselectAllBtn"),
  tripStatusBar: document.getElementById("tripStatusBar"),
  tripModeBadge: document.getElementById("tripModeBadge"),
  saveStatusText: document.getElementById("saveStatusText"),
  shareDescription: document.getElementById("shareDescription"),
  shareHint: document.getElementById("shareHint"),
  shareActions: document.getElementById("shareActions"),
  shareTripBtn: document.getElementById("shareTripBtn"),
  copyViewLinkBtn: document.getElementById("copyViewLinkBtn"),
  copyEditLinkBtn: document.getElementById("copyEditLinkBtn"),
  shareErrorState: document.getElementById("shareErrorState"),
  remoteUpdateNotice: document.getElementById("remoteUpdateNotice"),
  reloadLatestBtn: document.getElementById("reloadLatestBtn"),
  actionsDescription: document.getElementById("actionsDescription"),
};

let appShellController = null;

function setHeaderShareMenuOpen(isOpen) {
  appShellController.setHeaderShareMenuOpen(isOpen);
}

function getTripTitle() {
  return appShellController.getTripTitle();
}

function getNormalizedTripTitle() {
  return appShellController.getNormalizedTripTitle();
}

const { updateUI, updateHeaderUI, updateShareUI } = createTripUiController({
  data,
  appState,
  dom,
  constants: {
    DEFAULT_TRIP_TITLE,
    PROJECT_NAME,
  },
  helpers: {
    roundCurrency,
    formatAmount,
    calculateSummary,
    getPersonDetails,
    getBalanceMeta,
    getBalanceClass,
    calculateSettlement,
  },
  actions: {
    getTripTitle,
    getNormalizedTripTitle,
    escapeQuotes,
  },
  setHeaderShareMenuOpen,
});

const {
  parseShareTokenFromUrl,
  isSharedMode,
  canEdit,
  assertEditableOrAlert,
  setAppMode,
  markDirty,
  clearDirty,
  setSaveError,
  setLoadError,
  setSavingState,
  setRemoteUpdateState,
  clearAutosaveTimer,
  handleShareLinkAction,
  handleShareTripClick,
  handleReloadLatestClick,
  scheduleAutosave,
  createSharedTrip,
  loadSharedTrip,
  saveSharedTrip,
  replaceUrlIfPossible,
} = createShareController({
  appState,
  constants: {
    SHARE_API_BASE_URL,
    SUPABASE_PROJECT_URL,
    SUPABASE_PUBLISHABLE_KEY,
    REALTIME_SYNC_EVENT,
  },
  getNormalizedTripTitle,
  exportTripData,
  importTripData,
  updateUI,
  updateShareUI,
  setHeaderShareMenuOpen,
  getSupabaseModulePromise: () => supabaseModulePromise,
  setSupabaseModulePromise: (nextPromise) => {
    supabaseModulePromise = nextPromise;
  },
});

const {
  addExpense,
  selectAllPersons,
  deselectAllPersons,
  handleSubExpenseInput,
  handleSubExpenseAction,
  toggleSubExpensesPanel,
  addSubExpenseRow,
  clearSubExpensesAndKeepPanel,
  resetExpenseForm,
} = createExpenseFormController({
  data,
  dom,
  helpers: {
    roundCurrency,
    formatAmount,
  },
  actions: {
    assertEditableOrAlert,
    canEdit,
    markDirty,
    updateUI,
    escapeAttribute,
  },
});

const {
  addPerson,
  removePerson,
  removeExpense,
  resetAll,
  handleNewTripClick,
  handleLoadDemoPresetClick,
  clearTransientForms,
} = createTripActionsController({
  data,
  appState,
  dom,
  constants: {
    DEFAULT_TRIP_TITLE,
    DEMO_TRIP_PRESET,
  },
  actions: {
    assertEditableOrAlert,
    isSharedMode,
    clearAutosaveTimer,
    clearDirty,
    setSaveError,
    setLoadError,
    setSavingState,
    setRemoteUpdateState,
    setAppMode,
    replaceUrlIfPossible,
    updateUI,
    importTripData,
    resetExpenseForm,
    getNormalizedTripTitle,
    canEdit,
    markDirty,
  },
});

window.removePerson = removePerson;
window.removeExpense = removeExpense;

function escapeAttribute(str) {
  return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function escapeQuotes(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function exportTripData() {
  return exportTripSnapshot(data, getNormalizedTripTitle, TRIP_SCHEMA_VERSION);
}

function importTripData(rawData) {
  importTripSnapshot(data, rawData, TRIP_SCHEMA_VERSION);
}

appShellController = createAppShellController({
  data,
  appState,
  dom,
  constants: {
    DEFAULT_TRIP_TITLE,
    SHORTCUT_SCROLL_DURATION_MS,
    SUMMARY_DETAIL_ANIMATION_FALLBACK_MS,
  },
  actions: {
    markDirty,
    updateUI,
    updateHeaderUI,
    parseShareTokenFromUrl,
    setAppMode,
    setSavingState,
    loadSharedTrip,
    handleShareLinkAction,
    handleShareTripClick,
    handleReloadLatestClick,
    handleLoadDemoPresetClick,
    handleNewTripClick,
    resetAll,
    addPerson,
    addExpense,
    selectAllPersons,
    deselectAllPersons,
    toggleSubExpensesPanel,
    addSubExpenseRow,
    clearSubExpensesAndKeepPanel,
    handleSubExpenseInput,
    handleSubExpenseAction,
    resetExpenseForm,
    assertEditableOrAlert,
  },
});

const { bindEvents, initializeApp } = appShellController;

document.addEventListener("DOMContentLoaded", initializeApp);
