(() => {
  const REPORT_WORDS = [
    "reports",
    "sales & cash report",
    "settlement report",
    "inventory report",
    "orders & bookings",
    "sales detail reports",
    "bookings report",
    "website sales report",
    "pos sales report",
  ];

  const looksLikeReportsPage = () => {
    const path = `${window.location.pathname} ${window.location.hash}`.toLowerCase();
    if (path.includes("report")) return true;
    const text = document.body?.innerText?.toLowerCase() || "";
    return REPORT_WORDS.some((word) => text.includes(word));
  };

  const isHelperCard = (el) => {
    const text = (el.innerText || "").toLowerCase();
    return (
      text.includes("how to choose") ||
      text.includes("store owner view") ||
      text.includes("sedifex money view") ||
      text.includes("school / ngo view")
    );
  };

  const isReportCard = (el) => {
    if (!el || el.dataset?.sedifexReportProcessed === "true") return false;
    const text = (el.innerText || "").toLowerCase();
    if (!text.includes("report") && !text.includes("orders & bookings")) return false;
    if (text.includes("how to choose")) return false;
    const hasOpenAction = text.includes("open") || el.querySelector("a,button");
    return hasOpenAction;
  };

  const getUsefulContainers = () => {
    const candidates = Array.from(
      document.querySelectorAll("section, article, div, li")
    );

    return candidates.filter((el) => {
      const text = (el.innerText || "").trim();
      if (!text || text.length < 20 || text.length > 420) return false;
      return isReportCard(el) || isHelperCard(el);
    });
  };

  const downloadPageCsv = () => {
    const rows = Array.from(
      document.querySelectorAll(".sedifex-report-data-card:not(.is-filtered-out)")
    ).map((card) => {
      const title = card.querySelector("h1,h2,h3,h4,strong")?.innerText?.trim() || "Report";
      const desc = Array.from(card.querySelectorAll("p"))
        .map((p) => p.innerText.trim())
        .filter(Boolean)
        .join(" ");
      const link = card.querySelector("a[href]")?.href || "";
      return [title, desc, link];
    });

    const csv = [
      ["Report", "Description", "Link"],
      ...rows,
    ]
      .map((row) =>
        row
          .map((value) => `"${String(value || "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sedifex-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const addToolbar = (anchor) => {
    if (document.querySelector(".sedifex-report-toolbar")) return;

    const toolbar = document.createElement("div");
    toolbar.className = "sedifex-report-toolbar";
    toolbar.innerHTML = `
      <div class="sedifex-report-toolbar__top">
        <div>
          <h2>Reports & data history</h2>
          <p>Use this page to open historical data, filter records, and download reports. Metrics should stay on the dashboard and Market Orders.</p>
        </div>
        <div class="sedifex-report-toolbar__actions">
          <button type="button" class="primary" data-sedifex-export-csv>Download list CSV</button>
          <button type="button" data-sedifex-print>Print / Save PDF</button>
        </div>
      </div>
      <div class="sedifex-report-toolbar__filter">
        <input type="search" placeholder="Search reports, orders, bookings, settlements, inventory..." data-sedifex-report-search />
        <button type="button" data-sedifex-clear-search>Clear</button>
      </div>
    `;

    anchor.parentNode?.insertBefore(toolbar, anchor);
    toolbar.querySelector("[data-sedifex-export-csv]")?.addEventListener("click", downloadPageCsv);
    toolbar.querySelector("[data-sedifex-print]")?.addEventListener("click", () => window.print());

    const search = toolbar.querySelector("[data-sedifex-report-search]");
    const clear = toolbar.querySelector("[data-sedifex-clear-search]");
    const applyFilter = () => {
      const q = search.value.trim().toLowerCase();
      document.querySelectorAll(".sedifex-report-data-card").forEach((card) => {
        const match = !q || card.innerText.toLowerCase().includes(q);
        card.classList.toggle("is-filtered-out", !match);
      });
    };
    search?.addEventListener("input", applyFilter);
    clear?.addEventListener("click", () => {
      search.value = "";
      applyFilter();
      search.focus();
    });
  };

  const simplifyReports = () => {
    if (!looksLikeReportsPage()) return;
    document.body.classList.add("sedifex-reports-simple");

    const containers = getUsefulContainers();
    const reportCards = [];

    containers.forEach((el) => {
      if (isHelperCard(el)) {
        el.classList.add("sedifex-report-helper-card");
        return;
      }
      if (isReportCard(el)) {
        el.dataset.sedifexReportProcessed = "true";
        el.classList.add("sedifex-report-data-card");
        reportCards.push(el);
      }
    });

    const firstCard = reportCards[0] || containers.find((el) => !isHelperCard(el));
    if (firstCard) addToolbar(firstCard);

    if (firstCard && !document.querySelector(".sedifex-report-download-note")) {
      const note = document.createElement("div");
      note.className = "sedifex-report-download-note";
      note.textContent =
        "Tip: open a report to view the full history. Export/download belongs inside each report table so the owner gets the exact data they need.";
      firstCard.parentNode?.insertBefore(note, firstCard.nextSibling);
    }
  };

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      simplifyReports();
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule);
  } else {
    schedule();
  }

  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
