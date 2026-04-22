(function attachTripUi(global) {
  function createTripUiController(dependencies) {
    const {
      data,
      appState,
      dom,
      constants,
      helpers,
      actions,
      setHeaderShareMenuOpen,
    } = dependencies;

    const {
      roundCurrency,
      formatAmount,
      calculateSummary,
      getPersonDetails,
      getBalanceMeta,
      getBalanceClass,
      calculateSettlement,
    } = helpers;

    const { getTripTitle, getNormalizedTripTitle, escapeQuotes } = actions;

    function canEdit() {
      return appState.mode === "local" || appState.mode === "shared-edit";
    }

    function isSharedMode() {
      return appState.mode === "shared-view" || appState.mode === "shared-edit";
    }

    function updateUI() {
      updateHeaderUI();
      updateOverviewUI();
      updateExpensesSectionUI();
      updatePersonsList();
      updateCheckboxes();
      updatePaidBySelect();
      updateExpensesList();
      updateSummary();
      updateSettlement();
      applyReadOnlyUI(!canEdit());
      updateJourneyUI();
      updateActionsUI();
      updateShareUI();
    }

    function updateExpensesSectionUI() {
      const expenseCount = data.expenses.length;
      const totalAmount = roundCurrency(
        data.expenses.reduce((sum, expense) => sum + expense.amount, 0),
      );

      dom.expensesCountMeta.textContent =
        expenseCount === 0 ? "ยังไม่มีรายการ" : `${expenseCount} รายการ`;
      dom.expensesTotalMeta.textContent = `${formatAmount(totalAmount)} บาท`;
      dom.expensesDescription.textContent =
        expenseCount === 0
          ? "เมื่อเริ่มลงบิล รายการทั้งหมดจะมารวมที่นี่เพื่อให้ตรวจและลบได้ง่าย"
          : "ดูรายการล่าสุดทั้งหมด และลบรายการที่ไม่ต้องการได้จากตรงนี้";
    }

    function updateJourneyUI() {
      const hasPersons = data.persons.length > 0;
      const canCommitExpense = canEdit() && hasPersons;

      document.body.classList.toggle("is-onboarding", !hasPersons);
      dom.firstStepGuide.classList.toggle("is-hidden", hasPersons);
      dom.addExpenseSection.classList.toggle("section-locked", !hasPersons);
      dom.addPersonSection.classList.toggle("section-priority", !hasPersons);
      dom.addExpenseDescription.textContent = hasPersons
        ? "กรอกชื่อรายการ จำนวนเงิน และเลือกคนที่ต้องหาร ระบบจะคำนวณสรุปให้ทันที"
        : "เริ่มจากเพิ่มสมาชิกก่อน แล้วฟอร์มเพิ่มรายการจะพร้อมใช้งานทันที";
      dom.addPersonDescription.textContent = hasPersons
        ? "เพิ่มสมาชิกก่อนเริ่มลงบิล เพื่อให้เลือกคนจ่ายและคนที่ต้องหารได้สะดวก"
        : "นี่คือขั้นแรกของทริปนี้ ใส่ชื่อสมาชิกให้ครบก่อนค่อยลงบิล";

      setExpenseFormEnabled(canCommitExpense);
    }

    function setExpenseFormEnabled(isEnabled) {
      dom.expenseNameInput.disabled = !isEnabled;
      dom.expenseTotalInput.disabled = !isEnabled;
      dom.paidBySelect.disabled = !isEnabled;
      dom.selectAllBtn.disabled = !isEnabled;
      dom.deselectAllBtn.disabled = !isEnabled;
      dom.toggleSubExpensesBtn.disabled = !isEnabled;
      dom.addSubExpenseBtn.disabled = !isEnabled;
      dom.clearSubExpensesBtn.disabled = !isEnabled;
      dom.expenseForm.querySelector('button[type="submit"]').disabled =
        !isEnabled;

      dom.splitPersonsDiv
        .querySelectorAll('input[type="checkbox"]')
        .forEach((checkbox) => {
          checkbox.disabled = !isEnabled;
        });

      dom.subExpensesContainer
        .querySelectorAll("input, button")
        .forEach((element) => {
          element.disabled = !isEnabled;
        });
    }

    function updateActionsUI() {
      const isSharedTrip = isSharedMode() || Boolean(appState.shareToken);
      const canLoadDemoPreset = appState.mode === "local" && !appState.isSaving;

      dom.newTripBtn.disabled = appState.isSaving;
      dom.newTripBtn.textContent = isSharedTrip
        ? "เริ่มทริปของฉัน"
        : "ทริปใหม่";
      dom.newTripBtn.title = isSharedTrip
        ? "แยกออกจากลิงก์ปัจจุบันแล้วเริ่มทริปใหม่ของคุณเองในเครื่อง"
        : "เริ่มทริปว่างใหม่ในเครื่อง";
      dom.newTripGroupLabel.textContent = isSharedTrip
        ? "ทริปของฉัน"
        : "เริ่มใหม่";
      dom.newTripHelperText.textContent = isSharedTrip
        ? "ออกจากลิงก์เดิมแล้วเริ่มทริปของคุณเองได้ทันที โดยไม่แตะข้อมูลต้นฉบับ"
        : "เริ่มทริปว่างใหม่ได้ทันที";
      dom.actionsDescription.textContent = isSharedTrip
        ? "ถ้าอยากแยกจากลิงก์นี้ไปทำของตัวเองต่อ เริ่มทริปใหม่ได้จากที่นี่"
        : "เริ่มทริปใหม่อย่างเร็ว หรือโหลดเดโมไว้ลอง flow";

      dom.loadDemoPresetBtn.disabled = !canLoadDemoPreset;
      dom.loadDemoPresetGuideBtn.disabled = !canLoadDemoPreset;
      dom.loadDemoPresetBtn.title = canLoadDemoPreset
        ? "โหลดชุดข้อมูลเดโมตัวอย่างเพื่อทดสอบหน้าจอทันที"
        : "โหลดเดโมได้เฉพาะโหมดในเครื่อง";
      dom.loadDemoPresetGuideBtn.title = dom.loadDemoPresetBtn.title;
    }

    function updateHeaderUI() {
      const tripTitle = getTripTitle();
      const normalizedTripTitle =
        getNormalizedTripTitle() || constants.DEFAULT_TRIP_TITLE;
      dom.tripTitleInput.value = tripTitle;
      document.title = `${normalizedTripTitle} - ${constants.PROJECT_NAME}`;
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
        return "ซิงก์อัตโนมัติ";
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
      dom.paidBySelect.innerHTML =
        '<option value="">-- เลือกผู้จ่าย --</option>';

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
        <div class="expense-name-row">
          <div class="expense-name">${expense.name}</div>
          <button type="button" class="btn btn-remove" onclick="removeExpense(${expense.id})">ลบ</button>
        </div>
        <div class="expense-meta-row">
          <span class="expense-meta-pill">💸 ${expense.paidBy} จ่าย</span>
          <span class="expense-meta-pill">📅 ${expense.date}</span>
        </div>
                <div class="sub-expense-list">${createSubExpenseListMarkup(expense.subExpenses)}</div>
            </div>
            <div class="expense-amount">
        <div class="expense-total-pill">${formatAmount(expense.amount)} บาท</div>
        <div class="split-info">หาร ${splitCount} คน • ${formatAmount(amountPerPerson)} บาท/คน</div>
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

    function updateSummary() {
      const summary = calculateSummary(data);
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
          getPersonDetails(data, person),
        );
        dom.summaryContent.appendChild(card);
      });
    }

    function createSummaryCardMarkup(person, stats, details) {
      const balanceMeta = getBalanceMeta(stats.balance);

      return `
      <div class="summary-card-header">
        <div class="summary-person-name">${person}</div>
      </div>
      <div class="summary-balance-row">
        <div class="summary-balance-kicker ${balanceMeta.kickerClass}">${balanceMeta.label}</div>
        <div class="summary-value ${getBalanceClass(stats.balance)}">
          ${formatAmount(Math.abs(stats.balance))}
        </div>
        <div class="summary-label">สุทธิหลังหักทุกบิล</div>
      </div>
            <hr class="summary-divider">
      <div class="summary-card-body">
            ${buildDetailSectionMarkup("💵 จ่ายแล้ว", stats.paid, details.paid, (item) => `${item.name}: ${formatAmount(item.amount)} บาท (แบ่ง ${item.count} คน)`, "paid")}
            ${buildDetailSectionMarkup("💸 ต้องจ่าย", stats.owed, details.owed, (item) => `${item.name}: ${formatAmount(item.amount)} บาท`, "owed")}
      </div>
        `;
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
        .map(
          (item) => `<div class="summary-detail-item">${formatter(item)}</div>`,
        )
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

    function updateSettlement() {
      const settlements = calculateSettlement(data);
      dom.settlementContent.innerHTML = "";

      if (settlements.length === 0) {
        dom.noSettlementMsg.style.display = "block";
        return;
      }

      dom.noSettlementMsg.style.display = "none";
      settlements.forEach((settlement, index) => {
        const item = document.createElement("div");
        item.className = "settlement-item";
        item.innerHTML = `
            <div class="settlement-order">${index + 1}</div>
            <div class="settlement-main">
            <div class="settlement-text">
                <span class="settlement-from">${settlement.from}</span>
                <span class="settlement-arrow">→</span>
                <span class="settlement-to">${settlement.to}</span>
            </div>
            </div>
            <div class="settlement-amount">${formatAmount(settlement.amount)} บาท</div>
        `;
        dom.settlementContent.appendChild(item);
      });
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

      dom.personForm.querySelector('button[type="submit"]').disabled =
        isReadOnly;
      dom.expenseForm.querySelector('button[type="submit"]').disabled =
        isReadOnly;

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

      const isLocalMode = appState.mode === "local";
      const isSharedEditMode = appState.mode === "shared-edit";
      const isSharedViewMode = appState.mode === "shared-view";
      const canCreateLinks = (isLocalMode || isSharedEditMode) && canEdit();

      dom.shareTripBtn.classList.toggle("is-hidden", !isSharedEditMode);
      dom.copyViewLinkBtn.classList.toggle("is-hidden", false);
      dom.copyEditLinkBtn.classList.toggle("is-hidden", isSharedViewMode);
      dom.shareTripBtn.disabled = !isSharedEditMode || appState.isSaving;
      dom.copyViewLinkBtn.disabled =
        appState.isSaving || (!canCreateLinks && !appState.shareLinks.viewUrl);
      dom.copyEditLinkBtn.disabled =
        appState.isSaving || isSharedViewMode || !canCreateLinks;
      dom.shareDescription.textContent = getShareSectionDescription();
      dom.shareTripBtn.textContent = getShareButtonLabel();
      dom.shareHint.textContent = getShareHintText();
      dom.shareTripBtn.title = getSharePrimaryActionTitle();
      dom.copyViewLinkBtn.title = isLocalMode
        ? "สร้างลิงก์ดูอย่างเดียวและคัดลอกทันที"
        : "คัดลอกลิงก์สำหรับส่งให้คนที่ดูได้อย่างเดียว";
      dom.copyEditLinkBtn.title = isSharedViewMode
        ? "ลิงก์นี้เป็นโหมดดูอย่างเดียว"
        : isLocalMode
          ? "สร้างลิงก์แก้ไขและคัดลอกทันที"
          : "คัดลอกลิงก์สำหรับคนที่ต้องช่วยแก้ไขทริป";
      dom.headerShareMenuBtn.disabled = appState.isSaving;
      dom.headerShareMenuBtn.title = getHeaderShareButtonTitle();
      dom.headerShareEditBtn.disabled = appState.isSaving || !canCreateLinks;
      dom.headerShareViewBtn.disabled =
        appState.isSaving || (!canCreateLinks && !appState.shareLinks.viewUrl);
      dom.headerShareEditBtn.title = isSharedViewMode
        ? "ลิงก์นี้เป็นโหมดดูอย่างเดียว จึงคัดลอกลิงก์แก้ไขไม่ได้"
        : isLocalMode
          ? "สร้างลิงก์แก้ไขและคัดลอกทันที"
          : "คัดลอกลิงก์แก้ไขปัจจุบัน";
      dom.headerShareViewBtn.title = isLocalMode
        ? "สร้างลิงก์ดูอย่างเดียวและคัดลอกทันที"
        : "คัดลอกลิงก์ดูอย่างเดียวปัจจุบัน";

      if (appState.isSaving) {
        setHeaderShareMenuOpen(false);
      }
    }

    function getShareButtonLabel() {
      if (appState.mode === "shared-edit") {
        return "บันทึกตอนนี้";
      }

      return "บันทึกตอนนี้";
    }

    function getShareHintText() {
      if (appState.loadError) {
        return "ลิงก์นี้โหลดไม่สำเร็จ ตรวจสอบว่า Edge Function ถูก deploy และลิงก์ยังใช้งานได้";
      }

      if (appState.hasRemoteUpdate && canEdit()) {
        return "มี snapshot ใหม่บนเซิร์ฟเวอร์ โปรดโหลดเวอร์ชันล่าสุดก่อนแก้ไขต่อ";
      }

      if (appState.mode === "local") {
        return "เลือกลิงก์ที่ต้องการ แล้วระบบจะสร้างและคัดลอกให้ทันที";
      }

      if (appState.mode === "shared-view") {
        return "ลิงก์นี้ดูได้อย่างเดียว แต่ยังคัดลอกส่งต่อได้";
      }

      return "ทริปนี้ซิงก์อัตโนมัติ และคัดลอกลิงก์ส่งต่อได้ตลอด";
    }

    function getShareSectionDescription() {
      if (appState.mode === "local") {
        return "เลือกชนิดลิงก์ แล้วคัดลอกได้ทันที";
      }

      if (appState.mode === "shared-view") {
        return "คุณกำลังเปิดผ่านลิงก์ดูอย่างเดียว";
      }

      return "ทริปนี้ซิงก์อัตโนมัติ และพร้อมส่งต่อ";
    }

    function getSharePrimaryActionTitle() {
      return "บันทึก snapshot ล่าสุดขึ้นเซิร์ฟเวอร์ทันที";
    }

    function getHeaderShareButtonTitle() {
      if (appState.isSaving) {
        return "กำลังสร้างหรือซิงก์ลิงก์แชร์";
      }

      if (appState.mode === "local") {
        return "เลือกลิงก์ที่ต้องการคัดลอก ระบบจะสร้าง shared trip ให้ทันที";
      }

      if (appState.mode === "shared-view") {
        return "คัดลอกลิงก์ดูอย่างเดียวจากเมนูนี้ได้";
      }

      return "เลือกลิงก์แก้ไขหรือลิงก์ดูอย่างเดียวเพื่อคัดลอกได้ทันที";
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

      dom.tripModeBadge.textContent = "ซิงก์อัตโนมัติ";
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

      if (appState.hasRemoteUpdate) {
        dom.saveStatusText.textContent = "มีข้อมูลใหม่บนเซิร์ฟเวอร์";
        dom.saveStatusText.className = "save-status save-status-warning";
        return;
      }

      if (appState.isSaving) {
        dom.saveStatusText.textContent = "กำลังซิงก์...";
        dom.saveStatusText.className = "save-status save-status-saving";
        return;
      }

      if (appState.lastSavedAt) {
        dom.saveStatusText.textContent = `ซิงก์ล่าสุด ${formatSavedAt(appState.lastSavedAt)}`;
        dom.saveStatusText.className = "save-status save-status-success";
        return;
      }

      dom.saveStatusText.textContent =
        appState.mode === "local" ? "ยังเป็นทริปในเครื่อง" : "พร้อมซิงก์";
      dom.saveStatusText.className = "save-status";
    }

    function formatSavedAt(value) {
      const parsedDate = new Date(value);

      if (Number.isNaN(parsedDate.getTime())) {
        return value;
      }

      return parsedDate.toLocaleString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
        day: "numeric",
        month: "short",
      });
    }

    function updateShareErrorState() {
      const hasError = Boolean(appState.loadError || appState.saveError);
      dom.shareErrorState.classList.toggle("is-hidden", !hasError);
      dom.shareErrorState.textContent =
        appState.loadError || appState.saveError;
    }

    function updateRemoteUpdateNotice() {
      dom.remoteUpdateNotice.classList.toggle(
        "is-hidden",
        !appState.hasRemoteUpdate,
      );
    }

    return {
      updateUI,
      updateHeaderUI,
      updateShareUI,
    };
  }

  global.TripUI = {
    createTripUiController,
  };
})(window);
