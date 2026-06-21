      // 受控表单要走原生 value setter，避免 React/AntD 状态没有同步。
      const nativeValueDescriptor = (element) => {
        const tagName = element.tagName?.toLowerCase();
        if (tagName === "textarea") {
          return Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
        }
        if (tagName === "select") {
          return Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
        }
        return Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")
          || Object.getOwnPropertyDescriptor(element.constructor.prototype, "value");
      };

      const setRawValue = (element, value) => {
        const descriptor = nativeValueDescriptor(element);
        if (descriptor?.set) {
          descriptor.set.call(element, value);
        } else {
          element.value = value;
        }
      };

      const dispatchInput = (element, data = null) => {
        try {
          element.dispatchEvent(new InputEvent("beforeinput", {
            bubbles: true,
            cancelable: true,
            inputType: data === null ? "deleteContentBackward" : "insertText",
            data,
          }));
          element.dispatchEvent(new InputEvent("input", {
            bubbles: true,
            inputType: data === null ? "deleteContentBackward" : "insertText",
            data,
          }));
        } catch {
          element.dispatchEvent(new Event("input", { bubbles: true }));
        }
      };

      const dispatchKeyboard = (element, type, key) => {
        element.dispatchEvent(new KeyboardEvent(type, {
          key,
          code: key === "Enter" ? "Enter" : undefined,
          keyCode: key === "Enter" ? 13 : undefined,
          which: key === "Enter" ? 13 : undefined,
          bubbles: true,
          cancelable: true,
        }));
      };

      const dispatchComposition = (element, type, data) => {
        try {
          element.dispatchEvent(new CompositionEvent(type, {
            bubbles: true,
            cancelable: true,
            data,
          }));
        } catch {
          element.dispatchEvent(new Event(type, { bubbles: true }));
        }
      };

      const dispatchMouse = (element, type) => {
        element.dispatchEvent(new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          view: window,
        }));
      };

      const dispatchPointer = (element, type) => {
        if (typeof PointerEvent === "function") {
          element.dispatchEvent(new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            pointerType: "mouse",
            isPrimary: true,
          }));
        }
      };

      const focusForInput = (element) => {
        dispatchPointer(element, "pointerdown");
        dispatchMouse(element, "mousedown");
        dispatchPointer(element, "pointerup");
        dispatchMouse(element, "mouseup");
        element.click?.();
        element.focus?.();
      };

      const setValue = (element, value) => {
        element.focus?.();
        setRawValue(element, value);
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
        element.blur?.();
      };

      const clearInputValue = (element) => {
        focusForInput(element);
        const currentValue = String(element.value ?? "");
        element.setSelectionRange?.(0, currentValue.length);
        dispatchKeyboard(element, "keydown", "Backspace");
        const canExecDelete = typeof document.execCommand === "function";
        const deletedByBrowser = canExecDelete && document.execCommand("delete", false);
        if (!deletedByBrowser || String(element.value ?? "").length > 0) {
          setRawValue(element, "");
          dispatchInput(element, null);
        }
        dispatchKeyboard(element, "keyup", "Backspace");
        pushInputDebug(`clear before=${currentValue.length} execDelete=${Boolean(deletedByBrowser)} after=${String(element.value ?? "").length}`);
      };

      const writeInputValue = (element, value) => {
        const nextValue = String(value);
        focusForInput(element);
        element.setSelectionRange?.(0, String(element.value ?? "").length);
        dispatchComposition(element, "compositionstart", "");
        dispatchKeyboard(element, "keydown", nextValue);
        dispatchKeyboard(element, "keypress", nextValue);

        // 优先使用浏览器原生编辑命令，让站点收到更接近真实键盘输入的事件链。
        const canExecInsert = typeof document.execCommand === "function";
        const insertedByBrowser = canExecInsert && document.execCommand("insertText", false, nextValue);
        const afterNativeInsert = String(element.value ?? "");
        if (!insertedByBrowser || String(element.value ?? "") !== nextValue) {
          setRawValue(element, nextValue);
          dispatchInput(element, nextValue);
        }

        dispatchKeyboard(element, "keyup", nextValue);
        dispatchComposition(element, "compositionend", nextValue);
        element.dispatchEvent(new Event("change", { bubbles: true }));
        pushInputDebug(`write expected=${nextValue} execInsert=${Boolean(insertedByBrowser)} afterNative=${afterNativeInsert} final=${String(element.value ?? "")}`);
      };

      const resetTypingState = () => {
        window.__titanTypingState = null;
      };

      const verifyValue = (element, value) => {
        const currentValue = element.value ?? "";
        return {
          ok: currentValue === value,
          currentValue,
          currentLength: String(currentValue).length,
          expectedLength: String(value).length,
        };
      };

      const fillAndVerifyValue = (element, value) => {
        const nextValue = String(value);
        const signature = `${step.step}:${step.action}:${nextValue}:${describe(element)}`;
        const state = window.__titanTypingState;

        if (
          !state ||
          state.signature !== signature ||
          state.element !== element ||
          !state.element?.isConnected
        ) {
          clearInputValue(element);
          writeInputValue(element, nextValue);
          window.__titanLastFillValue = nextValue;
          window.__titanTypingState = {
            signature,
            element,
            attempts: 1,
            stableCount: 0,
          };
        }

        const currentState = window.__titanTypingState;
        const verification = verifyValue(element, nextValue);
        if (!verification.ok && currentState.attempts < 3) {
          currentState.attempts += 1;
          clearInputValue(element);
          writeInputValue(element, nextValue);
          window.__titanLastFillValue = nextValue;
          return {
            ...verifyValue(element, nextValue),
            typing: true,
            attempts: currentState.attempts,
            stableCount: currentState.stableCount,
          };
        }

        if (!verification.ok) {
          resetTypingState();
          return {
            ok: false,
            currentValue: verification.currentValue,
            currentLength: verification.currentLength,
            expectedLength: verification.expectedLength,
            attempts: currentState.attempts,
            stableCount: currentState.stableCount,
          };
        }

        currentState.stableCount += 1;
        if (currentState.stableCount >= 2) {
          resetTypingState();
          return {
            ...verification,
            attempts: currentState.attempts,
            stableCount: currentState.stableCount,
          };
        }

        return {
          ...verification,
          ok: false,
          typing: true,
          attempts: currentState.attempts,
          stableCount: currentState.stableCount,
        };
      };
