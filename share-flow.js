(function attachShareFlow(global) {
  function createShareController(dependencies) {
    const {
      appState,
      constants,
      getNormalizedTripTitle,
      exportTripData,
      importTripData,
      updateUI,
      updateShareUI,
      setHeaderShareMenuOpen,
      getSupabaseModulePromise,
      setSupabaseModulePromise,
    } = dependencies;

    function parseShareTokenFromUrl() {
      const url = new URL(window.location.href);
      return url.searchParams.get("share") || "";
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

    function isShareRoleAllowed(role) {
      if (role === "view") {
        return true;
      }

      return canEdit();
    }

    function getShareRoleLabel(role) {
      return role === "edit" ? "ลิงก์แก้ไข" : "ลิงก์ดูอย่างเดียว";
    }

    function getShareLinkByRole(role) {
      return role === "edit"
        ? appState.shareLinks.editUrl
        : appState.shareLinks.viewUrl;
    }

    async function copyTextToClipboard(text) {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }

      const helperTextarea = document.createElement("textarea");
      helperTextarea.value = text;
      helperTextarea.setAttribute("readonly", "");
      helperTextarea.style.position = "absolute";
      helperTextarea.style.left = "-9999px";
      document.body.appendChild(helperTextarea);
      helperTextarea.select();

      try {
        return document.execCommand("copy");
      } finally {
        document.body.removeChild(helperTextarea);
      }
    }

    async function ensureShareTripReady() {
      if (appState.tripId) {
        return true;
      }

      if (!canEdit()) {
        alert("ลิงก์นี้เป็นโหมดดูอย่างเดียว");
        return false;
      }

      const result = await createSharedTrip({ notifyOnSuccess: false });
      return Boolean(result);
    }

    async function handleShareLinkAction(role, options = {}) {
      const { closeMenu = false } = options;

      if (closeMenu) {
        setHeaderShareMenuOpen(false);
      }

      if (!isShareRoleAllowed(role)) {
        alert("ลิงก์นี้เป็นโหมดดูอย่างเดียว");
        return;
      }

      const isReady = await ensureShareTripReady();

      if (!isReady) {
        return;
      }

      const url = getShareLinkByRole(role);

      if (!url) {
        alert(`ยังไม่มี${getShareRoleLabel(role)}`);
        return;
      }

      try {
        const copied = await copyTextToClipboard(url);

        if (copied) {
          alert(`คัดลอก${getShareRoleLabel(role)}แล้ว`);
          return;
        }
      } catch {
        // Fall through to the manual-copy message below.
      }

      alert(
        `สร้าง${getShareRoleLabel(role)}แล้ว แต่คัดลอกอัตโนมัติไม่สำเร็จ\n${url}`,
      );
    }

    function handleShareTripClick() {
      if (appState.mode !== "shared-edit") {
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
        response = await fetch(`${constants.SHARE_API_BASE_URL}/${path}`, {
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

      let supabaseModulePromise = getSupabaseModulePromise();

      if (!supabaseModulePromise) {
        supabaseModulePromise =
          import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
        setSupabaseModulePromise(supabaseModulePromise);
      }

      const { createClient } = await supabaseModulePromise;
      appState.realtimeClient = createClient(
        constants.SUPABASE_PROJECT_URL,
        constants.SUPABASE_PUBLISHABLE_KEY,
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

      channel.on(
        "broadcast",
        { event: constants.REALTIME_SYNC_EVENT },
        (payload) => {
          handleRealtimeTripUpdate(payload);
        },
      );

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
          event: constants.REALTIME_SYNC_EVENT,
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

    async function createSharedTrip(options = {}) {
      const { notifyOnSuccess = true } = options;

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
        if (notifyOnSuccess) {
          alert("สร้างลิงก์แชร์สำเร็จแล้ว");
        }

        return result;
      } catch (error) {
        setSaveError(getRequestErrorMessage(error, "create"));
        updateShareUI();
        return null;
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

    return {
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
    };
  }

  global.ShareFlow = {
    createShareController,
  };
})(window);
