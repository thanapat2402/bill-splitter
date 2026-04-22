(function attachAppShell(global) {
  function createAppShellController(dependencies) {
    const { data, appState, dom, constants, actions } = dependencies;
    const {
      DEFAULT_TRIP_TITLE,
      SHORTCUT_SCROLL_DURATION_MS,
      SUMMARY_DETAIL_ANIMATION_FALLBACK_MS,
    } = constants;
    const {
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
    } = actions;

    function bindEvents() {
      dom.focusAddPersonBtn.addEventListener(
        "click",
        handleFocusAddPersonClick,
      );
      dom.personForm.addEventListener("submit", addPerson);
      dom.expenseForm.addEventListener("submit", addExpense);
      dom.tripTitleInput.addEventListener("input", handleTripTitleInput);
      dom.tripTitleInput.addEventListener("blur", normalizeTripTitleInput);
      dom.shortcutLinks.forEach((link) => {
        link.addEventListener("click", handleShortcutClick);
      });
      dom.headerShareMenuBtn.addEventListener("click", toggleHeaderShareMenu);
      dom.headerShareEditBtn.addEventListener("click", () => {
        void handleShareLinkAction("edit", { closeMenu: true });
      });
      dom.headerShareViewBtn.addEventListener("click", () => {
        void handleShareLinkAction("view", { closeMenu: true });
      });
      document.addEventListener("click", handleDocumentClick);
      document.addEventListener("keydown", handleDocumentKeydown);
      dom.loadDemoPresetGuideBtn.addEventListener(
        "click",
        handleLoadDemoPresetClick,
      );
      dom.newTripBtn.addEventListener("click", handleNewTripClick);
      dom.loadDemoPresetBtn.addEventListener(
        "click",
        handleLoadDemoPresetClick,
      );
      dom.resetBtn.addEventListener("click", resetAll);
      dom.selectAllBtn.addEventListener("click", selectAllPersons);
      dom.deselectAllBtn.addEventListener("click", deselectAllPersons);
      dom.toggleSubExpensesBtn.addEventListener(
        "click",
        toggleSubExpensesPanel,
      );
      dom.addSubExpenseBtn.addEventListener("click", () => addSubExpenseRow());
      dom.clearSubExpensesBtn.addEventListener(
        "click",
        clearSubExpensesAndKeepPanel,
      );
      dom.subExpensesContainer.addEventListener("input", handleSubExpenseInput);
      dom.subExpensesContainer.addEventListener(
        "click",
        handleSubExpenseAction,
      );
      dom.summaryContent.addEventListener("click", handleSummaryDetailToggle);
      dom.shareTripBtn.addEventListener("click", handleShareTripClick);
      dom.copyViewLinkBtn.addEventListener("click", () => {
        void handleShareLinkAction("view");
      });
      dom.copyEditLinkBtn.addEventListener("click", () => {
        void handleShareLinkAction("edit");
      });
      dom.reloadLatestBtn.addEventListener("click", handleReloadLatestClick);
    }

    function toggleHeaderShareMenu() {
      if (dom.headerShareMenuBtn.disabled) {
        return;
      }

      setHeaderShareMenuOpen(!appState.isHeaderShareMenuOpen);
    }

    function setHeaderShareMenuOpen(isOpen) {
      appState.isHeaderShareMenuOpen = isOpen;
      dom.headerShareMenuBtn.setAttribute("aria-expanded", String(isOpen));
      dom.headerShareMenu.classList.toggle("is-hidden", !isOpen);
    }

    function handleDocumentClick(event) {
      if (
        !appState.isHeaderShareMenuOpen ||
        dom.headerShareMenu.contains(event.target) ||
        dom.headerShareMenuBtn.contains(event.target)
      ) {
        return;
      }

      setHeaderShareMenuOpen(false);
    }

    function handleDocumentKeydown(event) {
      if (event.key !== "Escape" || !appState.isHeaderShareMenuOpen) {
        return;
      }

      setHeaderShareMenuOpen(false);
      dom.headerShareMenuBtn.focus();
    }

    function handleFocusAddPersonClick() {
      const addPersonHeading = document.getElementById("addPersonHeading");

      if (!addPersonHeading) {
        return;
      }

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        addPersonHeading.scrollIntoView();
        dom.personNameInput.focus();
        return;
      }

      smoothScrollToElement(
        addPersonHeading,
        SHORTCUT_SCROLL_DURATION_MS / 1.8,
      );
      window.setTimeout(() => {
        dom.personNameInput.focus();
      }, 220);
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
      clearSummaryDetailAnimation(details);
      details.dataset.animating = "true";
      details.setAttribute("open", "");
      content.style.height = "0px";
      content.style.opacity = "0";

      requestAnimationFrame(() => {
        content.style.height = `${content.scrollHeight}px`;
        content.style.opacity = "1";
      });

      const cleanup = registerSummaryDetailAnimationCleanup(
        details,
        content,
        () => {
          content.style.height = "auto";
          content.style.opacity = "";
        },
      );

      content.addEventListener("transitionend", cleanup);
    }

    function collapseSummaryDetail(details, content) {
      clearSummaryDetailAnimation(details);
      details.dataset.animating = "true";
      content.style.height = `${content.scrollHeight}px`;
      content.style.opacity = "1";

      void content.offsetHeight;

      requestAnimationFrame(() => {
        content.style.height = "0px";
        content.style.opacity = "0";
      });

      const cleanup = registerSummaryDetailAnimationCleanup(
        details,
        content,
        () => {
          details.removeAttribute("open");
          content.style.height = "";
          content.style.opacity = "";
        },
      );

      content.addEventListener("transitionend", cleanup);
    }

    function clearSummaryDetailAnimation(details) {
      const cleanupTimerId = Number(details.dataset.cleanupTimerId || 0);

      if (cleanupTimerId) {
        window.clearTimeout(cleanupTimerId);
      }

      delete details.dataset.cleanupTimerId;
      delete details.dataset.animating;
    }

    function registerSummaryDetailAnimationCleanup(details, content, finalize) {
      const cleanup = (event) => {
        if (
          event &&
          (event.target !== content || event.propertyName !== "height")
        ) {
          return;
        }

        clearSummaryDetailAnimation(details);
        finalize();
        content.removeEventListener("transitionend", cleanup);
      };

      details.dataset.cleanupTimerId = String(
        window.setTimeout(
          () => cleanup(),
          SUMMARY_DETAIL_ANIMATION_FALLBACK_MS,
        ),
      );

      return cleanup;
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
      const targetY =
        window.scrollY + targetElement.getBoundingClientRect().top;
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

    return {
      bindEvents,
      setHeaderShareMenuOpen,
      getTripTitle,
      getNormalizedTripTitle,
      initializeApp,
    };
  }

  global.AppShell = {
    createAppShellController,
  };
})(window);
