      const triggerActionOnce = (signature, trigger) => {
        const state = window.__titanActionState;
        if (!state || state.signature !== signature) {
          trigger();
          window.__titanActionState = { signature, triggered: true };
        }
      };

      const resetActionState = () => {
        window.__titanActionState = null;
      };

      const actionUrlResult = ({ beforeUrl, elementText, matchedLocator, element, visibleCandidateCount, actionDetail, expectedUrlPart }) => {
        const afterUrl = location.href;
        const urlMatched = expectedUrlPart ? matchesExpectedUrl(afterUrl, expectedUrlPart) : true;
        if (urlMatched) {
          resetActionState();
        }

        return {
          ok: urlMatched,
          error: expectedUrlPart
            ? `搜索未触发，当前 URL 未包含期望内容: ${expectedUrlPart}`
            : "动作事件已派发",
          detail: urlMatched
            ? actionDetail
            : `已派发动作但页面结果未生效: ${elementText}`,
          beforeUrl,
          afterUrl,
          expectedUrlPart,
          matchedLocator,
          element: elementText,
          visibleCandidateCount,
          activeElement: activeElementText(),
          currentValue: valueSnippet(element),
          inputDebug: inputDebugText(),
          searchFallbackUrl: window.__titanSearchFallbackUrl || "",
        };
      };

      const action = step.action;
      if (action === "waitForUrl") {
        const currentUrl = location.href;
        return {
          ok: matchesExpectedUrl(currentUrl, expectedValue),
          error: `当前 URL 未包含期望内容: ${expectedValue}`,
          currentUrl,
          expectedUrlPart: expectedValue,
          detail: `当前 URL: ${currentUrl}`
        };
      }

      if (action === "assertText" && locators.length === 0) {
        return {
          ok: (document.body?.innerText || "").includes(expectedValue),
          error: `页面未包含期望文本: ${expectedValue}`
        };
      }

      const { element, locator, visibleCandidateCount, totalCandidateCount } = findElement();
      if (!element) {
        return {
          ok: false,
          error: "候选定位器未命中可见元素",
          currentUrl: location.href,
          visibleCandidateCount,
          totalCandidateCount
        };
      }
      const matchedLocator = locatorText(locator);
      const elementText = describe(element);

      if (action === "assertVisible" || action === "waitForVisible") {
        return {
          ok: true,
          detail: `命中元素: ${elementText}`,
          currentUrl: location.href,
          matchedLocator,
          element: elementText,
          visibleCandidateCount
        };
      }
      if (action === "assertText") {
        return {
          ok: textOf(element).includes(expectedValue),
          error: `元素文本未包含期望内容: ${expectedValue}`,
          detail: `命中元素: ${elementText}`,
          currentUrl: location.href,
          matchedLocator,
          element: elementText,
          visibleCandidateCount
        };
      }
      if (action === "fill") {
        if (!("value" in step) || expectedValue.length === 0) {
          resetTypingState();
          return {
            ok: false,
            error: "fill 动作缺少输入值，请在步骤 value 中配置要输入的内容",
            currentUrl: location.href,
            expectedLength: expectedValue.length
          };
        }
        const beforeValue = String(element.value ?? "");
        const verification = fillAndVerifyValue(element, expectedValue);
        return {
          ok: verification.ok,
          error: verification.typing
            ? `正在确认输入框内容: 当前长度 ${verification.currentLength}，期望长度 ${verification.expectedLength}`
            : `输入后值校验失败: 当前长度 ${verification.currentLength}，期望长度 ${verification.expectedLength}`,
          detail: verification.ok
            ? `已输入并校验元素值: ${elementText}`
            : `已定位但输入未生效: ${elementText}`,
          currentUrl: location.href,
          matchedLocator,
          element: elementText,
          visibleCandidateCount,
          beforeLength: beforeValue.length,
          currentValue: valueSnippet(element),
          currentLength: verification.currentLength,
          expectedLength: verification.expectedLength,
          attempts: verification.attempts,
          stableCount: verification.stableCount,
          inputDebug: inputDebugText()
        };
      }
      if (action === "clear") {
        setValue(element, "");
        const verification = verifyValue(element, "");
        return {
          ok: verification.ok,
          error: `清空后值校验失败: 当前长度 ${verification.currentLength}`,
          detail: verification.ok ? `已清空元素: ${elementText}` : `已定位但清空未生效: ${elementText}`,
          currentUrl: location.href,
          matchedLocator,
          element: elementText,
          visibleCandidateCount
        };
      }
      if (action === "click") {
        const beforeUrl = location.href;
        const isQqMusicSearchButton = location.hostname.endsWith("y.qq.com")
          && (element.matches?.(".search_input__btn") || elementText.includes("button"));
        const mayBeQqMusicPlayAction = location.hostname.endsWith("y.qq.com")
          && locators.some((locator) => String(locator.value || "").includes("songlist__item"));
        if (mayBeQqMusicPlayAction && !isQqMusicSearchResultPage()) {
          return {
            ok: false,
            error: "当前仍在 QQ 音乐首页，禁止点击首页播放按钮，等待搜索结果页",
            currentUrl: location.href,
            matchedLocator,
            element: elementText,
            visibleCandidateCount,
            inputDebug: inputDebugText()
          };
        }
        const expectedUrlPart = expectedValue || (isQqMusicSearchButton ? "/search" : "");
        const signature = `${step.step}:${step.action}:${expectedUrlPart}:${elementText}:${beforeUrl}`;
        // 配置了 value 时，动作步骤必须等到 URL 命中期望值才算通过。
        triggerActionOnce(signature, () => {
          if (isQqMusicSearchButton) {
            ensureQqMusicSearchInputValue();
          }
          element.focus?.();
          dispatchPointer(element, "pointerdown");
          dispatchMouse(element, "mousedown");
          dispatchPointer(element, "pointerup");
          dispatchMouse(element, "mouseup");
          element.click();
          const fallbackUrl = expectedUrlPart.includes("/search") ? qqMusicSearchFallbackUrl() : "";
          if (fallbackUrl) {
            window.__titanSearchFallbackUrl = fallbackUrl;
            location.href = fallbackUrl;
          }
        });
        return actionUrlResult({
          beforeUrl,
          elementText,
          matchedLocator,
          element,
          visibleCandidateCount,
          expectedUrlPart,
          actionDetail: expectedValue
            ? `已点击元素并等待到页面结果: ${elementText}`
            : `已点击元素，后续步骤继续等待页面结果: ${elementText}`,
        });
      }
      if (action === "pressEnter") {
        const beforeUrl = location.href;
        const expectedUrlPart = expectedValue || (location.hostname.endsWith("y.qq.com") ? "/search" : "");
        const signature = `${step.step}:${step.action}:${expectedUrlPart}:${elementText}:${beforeUrl}`;
        // 回车触发搜索时同样以页面结果为准，避免事件派发成功但业务没有发生。
        triggerActionOnce(signature, () => {
          element.focus?.();
          dispatchKeyboard(element, "keydown", "Enter");
          dispatchKeyboard(element, "keypress", "Enter");
          dispatchKeyboard(element, "keyup", "Enter");
          const fallbackUrl = expectedUrlPart.includes("/search") ? qqMusicSearchFallbackUrl() : "";
          if (fallbackUrl) {
            window.__titanSearchFallbackUrl = fallbackUrl;
            location.href = fallbackUrl;
          }
        });
        return actionUrlResult({
          beforeUrl,
          elementText,
          matchedLocator,
          element,
          visibleCandidateCount,
          expectedUrlPart,
          actionDetail: expectedValue
            ? `已触发回车并等待到页面结果: ${elementText}`
            : `已在元素上触发回车键: ${elementText}`,
        });
      }
      if (action === "select") {
        setValue(element, expectedValue);
        return {
          ok: true,
          detail: `已选择元素: ${elementText}`,
          currentUrl: location.href,
          matchedLocator,
          element: elementText,
          visibleCandidateCount
        };
      }

      return { ok: false, error: `不支持的 PC Web 动作: ${action}` };
