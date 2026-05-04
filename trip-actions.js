(function attachTripActions(global) {
  function createTripActionsController(dependencies) {
    const { data, appState, dom, constants, actions } = dependencies;
    const { DEFAULT_TRIP_TITLE, DEMO_TRIP_PRESET } = constants;
    const {
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
    } = actions;

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

        const nextSplitAmong = expense.splitAmong.filter(
          (person) => person !== name,
        );

        if (
          Array.isArray(expense.subExpenses) &&
          expense.subExpenses.length > 0
        ) {
          const nextSubExpenses = expense.subExpenses
            .map((subExpense) => {
              const sourceSplitAmong =
                Array.isArray(subExpense.splitAmong) &&
                subExpense.splitAmong.length > 0
                  ? subExpense.splitAmong
                  : nextSplitAmong;

              return {
                ...subExpense,
                splitAmong: sourceSplitAmong.filter(
                  (person) => person !== name,
                ),
              };
            })
            .filter((subExpense) => subExpense.splitAmong.length > 0);

          if (nextSubExpenses.length === 0) {
            return false;
          }

          expense.subExpenses = nextSubExpenses;
          expense.splitAmong = [
            ...new Set(
              nextSubExpenses.flatMap((subExpense) => subExpense.splitAmong),
            ),
          ];
          expense.amount = roundExpenseAmount(nextSubExpenses);
          return expense.splitAmong.length > 0 && expense.amount > 0;
        }

        expense.splitAmong = nextSplitAmong;
        return expense.splitAmong.length > 0;
      });

      markDirty();
      updateUI();
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

      clearTripData();
      clearTransientForms();
      markDirty();
      updateUI();
    }

    function handleNewTripClick() {
      const isSharedTrip = isSharedMode() || Boolean(appState.shareToken);
      const hasContent = hasAnyTripContent();

      if (isSharedTrip) {
        const shouldCreateNewTrip = confirm(
          "ต้องการแยกออกจากลิงก์ปัจจุบันแล้วเริ่มทริปใหม่ของคุณเองหรือไม่? ข้อมูลในลิงก์เดิมจะไม่ถูกลบ",
        );

        if (!shouldCreateNewTrip) {
          return;
        }
      } else if (hasContent) {
        const shouldCreateNewTrip = confirm(
          "ต้องการสร้างทริปใหม่หรือไม่? ระบบจะเริ่มทริปว่างใหม่แทนข้อมูลปัจจุบัน",
        );

        if (!shouldCreateNewTrip) {
          return;
        }
      }

      clearAutosaveTimer();
      clearTripData();
      clearTransientForms();
      clearDirty();
      setSaveError("");
      setLoadError("");
      setSavingState(false);
      setRemoteUpdateState(false);
      appState.tripId = null;
      appState.shareToken = "";
      appState.role = "edit";
      appState.version = null;
      appState.lastSavedAt = "";
      appState.shareLinks.viewUrl = "";
      appState.shareLinks.editUrl = "";
      setAppMode("local", "edit");

      replaceUrlIfPossible(window.location.pathname);
      updateUI();
    }

    function handleLoadDemoPresetClick() {
      if (appState.mode !== "local") {
        alert("โหลดเดโมได้เฉพาะโหมดในเครื่องเท่านั้น");
        return;
      }

      if (!assertEditableOrAlert()) {
        return;
      }

      if (hasAnyTripContent()) {
        const shouldReplace = confirm(
          "ต้องการแทนข้อมูลปัจจุบันด้วยชุดเดโมตัวอย่างหรือไม่?",
        );

        if (!shouldReplace) {
          return;
        }
      }

      importTripData(DEMO_TRIP_PRESET);
      clearTransientForms();
      clearDirty();
      setSaveError("");
      setLoadError("");
      setRemoteUpdateState(false);
      appState.lastSavedAt = "";
      updateUI();
    }

    function hasAnyTripContent() {
      return (
        data.persons.length > 0 ||
        data.expenses.length > 0 ||
        getNormalizedTripTitle() !== DEFAULT_TRIP_TITLE
      );
    }

    function clearTripData() {
      data.title = DEFAULT_TRIP_TITLE;
      data.persons = [];
      data.expenses = [];
    }

    function clearTransientForms() {
      dom.personForm.reset();
      resetExpenseForm();
    }

    function roundExpenseAmount(subExpenses) {
      return (
        Math.round(
          subExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0) *
            100,
        ) / 100
      );
    }

    return {
      addPerson,
      removePerson,
      removeExpense,
      resetAll,
      handleNewTripClick,
      handleLoadDemoPresetClick,
      clearTransientForms,
      hasAnyTripContent,
    };
  }

  global.TripActions = {
    createTripActionsController,
  };
})(window);
