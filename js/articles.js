/* ===========================================================
   Aperture Log — Articles listing page
   Handles search, category filtering, and pagination over the
   article cards already present in the page markup.

   There's no Firestore "articles" collection yet — each post is
   still a hand-authored HTML file (like article.html), with its
   card added directly to the grid below in articles.html. This
   script just makes that grid searchable/filterable/paginated,
   and is written to keep working the same way as more real
   article cards get added over time.
=========================================================== */

const PER_PAGE = 6;
let currentPage = 1;
let activeCat = "all";

const cards = Array.from(document.querySelectorAll("#articles-grid .card"));
const searchInput = document.getElementById("search-input");
const filterPills = document.querySelectorAll(".filter-pill");
const resultCount = document.getElementById("result-count");
const noResults = document.getElementById("no-results");
const paginationEl = document.getElementById("pagination");
const articlesGrid = document.getElementById("articles-grid");

function getFiltered() {
  const q = searchInput.value.trim().toLowerCase();

  return cards.filter((card) => {
    const matchesCat = activeCat === "all" || card.dataset.cat === activeCat;
    const matchesSearch = !q || card.dataset.title.includes(q);
    return matchesCat && matchesSearch;
  });
}

function renderPagination(totalPages) {
  paginationEl.innerHTML = "";
  paginationEl.classList.toggle("show", totalPages > 1);
  if (totalPages <= 1) return;

  function makeBtn(label, page, opts = {}) {
    const btn = document.createElement("button");
    btn.className = "page-btn" + (opts.active ? " active" : "");
    btn.innerHTML = label;
    btn.disabled = !!opts.disabled;
    btn.addEventListener("click", () => goToPage(page));
    return btn;
  }

  paginationEl.appendChild(
    makeBtn(
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg> Prev',
      currentPage - 1,
      { disabled: currentPage === 1 }
    )
  );

  const pageNumbers = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1) {
      pageNumbers.push(p);
    } else if (pageNumbers[pageNumbers.length - 1] !== "...") {
      pageNumbers.push("...");
    }
  }

  pageNumbers.forEach((p) => {
    if (p === "...") {
      const span = document.createElement("span");
      span.className = "page-ellipsis";
      span.textContent = "···";
      paginationEl.appendChild(span);
    } else {
      paginationEl.appendChild(makeBtn(p, p, { active: p === currentPage }));
    }
  });

  paginationEl.appendChild(
    makeBtn(
      'Next <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>',
      currentPage + 1,
      { disabled: currentPage === totalPages }
    )
  );
}

function goToPage(page) {
  currentPage = page;
  applyFilters(false);
  articlesGrid.scrollIntoView({ behavior: "smooth", block: "start" });
}

function applyFilters(resetPage = true) {
  if (resetPage) currentPage = 1;

  const filtered = getFiltered();
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * PER_PAGE;
  const end = start + PER_PAGE;

  cards.forEach((card) => (card.style.display = "none"));
  filtered.slice(start, end).forEach((card) => (card.style.display = ""));

  resultCount.textContent = filtered.length;
  noResults.classList.toggle("show", filtered.length === 0);
  renderPagination(totalPages);
}

filterPills.forEach((pill) => {
  pill.addEventListener("click", () => {
    filterPills.forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    activeCat = pill.dataset.cat;
    applyFilters();
  });
});

searchInput.addEventListener("input", () => applyFilters());

applyFilters();
