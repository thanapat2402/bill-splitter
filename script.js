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
const SHORTCUT_SCROLL_DURATION_MS = 2400;
const DEFAULT_OPEN_OWED_BALANCE_THRESHOLD = -500;

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
};

let supabaseModulePromise = null;

const dom = {
  personForm: document.getElementById("personForm"),
  personNameInput: document.getElementById("personName"),
  tripTitleInput: document.getElementById("tripTitleInput"),
  shortcutLinks: Array.from(
    document.querySelectorAll('.shortcut-chip[href^="#"]'),
  ),
  overviewPersonsCount: document.getElementById("overviewPersonsCount"),
  overviewExpensesCount: document.getElementById("overviewExpensesCount"),
  overviewTotalAmount: document.getElementById("overviewTotalAmount"),
  overviewModeText: document.getElementById("overviewModeText"),
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
  noExpensesMsg: document.getElementById("noExpenses"),
  summaryContent: document.getElementById("summaryContent"),
  settlementContent: document.getElementById("settlementContent"),
  noSettlementMsg: document.getElementById("noSettlement"),
  resetBtn: document.getElementById("resetBtn"),
  selectAllBtn: document.getElementById("selectAllBtn"),
  deselectAllBtn: document.getElementById("deselectAllBtn"),
  tripStatusBar: document.getElementById("tripStatusBar"),
  tripModeBadge: document.getElementById("tripModeBadge"),
  saveStatusText: document.getElementById("saveStatusText"),
  shareHint: document.getElementById("shareHint"),
  shareTripBtn: document.getElementById("shareTripBtn"),
  copyViewLinkBtn: document.getElementById("copyViewLinkBtn"),
  copyEditLinkBtn: document.getElementById("copyEditLinkBtn"),
  shareErrorState: document.getElementById("shareErrorState"),
  remoteUpdateNotice: document.getElementById("remoteUpdateNotice"),
  reloadLatestBtn: document.getElementById("reloadLatestBtn"),
};

function bindEvents() {
  dom.personForm.addEventListener("submit", addPerson);
  dom.expenseForm.addEventListener("submit", addExpense);
  dom.tripTitleInput.addEventListener("input", handleTripTitleInput);
  dom.tripTitleInput.addEventListener("blur", normalizeTripTitleInput);
  dom.shortcutLinks.forEach((link) => {
    link.addEventListener("click", handleShortcutClick);
  });
  dom.resetBtn.addEventListener("click", resetAll);
  dom.selectAllBtn.addEventListener("click", selectAllPersons);
  dom.deselectAllBtn.addEventListener("click", deselectAllPersons);
  dom.toggleSubExpensesBtn.addEventListener("click", toggleSubExpensesPanel);
  dom.addSubExpenseBtn.addEventListener("click", () => addSubExpenseRow());
  dom.clearSubExpensesBtn.addEventListener(
    "click",
    clearSubExpensesAndKeepPanel,
  );
  dom.subExpensesContainer.addEventListener("input", handleSubExpenseInput);
  dom.subExpensesContainer.addEventListener("click", handleSubExpenseAction);
  dom.summaryContent.addEventListener("click", handleSummaryDetailToggle);
  dom.shareTripBtn.addEventListener("click", handleShareTripClick);
  dom.copyViewLinkBtn.addEventListener("click", handleCopyViewLinkClick);
  dom.copyEditLinkBtn.addEventListener("click", handleCopyEditLinkClick);
  dom.reloadLatestBtn.addEventListener("click", handleReloadLatestClick);
}

function handleSummaryDetailToggle(event) {
  const summary = event.target.closest(".summary-detail-summary");

  if (!summary || !dom.summaryContent.contains(summary)) {
    return;
  }

  const details = summary.closest(".summary-detail-section");
  const content = details?.querySelector(".summary-detail-content");

  if (!details || !content || details.dataset.animating === "true") {
    return;
  }

  event.preventDefault();

  if (details.hasAttribute("open")) {
    collapseSummaryDetail(details, content);
    return;
  }

  expandSummaryDetail(details, content);
}

function expandSummaryDetail(details, content) {
  details.dataset.animating = "true";
  details.setAttribute("open", "");
  content.style.height = "0px";
  content.style.opacity = "0";

  requestAnimationFrame(() => {
    content.style.height = `${content.scrollHeight}px`;
    content.style.opacity = "1";
  });

  const cleanup = (event) => {
    if (event.target !== content || event.propertyName !== "height") {
      return;
    }

    content.style.height = "auto";
    content.style.opacity = "";
    delete details.dataset.animating;
    content.removeEventListener("transitionend", cleanup);
  };

  content.addEventListener("transitionend", cleanup);
}

function collapseSummaryDetail(details, content) {
  details.dataset.animating = "true";
  content.style.height = `${content.scrollHeight}px`;
  content.style.opacity = "1";

  requestAnimationFrame(() => {
    content.style.height = "0px";
    content.style.opacity = "0";
  });

  const cleanup = (event) => {
    if (event.target !== content || event.propertyName !== "height") {
      return;
    }

    details.removeAttribute("open");
    content.style.height = "";
    content.style.opacity = "";
    delete details.dataset.animating;
    content.removeEventListener("transitionend", cleanup);
  };

  content.addEventListener("transitionend", cleanup);
}

function handleShortcutClick(event) {
  const targetId = event.currentTarget.getAttribute("href");

  if (!targetId || !targetId.startsWith("#")) {
    return;
  }

  const targetElement = document.querySelector(targetId);

  if (!targetElement) {
    return;
  }

  event.preventDefault();

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    targetElement.scrollIntoView();
    history.replaceState(null, "", targetId);
    return;
  }

  smoothScrollToElement(targetElement, SHORTCUT_SCROLL_DURATION_MS);
  history.replaceState(null, "", targetId);
}

function smoothScrollToElement(targetElement, durationMs) {
  const startY = window.scrollY;
  const targetY = window.scrollY + targetElement.getBoundingClientRect().top;
  const distanceY = targetY - startY;
  const rootElement = document.documentElement;
  const previousScrollBehavior = rootElement.style.scrollBehavior;

  if (Math.abs(distanceY) < 1) {
    return;
  }

  const startTime = performance.now();

  rootElement.style.scrollBehavior = "auto";

  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / durationMs, 1);
    const easedProgress =
      progress < 0.5
        ? 8 * Math.pow(progress, 4)
        : 1 - Math.pow(-2 * progress + 2, 4) / 2;

    window.scrollTo(0, startY + distanceY * easedProgress);

    if (progress < 1) {
      requestAnimationFrame(step);
      return;
    }

    rootElement.style.scrollBehavior = previousScrollBehavior;
  }

  requestAnimationFrame(step);
}

function getTripTitle() {
  return typeof data.title === "string" ? data.title : "";
}

function getNormalizedTripTitle() {
  return getTripTitle().trim();
}

function setTripTitle(nextTitle) {
  data.title = typeof nextTitle === "string" ? nextTitle : "";
}

function handleTripTitleInput(event) {
  if (!assertEditableOrAlert()) {
    event.target.value = getTripTitle();
    return;
  }

  setTripTitle(event.target.value);
  updateHeaderUI();
  markDirty();
}

function normalizeTripTitleInput() {
  setTripTitle(dom.tripTitleInput.value.trim() || DEFAULT_TRIP_TITLE);
  updateHeaderUI();
}

function addPerson(event) {
  event.preventDefault();

  if (!assertEditableOrAlert()) {
    return;
  }

  const name = dom.personNameInput.value.trim();

  if (!name) {
    alert("กรุณากรอกชื่อบุคคล");
    return;
  }

  if (data.persons.includes(name)) {
    alert("มีคนนี้ในรายชื่อแล้ว");
    return;
  }

  data.persons.push(name);
  dom.personNameInput.value = "";
  markDirty();
  updateUI();
}

function removePerson(name) {
  if (!assertEditableOrAlert()) {
    return;
  }

  if (!confirm(`ต้องการลบ "${name}" ออกจากรายชื่อหรือไม่?`)) {
    return;
  }

  data.persons = data.persons.filter((person) => person !== name);
  data.expenses = data.expenses.filter((expense) => {
    if (expense.paidBy === name) {
      return false;
    }

    expense.splitAmong = expense.splitAmong.filter((person) => person !== name);
    return expense.splitAmong.length > 0;
  });

  markDirty();
  updateUI();
}

function addExpense(event) {
  event.preventDefault();

  if (!assertEditableOrAlert()) {
    return;
  }

  const expenseInput = getExpenseInput();
  const validationError = validateExpenseInput(expenseInput);

  if (validationError) {
    alert(validationError);
    return;
  }

  data.expenses.push(createExpense(expenseInput));
  resetExpenseForm();
  markDirty();
  updateUI();
}

function getExpenseInput() {
  const { subExpenses, hasIncompleteRows } = collectSubExpenses();
  const manualAmount = parseFloat(dom.expenseTotalInput.value);

  return {
    name: dom.expenseNameInput.value.trim(),
    paidBy: dom.paidBySelect.value,
    splitAmong: getCheckedSplitPersons(),
    subExpenses,
    hasIncompleteRows,
    amount: subExpenses.length
      ? calculateSubExpenseTotal(subExpenses)
      : roundCurrency(manualAmount),
  };
}

function validateExpenseInput(expenseInput) {
  if (!expenseInput.name) {
    return "กรุณากรอกชื่อรายการ";
  }

  if (expenseInput.hasIncompleteRows) {
    return "กรุณากรอกชื่อและจำนวนเงินของรายการย่อยให้ครบ";
  }

  if (expenseInput.amount <= 0) {
    return expenseInput.subExpenses.length > 0
      ? "กรุณาเพิ่มรายการย่อยที่มีจำนวนเงินมากกว่า 0"
      : "กรุณากรอกยอดรวมรายการที่มากกว่า 0";
  }

  if (!expenseInput.paidBy) {
    return "กรุณาเลือกผู้จ่าย";
  }

  if (expenseInput.splitAmong.length === 0) {
    return "กรุณาเลือกผู้ที่แบ่งหารอย่างน้อย 1 คน";
  }

  return null;
}

function createExpense({ name, amount, subExpenses, paidBy, splitAmong }) {
  return {
    id: Date.now(),
    name,
    amount,
    subExpenses,
    paidBy,
    splitAmong,
    date: new Date().toLocaleDateString("th-TH"),
  };
}

function removeExpense(id) {
  if (!assertEditableOrAlert()) {
    return;
  }

  if (!confirm("ต้องการลบรายการนี้หรือไม่?")) {
    return;
  }

  data.expenses = data.expenses.filter((expense) => expense.id !== id);
  markDirty();
  updateUI();
}

function resetAll() {
  if (!assertEditableOrAlert()) {
    return;
  }

  if (!confirm("ต้องการรีเซ็ตทั้งหมดหรือไม่? (ลบทุกข้อมูล)")) {
    return;
  }

  data.title = DEFAULT_TRIP_TITLE;
  data.persons = [];
  data.expenses = [];
  dom.personForm.reset();
  resetExpenseForm();
  markDirty();
  updateUI();
}

function getCheckedSplitPersons() {
  return Array.from(
    dom.splitPersonsDiv.querySelectorAll('input[type="checkbox"]:checked'),
    (checkbox) => checkbox.value,
  );
}

function selectAllPersons(event) {
  event.preventDefault();

  if (!assertEditableOrAlert()) {
    return;
  }

  setSplitPersonsSelection(true);
}

function deselectAllPersons(event) {
  event.preventDefault();

  if (!assertEditableOrAlert()) {
    return;
  }

  setSplitPersonsSelection(false);
}

function setSplitPersonsSelection(isChecked) {
  dom.splitPersonsDiv
    .querySelectorAll('input[type="checkbox"]')
    .forEach((checkbox) => {
      checkbox.checked = isChecked;
    });
}

function handleSubExpenseInput(event) {
  if (
    event.target.classList.contains("sub-expense-name") ||
    event.target.classList.contains("sub-expense-amount")
  ) {
    updateExpenseTotal();
  }
}

function handleSubExpenseAction(event) {
  const removeButton = event.target.closest(
    '[data-action="remove-sub-expense"]',
  );

  if (!removeButton) {
    return;
  }

  event.preventDefault();
  removeSubExpenseRow(removeButton);
}

function toggleSubExpensesPanel() {
  if (!assertEditableOrAlert()) {
    return;
  }

  setSubExpensesPanelVisibility(
    dom.subExpensesPanel.classList.contains("is-hidden"),
  );
}

function showSubExpensesPanel() {
  setSubExpensesPanelVisibility(true);
}

function hideSubExpensesPanel() {
  setSubExpensesPanelVisibility(false);
}

function setSubExpensesPanelVisibility(isVisible) {
  dom.subExpensesPanel.classList.toggle("is-hidden", !isVisible);
  dom.subExpensesPanel.setAttribute("aria-hidden", String(!isVisible));
  dom.toggleSubExpensesBtn.setAttribute("aria-expanded", String(isVisible));
  dom.toggleSubExpensesBtn.classList.toggle("is-expanded", isVisible);
  dom.toggleSubExpensesBtn.querySelector(".accordion-toggle-text").textContent =
    isVisible ? "ซ่อนรายการย่อย" : "เพิ่มรายการย่อย";

  if (isVisible && dom.subExpensesContainer.children.length === 0) {
    addSubExpenseRow();
  }

  updateExpenseTotal();
  updateSubExpenseSummary();
}

function clearSubExpenses() {
  dom.subExpensesContainer.innerHTML = "";
}

function clearSubExpensesAndKeepPanel() {
  if (!assertEditableOrAlert()) {
    return;
  }

  clearSubExpenses();
  addSubExpenseRow();
  dom.expenseTotalInput.readOnly = false;
  dom.expenseTotalInput.value = "";
  updateSubExpenseSummary();
}

function addSubExpenseRow(name = "", amount = "") {
  if (!canEdit()) {
    return;
  }

  const row = createSubExpenseRowElement(name, amount);
  dom.subExpensesContainer.appendChild(row);
  row.querySelector(".sub-expense-name").value = name;
  row.querySelector(".sub-expense-amount").value = amount;
  updateExpenseTotal();
}

function createSubExpenseRowElement(name, amount) {
  const row = document.createElement("div");
  row.className = "sub-expense-row";
  row.innerHTML = `
        <input
            type="text"
            class="sub-expense-name"
            placeholder="ชื่อรายการย่อย"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            value="${escapeAttribute(name)}"
        />
        <input
            type="number"
            class="sub-expense-amount"
            placeholder="0.00"
            min="0"
            step="0.01"
            autocomplete="off"
            value="${amount}"
        />
        <button
            type="button"
            class="btn btn-remove"
            data-action="remove-sub-expense"
        >
            ลบ
        </button>
    `;
  return row;
}

function removeSubExpenseRow(button) {
  if (!canEdit()) {
    return;
  }

  const row = button.closest(".sub-expense-row");
  const rows = getSubExpenseRows();

  if (rows.length === 1) {
    row.querySelector(".sub-expense-name").value = "";
    row.querySelector(".sub-expense-amount").value = "";
  } else {
    row.remove();
  }

  updateExpenseTotal();
}

function getSubExpenseRows() {
  return Array.from(
    dom.subExpensesContainer.querySelectorAll(".sub-expense-row"),
  );
}

function collectSubExpenses() {
  const subExpenses = [];
  let hasIncompleteRows = false;

  getSubExpenseRows().forEach((row) => {
    const name = row.querySelector(".sub-expense-name").value.trim();
    const rawAmount = row.querySelector(".sub-expense-amount").value.trim();
    const parsedAmount = parseFloat(rawAmount);

    if (!name && !rawAmount) {
      return;
    }

    if (
      !name ||
      !rawAmount ||
      Number.isNaN(parsedAmount) ||
      parsedAmount <= 0
    ) {
      hasIncompleteRows = true;
      return;
    }

    subExpenses.push({
      name,
      amount: roundCurrency(parsedAmount),
    });
  });

  return { subExpenses, hasIncompleteRows };
}

function calculateSubExpenseTotal(subExpenses) {
  return roundCurrency(subExpenses.reduce((sum, item) => sum + item.amount, 0));
}

function updateExpenseTotal() {
  const { subExpenses } = collectSubExpenses();

  if (subExpenses.length > 0) {
    const total = calculateSubExpenseTotal(subExpenses);
    dom.expenseTotalInput.value = total > 0 ? total.toFixed(2) : "";
    dom.expenseTotalInput.readOnly = true;
    updateSubExpenseSummary(subExpenses, total);
    return;
  }

  if (dom.expenseTotalInput.readOnly) {
    dom.expenseTotalInput.value = "";
  }

  dom.expenseTotalInput.readOnly = false;
  updateSubExpenseSummary();
}

function updateSubExpenseSummary(subExpenses = [], total = 0) {
  const summaryElement = dom.toggleSubExpensesBtn.querySelector(
    ".accordion-toggle-summary",
  );

  if (subExpenses.length === 0) {
    summaryElement.textContent = "ยังไม่มีรายการย่อย";
    return;
  }

  const itemLabel =
    subExpenses.length === 1
      ? "1 รายการย่อย"
      : `${subExpenses.length} รายการย่อย`;
  summaryElement.textContent = `${itemLabel} • รวม ${formatAmount(total)} บาท`;
}

function resetExpenseForm() {
  dom.expenseForm.reset();
  dom.expenseTotalInput.readOnly = false;
  clearSubExpenses();
  hideSubExpensesPanel();
  updateSubExpenseSummary();
}

function roundCurrency(amount) {
  return Math.round(amount * 100) / 100;
}

function formatAmount(amount) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function escapeAttribute(str) {
  return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function escapeQuotes(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function updateUI() {
  updateHeaderUI();
  updateOverviewUI();
  updatePersonsList();
  updateCheckboxes();
  updatePaidBySelect();
  updateExpensesList();
  updateSummary();
  updateSettlement();
  applyReadOnlyUI(!canEdit());
  updateShareUI();
}

function updateHeaderUI() {
  const tripTitle = getTripTitle();
  const normalizedTripTitle = getNormalizedTripTitle() || DEFAULT_TRIP_TITLE;
  dom.tripTitleInput.value = tripTitle;
  document.title = `${normalizedTripTitle} - ${PROJECT_NAME}`;
}

function updateOverviewUI() {
  const totalAmount = roundCurrency(
    data.expenses.reduce((sum, expense) => sum + expense.amount, 0),
  );

  dom.overviewPersonsCount.textContent = String(data.persons.length);
  dom.overviewExpensesCount.textContent = String(data.expenses.length);
  dom.overviewTotalAmount.textContent = formatAmount(totalAmount);
  dom.overviewModeText.textContent = getOverviewModeText();
}

function getOverviewModeText() {
  if (appState.mode === "shared-edit") {
    return "แก้ไขร่วมกัน";
  }

  if (appState.mode === "shared-view") {
    return "ดูอย่างเดียว";
  }

  return "โหมดในเครื่อง";
}

function updatePersonsList() {
  dom.personsList.innerHTML = "";

  if (data.persons.length === 0) {
    dom.personsList.innerHTML =
      '<p class="empty-message">ยังไม่มีสมาชิกในกลุ่ม</p>';
    return;
  }

  data.persons.forEach((person) => {
    const item = document.createElement("div");
    item.className = "person-item";
    item.innerHTML = `
            <span class="person-name">${person}</span>
            <button type="button" class="btn btn-remove" onclick="removePerson('${escapeQuotes(person)}')">ลบ</button>
        `;
    dom.personsList.appendChild(item);
  });
}

function updateCheckboxes() {
  dom.splitPersonsDiv.innerHTML = data.persons
    .map(
      (person) => `
            <label class="checkbox-item">
                <input type="checkbox" value="${person}">
                <span>${person}</span>
            </label>
        `,
    )
    .join("");
}

function updatePaidBySelect() {
  const currentValue = dom.paidBySelect.value;
  dom.paidBySelect.innerHTML = '<option value="">-- เลือกผู้จ่าย --</option>';

  data.persons.forEach((person) => {
    const option = document.createElement("option");
    option.value = person;
    option.textContent = person;
    dom.paidBySelect.appendChild(option);
  });

  if (data.persons.includes(currentValue)) {
    dom.paidBySelect.value = currentValue;
  }
}

function updateExpensesList() {
  dom.expensesList.innerHTML = "";

  if (data.expenses.length === 0) {
    dom.noExpensesMsg.style.display = "block";
    return;
  }

  dom.noExpensesMsg.style.display = "none";
  data.expenses.forEach((expense) => {
    const item = document.createElement("div");
    item.className = "expense-item";
    item.innerHTML = createExpenseMarkup(expense);
    dom.expensesList.appendChild(item);
  });
}

function createExpenseMarkup(expense) {
  const splitCount = expense.splitAmong.length;
  const amountPerPerson = expense.amount / splitCount;

  return `
            <div class="expense-detail">
                <div class="expense-name">${expense.name}</div>
                <div class="expense-info">💸 ${expense.paidBy} จ่ายไป</div>
                <div class="expense-info">📅 ${expense.date}</div>
                <div class="sub-expense-list">${createSubExpenseListMarkup(expense.subExpenses)}</div>
            </div>
            <div class="expense-amount">
                <div class="amount">รวม ${formatAmount(expense.amount)} บาท</div>
                <div class="split-info">แบ่งให้ ${splitCount} คน</div>
                <div class="split-info">(${formatAmount(amountPerPerson)} บาท/คน)</div>
            </div>
            <div class="expense-actions">
                <button type="button" class="btn btn-remove" onclick="removeExpense(${expense.id})">ลบ</button>
            </div>
        `;
}

function createSubExpenseListMarkup(subExpenses = []) {
  return subExpenses
    .map(
      (subExpense) => `
          <div class="sub-expense-item">
            <span>${subExpense.name}</span>
            <span>${formatAmount(subExpense.amount)} บาท</span>
          </div>
        `,
    )
    .join("");
}

function calculateSummary() {
  const summary = Object.fromEntries(
    data.persons.map((person) => [
      person,
      {
        paid: 0,
        owed: 0,
        balance: 0,
      },
    ]),
  );

  data.expenses.forEach((expense) => {
    summary[expense.paidBy].paid += expense.amount;

    const amountPerPerson = expense.amount / expense.splitAmong.length;
    expense.splitAmong.forEach((person) => {
      summary[person].owed += amountPerPerson;
    });
  });

  Object.values(summary).forEach((stats) => {
    stats.balance = stats.paid - stats.owed;
  });

  return summary;
}

function getPersonDetails(person) {
  return data.expenses.reduce(
    (details, expense) => {
      if (expense.paidBy === person) {
        details.paid.push({
          name: expense.name,
          amount: expense.amount,
          count: expense.splitAmong.length,
        });
      }

      if (expense.splitAmong.includes(person)) {
        details.owed.push({
          name: expense.name,
          amount: expense.amount / expense.splitAmong.length,
        });
      }

      return details;
    },
    { paid: [], owed: [] },
  );
}

function updateSummary() {
  const summary = calculateSummary();
  dom.summaryContent.innerHTML = "";

  if (data.persons.length === 0) {
    dom.summaryContent.innerHTML =
      '<p class="empty-message">ยังไม่มีสมาชิกในกลุ่ม</p>';
    return;
  }

  data.persons.forEach((person) => {
    const card = document.createElement("div");
    card.className = "summary-card";
    card.innerHTML = createSummaryCardMarkup(
      person,
      summary[person],
      getPersonDetails(person),
    );
    dom.summaryContent.appendChild(card);
  });
}

function createSummaryCardMarkup(person, stats, details) {
  const shouldOpenOwedSection = shouldOpenOwedSectionByDefault(stats);

  return `
      <div class="summary-card-header">
        <div class="summary-person-name">${person}</div>
      </div>
      <div class="summary-card-body">
            ${buildDetailSectionMarkup("💵 จ่ายแล้ว", stats.paid, details.paid, (item) => `${item.name}: ${formatAmount(item.amount)} บาท (แบ่ง ${item.count} คน)`, "paid")}
            ${buildDetailSectionMarkup("💸 ต้องจ่าย", stats.owed, details.owed, (item) => `${item.name}: ${formatAmount(item.amount)} บาท`, "owed", shouldOpenOwedSection)}
      </div>
            <hr class="summary-divider">
      <div class="summary-balance-row">
        <div class="summary-label">คงเหลือ</div>
        <div class="summary-value ${getBalanceClass(stats.balance)}">
          ${stats.balance > 0 ? "+" : ""}${formatAmount(stats.balance)}
        </div>
      </div>
        `;
}

function shouldOpenOwedSectionByDefault(stats) {
  return stats.balance <= DEFAULT_OPEN_OWED_BALANCE_THRESHOLD && stats.owed > 0;
}

function buildDetailSectionMarkup(
  title,
  totalAmount,
  items,
  formatter,
  tone,
  defaultOpen = false,
) {
  const itemCountLabel =
    items.length === 1 ? "1 รายการ" : `${items.length} รายการ`;
  const toneClass = tone ? ` summary-detail-section-${tone}` : "";
  const openAttribute = defaultOpen ? " open" : "";

  if (items.length === 0) {
    return `
      <details class="summary-detail-section${toneClass}"${openAttribute}>
        <summary class="summary-detail-summary">
          <div class="summary-detail-summary-main">
            <span class="summary-detail-title">${title}</span>
            <div class="summary-detail-summary-value">
              <strong class="summary-detail-summary-amount">${formatAmount(totalAmount)}</strong>
              <span class="summary-detail-summary-unit">บาท</span>
            </div>
          </div>
          <span class="summary-detail-count">ยังไม่มี</span>
        </summary>
        <div class="summary-detail-content">
          <div class="summary-detail-list">
            <div class="summary-detail-empty">ยังไม่มี</div>
          </div>
        </div>
      </details>
    `;
  }

  const itemsMarkup = items
    .map((item) => `<div class="summary-detail-item">${formatter(item)}</div>`)
    .join("");

  return `
    <details class="summary-detail-section${toneClass}"${openAttribute}>
      <summary class="summary-detail-summary">
        <div class="summary-detail-summary-main">
          <span class="summary-detail-title">${title}</span>
          <div class="summary-detail-summary-value">
            <strong class="summary-detail-summary-amount">${formatAmount(totalAmount)}</strong>
            <span class="summary-detail-summary-unit">บาท</span>
          </div>
        </div>
        <span class="summary-detail-count">${itemCountLabel}</span>
      </summary>
      <div class="summary-detail-content">
        <div class="summary-detail-list">${itemsMarkup}</div>
      </div>
    </details>
  `;
}

function getBalanceClass(balance) {
  if (balance > 0) {
    return "summary-value-positive";
  }

  if (balance < 0) {
    return "summary-value-negative";
  }

  return "summary-value-neutral";
}

function calculateSettlement() {
  const summary = calculateSummary();
  const debtors = [];
  const creditors = [];
  const settlements = [];

  Object.entries(summary).forEach(([person, stats]) => {
    const balance = roundCurrency(stats.balance);

    if (balance > 0.01) {
      creditors.push({ person, amount: balance });
    } else if (balance < -0.01) {
      debtors.push({ person, amount: Math.abs(balance) });
    }
  });

  debtors.forEach((debtor) => {
    let debtorRemaining = debtor.amount;

    for (const creditor of creditors) {
      if (debtorRemaining <= 0.01) {
        break;
      }

      if (creditor.amount <= 0.01) {
        continue;
      }

      const settleAmount = Math.min(
        roundCurrency(debtorRemaining),
        roundCurrency(creditor.amount),
      );

      if (settleAmount <= 0.01) {
        continue;
      }

      settlements.push({
        from: debtor.person,
        to: creditor.person,
        amount: settleAmount,
      });

      creditor.amount = roundCurrency(creditor.amount - settleAmount);
      debtorRemaining = roundCurrency(debtorRemaining - settleAmount);
    }
  });

  return settlements;
}

function updateSettlement() {
  const settlements = calculateSettlement();
  dom.settlementContent.innerHTML = "";

  if (settlements.length === 0) {
    dom.noSettlementMsg.style.display = "block";
    return;
  }

  dom.noSettlementMsg.style.display = "none";
  settlements.forEach((settlement) => {
    const item = document.createElement("div");
    item.className = "settlement-item";
    item.innerHTML = `
            <div class="settlement-text">
                <span class="settlement-from">${settlement.from}</span>
                <span class="settlement-arrow">→</span>
                <span class="settlement-to">${settlement.to}</span>
            </div>
            <div class="settlement-amount">${formatAmount(settlement.amount)} บาท</div>
        `;
    dom.settlementContent.appendChild(item);
  });
}

function exportTripData() {
  const normalizedTripTitle = getNormalizedTripTitle();

  return {
    schemaVersion: TRIP_SCHEMA_VERSION,
    ...(normalizedTripTitle ? { title: normalizedTripTitle } : {}),
    persons: [...data.persons],
    expenses: data.expenses.map((expense) => ({
      id: expense.id,
      name: expense.name,
      amount: roundCurrency(expense.amount),
      subExpenses: (expense.subExpenses || []).map((item) => ({
        name: item.name,
        amount: roundCurrency(item.amount),
      })),
      paidBy: expense.paidBy,
      splitAmong: [...expense.splitAmong],
      date: expense.date,
    })),
  };
}

function importTripData(rawData) {
  validateTripDataShape(rawData);
  applyTripSnapshot(normalizeTripData(rawData));
}

function validateTripDataShape(rawData) {
  if (!rawData || typeof rawData !== "object") {
    throw new Error("INVALID_TRIP_DATA");
  }

  if (rawData.schemaVersion !== TRIP_SCHEMA_VERSION) {
    throw new Error("UNSUPPORTED_TRIP_SCHEMA");
  }

  if (rawData.title !== undefined && typeof rawData.title !== "string") {
    throw new Error("INVALID_TRIP_DATA");
  }

  if (!Array.isArray(rawData.persons) || !Array.isArray(rawData.expenses)) {
    throw new Error("INVALID_TRIP_DATA");
  }

  const validPersons = new Set(
    rawData.persons.filter((person) => typeof person === "string"),
  );

  rawData.expenses.forEach((expense) => {
    if (!expense || typeof expense !== "object") {
      throw new Error("INVALID_TRIP_DATA");
    }

    if (!Array.isArray(expense.splitAmong) || expense.splitAmong.length === 0) {
      throw new Error("INVALID_TRIP_DATA");
    }

    if (!validPersons.has(expense.paidBy)) {
      throw new Error("INVALID_TRIP_DATA");
    }

    expense.splitAmong.forEach((person) => {
      if (!validPersons.has(person)) {
        throw new Error("INVALID_TRIP_DATA");
      }
    });

    const subExpenses = Array.isArray(expense.subExpenses)
      ? expense.subExpenses
      : [];
    const subExpenseTotal = roundCurrency(
      subExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    );

    if (
      subExpenses.length > 0 &&
      subExpenseTotal !== roundCurrency(Number(expense.amount))
    ) {
      throw new Error("INVALID_TRIP_DATA");
    }
  });
}

function normalizeTripData(rawData) {
  return {
    schemaVersion: TRIP_SCHEMA_VERSION,
    title: typeof rawData.title === "string" ? rawData.title.trim() : "",
    persons: rawData.persons
      .map((person) => String(person).trim())
      .filter(Boolean),
    expenses: rawData.expenses.map((expense) => ({
      id: Number(expense.id),
      name: String(expense.name).trim(),
      amount: roundCurrency(Number(expense.amount)),
      subExpenses: Array.isArray(expense.subExpenses)
        ? expense.subExpenses.map((item) => ({
            name: String(item.name).trim(),
            amount: roundCurrency(Number(item.amount)),
          }))
        : [],
      paidBy: String(expense.paidBy),
      splitAmong: expense.splitAmong.map((person) => String(person)),
      date: String(expense.date),
    })),
  };
}

function applyTripSnapshot(snapshot) {
  data.title = snapshot.title;
  data.persons = [...snapshot.persons];
  data.expenses = snapshot.expenses.map((expense) => ({
    ...expense,
    subExpenses: expense.subExpenses.map((item) => ({ ...item })),
    splitAmong: [...expense.splitAmong],
  }));
}

function parseShareTokenFromUrl() {
  const url = new URL(window.location.href);
  return url.searchParams.get("share") || "";
}

function initializeApp() {
  bindEvents();
  resetExpenseForm();

  const shareToken = parseShareTokenFromUrl();

  if (!shareToken) {
    updateUI();
    return;
  }

  appState.shareToken = shareToken;
  setAppMode("shared-view", "view");
  setSavingState(true);
  updateUI();
  void loadSharedTrip(shareToken);
}

function isSharedMode() {
  return appState.mode === "shared-view" || appState.mode === "shared-edit";
}

function canEdit() {
  return appState.mode === "local" || appState.mode === "shared-edit";
}

function assertEditableOrAlert() {
  if (canEdit()) {
    return true;
  }

  alert("ลิงก์นี้เป็นโหมดดูอย่างเดียว");
  return false;
}

function setAppMode(mode, role = "edit") {
  appState.mode = mode;
  appState.role = role;

  if (isSharedMode()) {
    startTripSync();
    return;
  }

  stopTripSync();
}

function markDirty() {
  appState.isDirty = true;
  clearAutosaveTimer();
  setSaveError("");

  if (appState.tripId && canEdit()) {
    scheduleAutosave();
  }
}

function clearDirty() {
  appState.isDirty = false;
}

function setSaveError(message) {
  appState.saveError = message;
}

function setLoadError(message) {
  appState.loadError = message;
}

function setSavingState(isSaving) {
  appState.isSaving = isSaving;
}

function setRemoteUpdateState(hasRemoteUpdate, remoteVersion = null) {
  appState.hasRemoteUpdate = hasRemoteUpdate;
  appState.remoteVersion = remoteVersion;
}

function clearAutosaveTimer() {
  if (!appState.autosaveTimerId) {
    return;
  }

  window.clearTimeout(appState.autosaveTimerId);
  appState.autosaveTimerId = null;
}

function applyReadOnlyUI(isReadOnly) {
  document.body.classList.toggle("is-readonly", isReadOnly);

  dom.personNameInput.disabled = isReadOnly;
  dom.tripTitleInput.disabled = isReadOnly;
  dom.expenseNameInput.disabled = isReadOnly;
  dom.expenseTotalInput.disabled = isReadOnly;
  dom.paidBySelect.disabled = isReadOnly;
  dom.selectAllBtn.disabled = isReadOnly;
  dom.deselectAllBtn.disabled = isReadOnly;
  dom.toggleSubExpensesBtn.disabled = isReadOnly;
  dom.addSubExpenseBtn.disabled = isReadOnly;
  dom.clearSubExpensesBtn.disabled = isReadOnly;
  dom.resetBtn.disabled = isReadOnly;

  dom.personForm.querySelector('button[type="submit"]').disabled = isReadOnly;
  dom.expenseForm.querySelector('button[type="submit"]').disabled = isReadOnly;

  dom.splitPersonsDiv
    .querySelectorAll('input[type="checkbox"]')
    .forEach((checkbox) => {
      checkbox.disabled = isReadOnly;
    });

  dom.subExpensesContainer
    .querySelectorAll("input, button")
    .forEach((element) => {
      element.disabled = isReadOnly;
    });

  document.querySelectorAll(".btn-remove").forEach((button) => {
    button.disabled = isReadOnly;
  });
}

function updateShareUI() {
  updateModeBadge();
  updateSaveStatusText();
  updateShareErrorState();
  updateRemoteUpdateNotice();

  dom.shareTripBtn.disabled = !canEdit() || appState.isSaving;
  dom.copyViewLinkBtn.disabled = !appState.shareLinks.viewUrl;
  dom.copyEditLinkBtn.disabled = !appState.shareLinks.editUrl || !canEdit();
  dom.shareTripBtn.textContent = getShareButtonLabel();
  dom.shareHint.textContent = getShareHintText();
  dom.shareTripBtn.title = getSharePrimaryActionTitle();
  dom.copyViewLinkBtn.title = appState.shareLinks.viewUrl
    ? "คัดลอกลิงก์สำหรับส่งให้คนที่ดูได้อย่างเดียว"
    : "สร้างทริปแชร์ก่อนจึงจะคัดลอกลิงก์ดูอย่างเดียวได้";
  dom.copyEditLinkBtn.title = appState.shareLinks.editUrl
    ? "คัดลอกลิงก์สำหรับคนที่ต้องช่วยแก้ไขทริป"
    : "สร้างทริปแชร์ก่อนจึงจะคัดลอกลิงก์แก้ไขได้";
}

function getShareButtonLabel() {
  if (appState.mode === "local") {
    return "สร้างลิงก์แชร์";
  }

  if (appState.mode === "shared-edit") {
    return "บันทึกตอนนี้";
  }

  return "ดูอย่างเดียว";
}

function getShareHintText() {
  if (appState.loadError) {
    return "ลิงก์นี้โหลดไม่สำเร็จ ตรวจสอบว่า Edge Function ถูก deploy และลิงก์ยังใช้งานได้";
  }

  if (appState.hasRemoteUpdate && canEdit()) {
    return "มี snapshot ใหม่บนเซิร์ฟเวอร์ ต้องกด Reload latest ก่อนจึงจะบันทึกต่อได้";
  }

  if (appState.mode === "local") {
    return "สร้างลิงก์แชร์ครั้งแรกเพื่อเปลี่ยนเอกสารนี้เป็น shared trip และเปิดลิงก์ดูอย่างเดียวกับลิงก์แก้ไข";
  }

  if (appState.mode === "shared-view") {
    return "ลิงก์นี้ดูได้อย่างเดียว ไม่สามารถแก้ไขหรือบันทึกข้อมูลได้";
  }

  return "บันทึกทริปนี้ขึ้นเซิร์ฟเวอร์อัตโนมัติหลัง action ที่ commit แล้ว และคัดลอกลิงก์ได้จากปุ่มด้านล่าง";
}

function getSharePrimaryActionTitle() {
  if (!canEdit()) {
    return "ลิงก์นี้เป็นโหมดดูอย่างเดียว";
  }

  if (appState.mode === "local") {
    return "สร้าง shared trip และออกลิงก์ดูอย่างเดียวกับลิงก์แก้ไข";
  }

  return "บันทึก snapshot ล่าสุดขึ้นเซิร์ฟเวอร์ทันที";
}

function updateModeBadge() {
  dom.tripModeBadge.className = "trip-mode-badge";

  if (appState.mode === "local") {
    dom.tripModeBadge.textContent = "โหมดในเครื่อง";
    dom.tripModeBadge.classList.add("trip-mode-badge-local");
    return;
  }

  if (appState.mode === "shared-view") {
    dom.tripModeBadge.textContent = "ดูอย่างเดียว";
    dom.tripModeBadge.classList.add("trip-mode-badge-view");
    return;
  }

  dom.tripModeBadge.textContent = "แก้ไขได้";
  dom.tripModeBadge.classList.add("trip-mode-badge-edit");
}

function updateSaveStatusText() {
  if (appState.loadError) {
    dom.saveStatusText.textContent = "โหลดลิงก์ไม่สำเร็จ";
    dom.saveStatusText.className = "save-status save-status-error";
    return;
  }

  if (appState.saveError) {
    dom.saveStatusText.textContent = appState.saveError;
    dom.saveStatusText.className = "save-status save-status-error";
    return;
  }

  if (appState.isSaving) {
    dom.saveStatusText.textContent = "กำลังบันทึก...";
    dom.saveStatusText.className = "save-status save-status-saving";
    return;
  }

  if (appState.mode === "local") {
    dom.saveStatusText.textContent = appState.isDirty
      ? "มีการเปลี่ยนแปลงที่ยังไม่บันทึก"
      : "ยังไม่ได้แชร์";
    dom.saveStatusText.className = "save-status";
    return;
  }

  dom.saveStatusText.textContent = appState.lastSavedAt
    ? `บันทึกล่าสุด ${new Date(appState.lastSavedAt).toLocaleString("th-TH")}`
    : "พร้อมเชื่อมต่อ Supabase";
  dom.saveStatusText.className = "save-status";
}

function updateShareErrorState() {
  const hasLoadError = Boolean(appState.loadError);

  dom.shareErrorState.textContent = hasLoadError ? appState.loadError : "";
  dom.shareErrorState.classList.toggle("is-hidden", !hasLoadError);
}

function updateRemoteUpdateNotice() {
  const hasRemoteUpdate = appState.hasRemoteUpdate && canEdit();

  dom.remoteUpdateNotice.classList.toggle("is-hidden", !hasRemoteUpdate);
  dom.reloadLatestBtn.disabled = !hasRemoteUpdate;
}

function handleShareTripClick() {
  if (!canEdit()) {
    alert("ลิงก์นี้เป็นโหมดดูอย่างเดียว");
    return;
  }

  if (!appState.tripId) {
    void createSharedTrip();
    return;
  }

  void saveSharedTrip({ manual: true });
}

function handleReloadLatestClick() {
  if (!appState.shareToken) {
    return;
  }

  void loadSharedTrip(appState.shareToken, { notifyOnError: true });
}

async function handleCopyViewLinkClick() {
  if (!appState.shareLinks.viewUrl) {
    return;
  }

  await navigator.clipboard.writeText(appState.shareLinks.viewUrl);
  alert("คัดลอกลิงก์ดูอย่างเดียวแล้ว");
}

async function handleCopyEditLinkClick() {
  if (!appState.shareLinks.editUrl) {
    return;
  }

  await navigator.clipboard.writeText(appState.shareLinks.editUrl);
  alert("คัดลอกลิงก์แก้ไขแล้ว");
}

function scheduleAutosave() {
  if (
    !appState.tripId ||
    !appState.shareToken ||
    !canEdit() ||
    appState.hasRemoteUpdate
  ) {
    return;
  }

  appState.autosaveTimerId = window.setTimeout(() => {
    void saveSharedTrip({ manual: false });
  }, 1500);
}

async function postShareRequest(path, payload) {
  let response;

  try {
    response = await fetch(`${SHARE_API_BASE_URL}/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    const networkError = new Error("NETWORK_REQUEST_FAILED");
    networkError.code = "NETWORK_REQUEST_FAILED";
    throw networkError;
  }

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(result.message || "REQUEST_FAILED");
    error.status = response.status;
    error.code = result.errorCode || "REQUEST_FAILED";
    error.payload = result;
    throw error;
  }

  return result;
}

async function getRealtimeClient() {
  if (appState.realtimeClient) {
    return appState.realtimeClient;
  }

  if (!supabaseModulePromise) {
    supabaseModulePromise =
      import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
  }

  const { createClient } = await supabaseModulePromise;
  appState.realtimeClient = createClient(
    SUPABASE_PROJECT_URL,
    SUPABASE_PUBLISHABLE_KEY,
  );
  return appState.realtimeClient;
}

function getTripRealtimeChannelName(tripId) {
  return `trip:${tripId}`;
}

function shouldAutoReloadRemoteUpdate(nextVersion) {
  if (!Number.isInteger(nextVersion)) {
    return false;
  }

  if (nextVersion <= (appState.version ?? 0)) {
    return false;
  }

  if (appState.isSaving) {
    return false;
  }

  return appState.mode === "shared-view" || !appState.isDirty;
}

function handleRealtimeTripUpdate(payload) {
  const nextVersion = Number(payload?.payload?.version);

  if (!Number.isInteger(nextVersion)) {
    return;
  }

  if (nextVersion <= (appState.version ?? 0)) {
    return;
  }

  if (shouldAutoReloadRemoteUpdate(nextVersion)) {
    void loadSharedTrip(appState.shareToken, { backgroundSync: true });
    return;
  }

  setRemoteUpdateState(true, nextVersion);
  clearAutosaveTimer();
  updateShareUI();
}

async function ensureTripRealtimeChannel() {
  if (!appState.tripId) {
    return null;
  }

  const expectedChannelName = getTripRealtimeChannelName(appState.tripId);

  if (
    appState.realtimeChannel &&
    appState.realtimeChannel.topic === expectedChannelName
  ) {
    if (appState.realtimeJoinPromise) {
      await appState.realtimeJoinPromise;
    }

    return appState.realtimeStatus === "SUBSCRIBED"
      ? appState.realtimeChannel
      : null;
  }

  await stopRealtimeChannel();

  const client = await getRealtimeClient();
  const channel = client.channel(expectedChannelName, {
    config: {
      broadcast: {
        ack: true,
      },
    },
  });

  channel.on("broadcast", { event: REALTIME_SYNC_EVENT }, (payload) => {
    handleRealtimeTripUpdate(payload);
  });

  appState.realtimeChannel = channel;
  appState.realtimeStatus = "connecting";

  appState.realtimeJoinPromise = new Promise((resolve) => {
    channel.subscribe((status) => {
      if (appState.realtimeChannel !== channel) {
        resolve(null);
        return;
      }

      appState.realtimeStatus = status;

      if (status === "SUBSCRIBED") {
        stopVersionPolling();
        resolve(status);
        return;
      }

      if (
        status === "CHANNEL_ERROR" ||
        status === "TIMED_OUT" ||
        status === "CLOSED"
      ) {
        if (canEdit()) {
          startVersionPolling();
        }

        resolve(status);
      }
    });
  });

  await appState.realtimeJoinPromise;
  return appState.realtimeStatus === "SUBSCRIBED" ? channel : null;
}

async function stopRealtimeChannel() {
  if (!appState.realtimeChannel || !appState.realtimeClient) {
    appState.realtimeChannel = null;
    appState.realtimeJoinPromise = null;
    appState.realtimeStatus = "idle";
    return;
  }

  const activeChannel = appState.realtimeChannel;
  appState.realtimeChannel = null;
  appState.realtimeJoinPromise = null;
  appState.realtimeStatus = "idle";
  await appState.realtimeClient.removeChannel(activeChannel);
}

function startTripSync() {
  if (!appState.tripId || !appState.shareToken) {
    return;
  }

  void ensureTripRealtimeChannel().catch(() => {
    if (canEdit()) {
      startVersionPolling();
    }
  });
}

function stopTripSync() {
  void stopRealtimeChannel();
  stopVersionPolling();
}

async function broadcastTripUpdate(version, updatedAt) {
  if (!appState.tripId) {
    return;
  }

  try {
    const channel = await ensureTripRealtimeChannel();

    if (!channel) {
      return;
    }

    await channel.send({
      type: "broadcast",
      event: REALTIME_SYNC_EVENT,
      payload: {
        tripId: appState.tripId,
        version,
        updatedAt,
      },
    });
  } catch {
    // Realtime is best-effort. Polling fallback handles missed notifications.
  }
}

function startVersionPolling() {
  stopVersionPolling();

  if (!appState.shareToken || !canEdit()) {
    return;
  }

  appState.versionPollTimerId = window.setInterval(() => {
    void pollTripVersion();
  }, 15000);
}

function stopVersionPolling() {
  if (!appState.versionPollTimerId) {
    return;
  }

  window.clearInterval(appState.versionPollTimerId);
  appState.versionPollTimerId = null;
}

async function pollTripVersion() {
  if (
    !appState.shareToken ||
    !appState.tripId ||
    !canEdit() ||
    appState.isSaving
  ) {
    return;
  }

  try {
    const result = await postShareRequest("get-trip-version", {
      token: appState.shareToken,
    });

    if (
      typeof result.version === "number" &&
      result.version > (appState.version ?? 0)
    ) {
      if (shouldAutoReloadRemoteUpdate(result.version)) {
        void loadSharedTrip(appState.shareToken, { backgroundSync: true });
        return;
      }

      setRemoteUpdateState(true, result.version);
      clearAutosaveTimer();
      updateShareUI();
    }
  } catch {
    // Polling failures should not interrupt the current editing session.
  }
}

async function createSharedTrip() {
  setSavingState(true);
  setSaveError("");
  updateShareUI();

  try {
    const result = await postShareRequest("create-trip", {
      title: getNormalizedTripTitle() || null,
      data: exportTripData(),
    });

    appState.tripId = result.tripId;
    appState.shareToken = result.editToken;
    appState.version = result.version;
    appState.lastSavedAt = result.updatedAt;
    appState.shareLinks.viewUrl = result.viewUrl;
    appState.shareLinks.editUrl = result.editUrl;
    setLoadError("");
    setRemoteUpdateState(false);
    clearDirty();
    clearAutosaveTimer();
    setAppMode("shared-edit", "edit");
    replaceUrlIfPossible(result.editUrl);
    updateUI();
    void broadcastTripUpdate(result.version, result.updatedAt);
    alert("สร้างลิงก์แชร์สำเร็จแล้ว");
  } catch (error) {
    setSaveError(getRequestErrorMessage(error, "create"));
    updateShareUI();
  } finally {
    setSavingState(false);
    updateShareUI();
  }
}

async function loadSharedTrip(token, options = {}) {
  const { notifyOnError = false, backgroundSync = false } = options;

  if (!backgroundSync) {
    setSavingState(true);
    setLoadError("");
    updateShareUI();
  }

  try {
    const result = await postShareRequest("load-trip", { token });

    importTripData(result.data);
    appState.tripId = result.tripId;
    appState.version = result.version;
    appState.lastSavedAt = result.updatedAt;
    appState.shareToken = token;
    appState.shareLinks.viewUrl =
      result.role === "view"
        ? window.location.href
        : appState.shareLinks.viewUrl;
    appState.shareLinks.editUrl =
      result.role === "edit"
        ? window.location.href
        : appState.shareLinks.editUrl;
    clearDirty();
    clearAutosaveTimer();
    setSaveError("");
    setLoadError("");
    setRemoteUpdateState(false);
    setAppMode(
      result.role === "edit" ? "shared-edit" : "shared-view",
      result.role,
    );
    updateUI();
    startTripSync();
  } catch (error) {
    const message = getRequestErrorMessage(error, "load");

    if (backgroundSync) {
      setRemoteUpdateState(true, appState.remoteVersion ?? null);
      clearAutosaveTimer();
      updateShareUI();
      return;
    }

    setLoadError(message);
    setSaveError("");
    setAppMode("shared-view", "view");
    updateUI();

    if (notifyOnError) {
      alert(message);
    }
  } finally {
    if (!backgroundSync) {
      setSavingState(false);
      updateShareUI();
    }
  }
}

async function saveSharedTrip({ manual }) {
  if (!appState.tripId || !appState.shareToken || !canEdit()) {
    return;
  }

  clearAutosaveTimer();
  setSavingState(true);
  setSaveError("");
  updateShareUI();

  try {
    const result = await postShareRequest("save-trip", {
      token: appState.shareToken,
      expectedVersion: appState.version,
      title: getNormalizedTripTitle() || null,
      data: exportTripData(),
    });

    appState.version = result.version;
    appState.lastSavedAt = result.updatedAt;
    clearDirty();
    setRemoteUpdateState(false);
    void broadcastTripUpdate(result.version, result.updatedAt);
  } catch (error) {
    if (error.code === "VERSION_CONFLICT") {
      setRemoteUpdateState(true, error.payload?.latestVersion ?? null);
      setSaveError("มีข้อมูลใหม่บนเซิร์ฟเวอร์");

      if (manual) {
        alert("มีข้อมูลใหม่บนเซิร์ฟเวอร์ โปรดกด Reload latest ก่อน");
      }

      return;
    }

    setSaveError(getRequestErrorMessage(error, "save"));

    if (manual) {
      alert(appState.saveError);
    }
  } finally {
    setSavingState(false);
    updateShareUI();
  }
}

function getRequestErrorMessage(error, phase) {
  if (error.code === "NETWORK_REQUEST_FAILED") {
    return "เชื่อมต่อ Edge Functions ไม่สำเร็จ";
  }

  if (error.status === 404 && error.code === "REQUEST_FAILED") {
    return "ยังไม่พบ Edge Function สำหรับแชร์ทริป";
  }

  if (phase === "load") {
    if (error.code === "LINK_NOT_FOUND") {
      return "ลิงก์นี้ไม่ถูกต้องหรือไม่พบข้อมูล";
    }

    if (error.code === "LINK_REVOKED" || error.code === "LINK_EXPIRED") {
      return "ลิงก์นี้ไม่สามารถใช้งานได้แล้ว";
    }

    if (
      error.code === "INVALID_TRIP_DATA" ||
      error.code === "UNSUPPORTED_TRIP_SCHEMA"
    ) {
      return "ข้อมูลทริปที่โหลดมาไม่ถูกต้อง";
    }
  }

  if (phase === "create") {
    return "สร้างลิงก์แชร์ไม่สำเร็จ";
  }

  return "บันทึกทริปไม่สำเร็จ";
}

function replaceUrlIfPossible(nextUrl) {
  try {
    const parsed = new URL(nextUrl, window.location.href);

    if (parsed.origin !== window.location.origin) {
      return false;
    }

    window.history.replaceState(
      {},
      "",
      `${parsed.pathname}${parsed.search}${parsed.hash}`,
    );
    return true;
  } catch {
    return false;
  }
}

document.addEventListener("DOMContentLoaded", initializeApp);
