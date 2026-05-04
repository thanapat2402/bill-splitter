(function attachTripLogic(global) {
  function roundCurrency(amount) {
    return Math.round(amount * 100) / 100;
  }

  function formatAmount(amount) {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  function getSubExpenseSplitAmong(expense, subExpense) {
    if (
      Array.isArray(subExpense.splitAmong) &&
      subExpense.splitAmong.length > 0
    ) {
      return subExpense.splitAmong;
    }

    return expense.splitAmong;
  }

  function getExpenseSegments(expense) {
    if (
      !Array.isArray(expense.subExpenses) ||
      expense.subExpenses.length === 0
    ) {
      return [
        {
          name: expense.name,
          amount: expense.amount,
          splitAmong: expense.splitAmong,
        },
      ];
    }

    return expense.subExpenses.map((subExpense) => ({
      name: subExpense.name,
      amount: subExpense.amount,
      splitAmong: getSubExpenseSplitAmong(expense, subExpense),
    }));
  }

  function calculateSummary(data) {
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

      getExpenseSegments(expense).forEach((segment) => {
        const amountPerPerson = segment.amount / segment.splitAmong.length;

        segment.splitAmong.forEach((person) => {
          summary[person].owed += amountPerPerson;
        });
      });
    });

    Object.values(summary).forEach((stats) => {
      stats.balance = stats.paid - stats.owed;
    });

    return summary;
  }

  function getPersonDetails(data, person) {
    return data.expenses.reduce(
      (details, expense) => {
        if (expense.paidBy === person) {
          details.paid.push({
            name: expense.name,
            amount: expense.amount,
            count: expense.splitAmong.length,
          });
        }

        getExpenseSegments(expense).forEach((segment) => {
          if (!segment.splitAmong.includes(person)) {
            return;
          }

          const segmentName =
            segment.name === expense.name
              ? expense.name
              : `${expense.name} - ${segment.name}`;

          details.owed.push({
            name: segmentName,
            amount: segment.amount / segment.splitAmong.length,
          });
        });

        return details;
      },
      { paid: [], owed: [] },
    );
  }

  function getBalanceMeta(balance) {
    if (balance > 0.01) {
      return {
        label: "รับคืนสุทธิ",
        kickerClass: "summary-balance-kicker-positive",
      };
    }

    if (balance < -0.01) {
      return {
        label: "ต้องโอนสุทธิ",
        kickerClass: "summary-balance-kicker-negative",
      };
    }

    return {
      label: "สมดุลแล้ว",
      kickerClass: "summary-balance-kicker-neutral",
    };
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

  function calculateSettlement(data) {
    const summary = calculateSummary(data);
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

  function exportTripData(data, getNormalizedTripTitle, tripSchemaVersion) {
    const normalizedTripTitle = getNormalizedTripTitle();

    return {
      schemaVersion: tripSchemaVersion,
      ...(normalizedTripTitle ? { title: normalizedTripTitle } : {}),
      persons: [...data.persons],
      expenses: data.expenses.map((expense) => ({
        id: expense.id,
        name: expense.name,
        amount: roundCurrency(expense.amount),
        subExpenses: (expense.subExpenses || []).map((item) => ({
          name: item.name,
          amount: roundCurrency(item.amount),
          splitAmong: [...getSubExpenseSplitAmong(expense, item)],
        })),
        paidBy: expense.paidBy,
        splitAmong: [...expense.splitAmong],
        date: expense.date,
      })),
    };
  }

  function validateTripDataShape(rawData, tripSchemaVersion) {
    if (!rawData || typeof rawData !== "object") {
      throw new Error("INVALID_TRIP_DATA");
    }

    if (rawData.schemaVersion !== tripSchemaVersion) {
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

      if (
        !Array.isArray(expense.splitAmong) ||
        expense.splitAmong.length === 0
      ) {
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
        subExpenses.reduce((sum, item) => {
          if (!item || typeof item !== "object") {
            throw new Error("INVALID_TRIP_DATA");
          }

          if (
            item.splitAmong !== undefined &&
            (!Array.isArray(item.splitAmong) || item.splitAmong.length === 0)
          ) {
            throw new Error("INVALID_TRIP_DATA");
          }

          if (Array.isArray(item.splitAmong)) {
            item.splitAmong.forEach((person) => {
              if (!validPersons.has(person)) {
                throw new Error("INVALID_TRIP_DATA");
              }
            });
          }

          return sum + Number(item.amount || 0);
        }, 0),
      );

      if (
        subExpenses.length > 0 &&
        subExpenseTotal !== roundCurrency(Number(expense.amount))
      ) {
        throw new Error("INVALID_TRIP_DATA");
      }
    });
  }

  function normalizeTripData(rawData, tripSchemaVersion) {
    return {
      schemaVersion: tripSchemaVersion,
      title: typeof rawData.title === "string" ? rawData.title.trim() : "",
      persons: rawData.persons
        .map((person) => String(person).trim())
        .filter(Boolean),
      expenses: rawData.expenses.map((expense) => ({
        ...normalizeExpense(expense),
      })),
    };
  }

  function normalizeExpense(expense) {
    const splitAmong = expense.splitAmong.map((person) => String(person));

    return {
      id: Number(expense.id),
      name: String(expense.name).trim(),
      amount: roundCurrency(Number(expense.amount)),
      subExpenses: Array.isArray(expense.subExpenses)
        ? expense.subExpenses.map((item) => ({
            name: String(item.name).trim(),
            amount: roundCurrency(Number(item.amount)),
            splitAmong:
              Array.isArray(item.splitAmong) && item.splitAmong.length > 0
                ? item.splitAmong.map((person) => String(person))
                : [...splitAmong],
          }))
        : [],
      paidBy: String(expense.paidBy),
      splitAmong,
      date: String(expense.date),
    };
  }

  function applyTripSnapshot(data, snapshot) {
    data.title = snapshot.title;
    data.persons = [...snapshot.persons];
    data.expenses = snapshot.expenses.map((expense) => ({
      ...expense,
      subExpenses: expense.subExpenses.map((item) => ({
        ...item,
        splitAmong: Array.isArray(item.splitAmong) ? [...item.splitAmong] : [],
      })),
      splitAmong: [...expense.splitAmong],
    }));
  }

  function importTripData(data, rawData, tripSchemaVersion) {
    validateTripDataShape(rawData, tripSchemaVersion);
    applyTripSnapshot(data, normalizeTripData(rawData, tripSchemaVersion));
  }

  global.TripLogic = {
    roundCurrency,
    formatAmount,
    calculateSummary,
    getPersonDetails,
    getBalanceMeta,
    getBalanceClass,
    calculateSettlement,
    exportTripData,
    importTripData,
    validateTripDataShape,
    normalizeTripData,
    applyTripSnapshot,
  };
})(window);
