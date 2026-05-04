(function attachExpenseForm(global) {
  function createExpenseFormController(dependencies) {
    const { data, dom, helpers, actions } = dependencies;
    const { roundCurrency, formatAmount } = helpers;
    const {
      assertEditableOrAlert,
      canEdit,
      markDirty,
      updateUI,
      escapeAttribute,
    } = actions;
    const expenseSubmitButton = dom.expenseForm.querySelector(
      'button[type="submit"]',
    );
    let editingExpenseId = null;

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

      upsertExpense(expenseInput);
      resetExpenseForm();
      markDirty();
      updateUI();
    }

    function getExpenseInput() {
      const { subExpenses, hasIncompleteRows } = collectSubExpenses();
      const manualAmount = parseFloat(dom.expenseTotalInput.value);
      const splitAmong = subExpenses.length
        ? getUniqueSubExpenseSplitPersons(subExpenses)
        : getCheckedSplitPersons();

      return {
        name: dom.expenseNameInput.value.trim(),
        paidBy: dom.paidBySelect.value,
        splitAmong,
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
        return "กรุณากรอกชื่อ จำนวนเงิน และเลือกคนที่ต้องหารของรายการย่อยให้ครบ";
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

    function createExpense({
      id,
      name,
      amount,
      subExpenses,
      paidBy,
      splitAmong,
      date,
    }) {
      return {
        id: id ?? Date.now(),
        name,
        amount,
        subExpenses,
        paidBy,
        splitAmong,
        date: date ?? new Date().toLocaleDateString("th-TH"),
      };
    }

    function upsertExpense(expenseInput) {
      const existingExpense = getEditingExpense();
      const nextExpense = createExpense({
        ...expenseInput,
        id: existingExpense?.id,
        date: existingExpense?.date,
      });

      if (!existingExpense) {
        data.expenses.push(nextExpense);
        return;
      }

      data.expenses = data.expenses.map((expense) =>
        expense.id === existingExpense.id ? nextExpense : expense,
      );
    }

    function getEditingExpense() {
      if (editingExpenseId === null) {
        return null;
      }

      return (
        data.expenses.find((expense) => expense.id === editingExpenseId) ?? null
      );
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

      syncSubExpenseRowsFromMainSelection();
    }

    function setMainSplitSelection(selectedPersons) {
      const selectedPersonSet = new Set(selectedPersons);

      dom.splitPersonsDiv
        .querySelectorAll('input[type="checkbox"]')
        .forEach((checkbox) => {
          checkbox.checked = selectedPersonSet.has(checkbox.value);
        });
    }

    function setMainSplitControlsDisabled(isDisabled) {
      dom.selectAllBtn.disabled = isDisabled;
      dom.deselectAllBtn.disabled = isDisabled;

      dom.splitPersonsDiv
        .querySelectorAll('input[type="checkbox"]')
        .forEach((checkbox) => {
          checkbox.disabled = isDisabled;
        });
    }

    function handleSplitPersonsInput(event) {
      if (event.target.type !== "checkbox") {
        return;
      }

      syncSubExpenseRowsFromMainSelection();
    }

    function handleSubExpenseInput(event) {
      const row = event.target.closest(".sub-expense-row");

      if (
        event.target.classList.contains("sub-expense-name") ||
        event.target.classList.contains("sub-expense-amount") ||
        event.target.classList.contains("sub-expense-split-checkbox")
      ) {
        if (
          row &&
          event.target.classList.contains("sub-expense-split-checkbox")
        ) {
          updateSubExpenseRowSyncState(row);
        }

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
      dom.toggleSubExpensesBtn.querySelector(
        ".accordion-toggle-text",
      ).textContent = isVisible ? "ซ่อนรายการย่อย" : "เพิ่มรายการย่อย";

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

    function addSubExpenseRow(name = "", amount = "", splitAmong = null) {
      if (!canEdit()) {
        return;
      }

      const row = createSubExpenseRowElement(name, amount, splitAmong);
      dom.subExpensesContainer.appendChild(row);
      updateExpenseTotal();
    }

    function createSubExpenseRowElement(name, amount, splitAmong) {
      const selectedPersons = getInitialSubExpenseSplitAmong(splitAmong);
      const shouldSyncWithMain = shouldSyncSubExpenseWithMain(splitAmong);
      const row = document.createElement("div");
      row.className = "sub-expense-row";
      row.dataset.splitSyncMode = shouldSyncWithMain ? "synced" : "custom";
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
        <div class="sub-expense-split-group">
          <span class="sub-expense-split-label">ของใครบ้าง</span>
          <div class="sub-expense-split-list">
            ${createSubExpenseSplitOptionsMarkup(selectedPersons)}
          </div>
        </div>
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

    function createSubExpenseSplitOptionsMarkup(selectedPersons) {
      return data.persons
        .map((person) => {
          const isChecked = selectedPersons.includes(person) ? "checked" : "";

          return `
            <label class="sub-expense-split-option">
              <input
                type="checkbox"
                class="sub-expense-split-checkbox"
                value="${escapeAttribute(person)}"
                ${isChecked}
              />
              <span>${person}</span>
            </label>
          `;
        })
        .join("");
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

    function getInitialSubExpenseSplitAmong(splitAmong) {
      if (Array.isArray(splitAmong) && splitAmong.length > 0) {
        return splitAmong.filter((person) => data.persons.includes(person));
      }

      return getEffectiveMainSplitPersons();
    }

    function getEffectiveMainSplitPersons() {
      const checkedPersons = getCheckedSplitPersons();

      if (checkedPersons.length > 0) {
        return checkedPersons;
      }

      return [...data.persons];
    }

    function shouldSyncSubExpenseWithMain(splitAmong) {
      if (!Array.isArray(splitAmong) || splitAmong.length === 0) {
        return true;
      }

      return areSamePersonSelection(splitAmong, getEffectiveMainSplitPersons());
    }

    function getSubExpenseRowSelectedPersons(row) {
      return Array.from(
        row.querySelectorAll(".sub-expense-split-checkbox:checked"),
        (checkbox) => checkbox.value,
      );
    }

    function setSubExpenseRowSelectedPersons(row, selectedPersons) {
      const selectedPersonSet = new Set(selectedPersons);

      row
        .querySelectorAll(".sub-expense-split-checkbox")
        .forEach((checkbox) => {
          checkbox.checked = selectedPersonSet.has(checkbox.value);
        });
    }

    function areSamePersonSelection(left, right) {
      if (left.length !== right.length) {
        return false;
      }

      return left.every((person, index) => person === right[index]);
    }

    function updateSubExpenseRowSyncState(row) {
      const mainSelection = getEffectiveMainSplitPersons();
      const rowSelection = getSubExpenseRowSelectedPersons(row);

      row.dataset.splitSyncMode = areSamePersonSelection(
        rowSelection,
        mainSelection,
      )
        ? "synced"
        : "custom";
    }

    function syncSubExpenseRowsFromMainSelection() {
      const mainSelection = getEffectiveMainSplitPersons();

      getSubExpenseRows().forEach((row) => {
        if (row.dataset.splitSyncMode !== "synced") {
          return;
        }

        setSubExpenseRowSelectedPersons(row, mainSelection);
      });

      updateExpenseTotal();
    }

    function getUniqueSubExpenseSplitPersons(subExpenses) {
      return [...new Set(subExpenses.flatMap((item) => item.splitAmong))];
    }

    function collectSubExpenses() {
      const subExpenses = [];
      let hasIncompleteRows = false;

      getSubExpenseRows().forEach((row) => {
        const name = row.querySelector(".sub-expense-name").value.trim();
        const rawAmount = row.querySelector(".sub-expense-amount").value.trim();
        const parsedAmount = parseFloat(rawAmount);
        const splitAmong = getSubExpenseRowSelectedPersons(row);

        if (!name && !rawAmount) {
          return;
        }

        if (
          !name ||
          !rawAmount ||
          Number.isNaN(parsedAmount) ||
          parsedAmount <= 0 ||
          splitAmong.length === 0
        ) {
          hasIncompleteRows = true;
          return;
        }

        subExpenses.push({
          name,
          amount: roundCurrency(parsedAmount),
          splitAmong,
        });
      });

      return { subExpenses, hasIncompleteRows };
    }

    function calculateSubExpenseTotal(subExpenses) {
      return roundCurrency(
        subExpenses.reduce((sum, item) => sum + item.amount, 0),
      );
    }

    function updateExpenseTotal() {
      const { subExpenses } = collectSubExpenses();

      if (subExpenses.length > 0) {
        const total = calculateSubExpenseTotal(subExpenses);
        const splitAmong = getUniqueSubExpenseSplitPersons(subExpenses);

        setMainSplitSelection(splitAmong);
        setMainSplitControlsDisabled(true);
        dom.expenseTotalInput.value = total > 0 ? total.toFixed(2) : "";
        dom.expenseTotalInput.readOnly = true;
        updateSubExpenseSummary(subExpenses, total);
        return;
      }

      setMainSplitControlsDisabled(false);

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

    function startExpenseEdit(expenseId) {
      if (!assertEditableOrAlert()) {
        return false;
      }

      const expense = data.expenses.find((item) => item.id === expenseId);

      if (!expense) {
        return false;
      }

      editingExpenseId = expense.id;
      applyExpenseFormMode(true);
      fillExpenseForm(expense);
      return true;
    }

    function fillExpenseForm(expense) {
      dom.expenseNameInput.value = expense.name;
      dom.paidBySelect.value = expense.paidBy;
      setMainSplitSelection(expense.splitAmong);

      clearSubExpenses();

      if (expense.subExpenses.length > 0) {
        setSubExpensesPanelVisibility(true);
        clearSubExpenses();
        expense.subExpenses.forEach((subExpense) => {
          addSubExpenseRow(
            subExpense.name,
            subExpense.amount,
            subExpense.splitAmong,
          );
        });
      } else {
        setSubExpensesPanelVisibility(false);
        dom.expenseTotalInput.value = expense.amount.toFixed(2);
      }

      if (expense.subExpenses.length === 0) {
        setMainSplitControlsDisabled(false);
      }

      updateExpenseTotal();
    }

    function applyExpenseFormMode(isEditing) {
      dom.expenseModalTitle.textContent = isEditing
        ? "แก้ไขรายการ"
        : "เพิ่มรายการใหม่";
      dom.addExpenseDescription.textContent = isEditing
        ? "แก้ไขชื่อรายการ จำนวนเงิน และคนที่ต้องหารได้จากฟอร์มนี้"
        : "กรอกชื่อรายการ จำนวนเงิน และเลือกคนที่ต้องหาร ระบบจะคำนวณสรุปให้ทันที";
      expenseSubmitButton.textContent = isEditing
        ? "บันทึกการแก้ไข"
        : "เพิ่มรายการ";
    }

    function resetExpenseForm() {
      editingExpenseId = null;
      applyExpenseFormMode(false);
      dom.expenseForm.reset();
      dom.expenseTotalInput.readOnly = false;
      setMainSplitControlsDisabled(false);
      clearSubExpenses();
      hideSubExpensesPanel();
      updateSubExpenseSummary();
    }

    return {
      addExpense,
      selectAllPersons,
      deselectAllPersons,
      startExpenseEdit,
      handleSplitPersonsInput,
      handleSubExpenseInput,
      handleSubExpenseAction,
      toggleSubExpensesPanel,
      addSubExpenseRow,
      clearSubExpensesAndKeepPanel,
      resetExpenseForm,
    };
  }

  global.ExpenseForm = {
    createExpenseFormController,
  };
})(window);
