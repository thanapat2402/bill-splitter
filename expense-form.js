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
      return roundCurrency(
        subExpenses.reduce((sum, item) => sum + item.amount, 0),
      );
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

    return {
      addExpense,
      selectAllPersons,
      deselectAllPersons,
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
