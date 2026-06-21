      const visible = (element) => {
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
      };

      const textOf = (element) => element?.innerText || element?.textContent || element?.value || "";
      const describe = (element) => {
        if (!element) return "";
        const id = element.id ? `#${element.id}` : "";
        const name = element.name ? `[name="${element.name}"]` : "";
        const placeholder = element.placeholder ? `[placeholder="${element.placeholder}"]` : "";
        return `${element.tagName.toLowerCase()}${id}${name}${placeholder}`;
      };
      const locatorText = (locator) => locator ? `${locator.type}:${locator.value}` : "";
      const activeElementText = () => describe(document.activeElement);
      const valueSnippet = (element) => String(element?.value ?? "").slice(0, 80);
      const pushInputDebug = (message) => {
        window.__titanInputDebug = [
          ...(Array.isArray(window.__titanInputDebug) ? window.__titanInputDebug : []),
          message,
        ].slice(-12);
      };
      const inputDebugText = () => Array.isArray(window.__titanInputDebug)
        ? window.__titanInputDebug.join(" | ")
        : "";

      const byCss = (value) => {
        try {
          return Array.from(document.querySelectorAll(value));
        } catch {
          return [];
        }
      };
      const byText = (value) => {
        const interactive = Array.from(document.querySelectorAll("button,a,[role='button'],label"));
        const fallback = Array.from(document.querySelectorAll("span,div,p,h1,h2,h3,h4,h5,h6"));
        return [...interactive, ...fallback].filter((element) => textOf(element).includes(value));
      };
      const byPlaceholder = (value) => Array.from(document.querySelectorAll("input,textarea"))
        .filter((element) => (element.placeholder || "").includes(value));
      const byName = (value) => Array.from(document.querySelectorAll("input,textarea,select,button"))
        .filter((element) => element.name === value);

      const findElement = () => {
        for (const locator of locators) {
          const value = locator.value || "";
          const candidates =
            locator.type === "css" ? byCss(value) :
            locator.type === "text" ? byText(value) :
            locator.type === "placeholder" ? byPlaceholder(value) :
            locator.type === "name" ? byName(value) :
            [];
          const visibleCandidates = candidates.filter(visible);
          const element = visibleCandidates[0];
          if (element) {
            return {
              element,
              locator,
              visibleCandidateCount: visibleCandidates.length,
              totalCandidateCount: candidates.length
            };
          }
        }
        return { element: null, locator: null, visibleCandidateCount: 0, totalCandidateCount: 0 };
      };
