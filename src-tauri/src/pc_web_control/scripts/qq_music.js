      const qqMusicSearchFallbackUrl = () => {
        if (!location.hostname.endsWith("y.qq.com")) return "";
        const keyword = qqMusicSearchKeyword();
        if (!keyword) return "";
        // 旧版首页在 WebKit 内嵌环境里经常不响应搜索按钮，直接兜底到现代搜索结果页。
        return `https://y.qq.com/n/ryqq/search?w=${encodeURIComponent(keyword)}&t=song`;
      };

      const qqMusicSearchKeyword = () => String(
        document.querySelector(".search_input__input[type='text']")?.value
          || window.__titanLastFillValue
          || ""
      ).trim();

      const isQqMusicSearchResultPage = () => {
        if (!location.hostname.endsWith("y.qq.com")) return false;
        return /(^|\/)search(\.html)?$/i.test(location.pathname)
          || location.pathname.includes("/search");
      };

      const hasQqMusicSearchResultSignal = () => {
        if (!location.hostname.endsWith("y.qq.com")) return false;
        const keyword = qqMusicSearchKeyword();
        const bodyText = document.body?.innerText || "";
        return Boolean(document.querySelector(".mod_songlist, .songlist__list, .songlist__item"))
          || (keyword.length > 0 && bodyText.includes(keyword) && bodyText.includes("歌曲"));
      };

      const matchesExpectedUrl = (href, expectedPart) => {
        if (location.hostname.endsWith("y.qq.com") && expectedPart === "/search") {
          return isQqMusicSearchResultPage() && hasQqMusicSearchResultSignal();
        }
        return href.includes(expectedPart);
      };

      const ensureQqMusicSearchInputValue = () => {
        if (!location.hostname.endsWith("y.qq.com")) return true;
        const input = document.querySelector(".search_input__input[type='text']");
        const keyword = qqMusicSearchKeyword();
        if (!input || !keyword) return true;
        if (String(input.value ?? "") === keyword) return true;
        writeInputValue(input, keyword);
        pushInputDebug(`qq-search-refill keyword=${keyword} final=${String(input.value ?? "")}`);
        return String(input.value ?? "") === keyword;
      };
