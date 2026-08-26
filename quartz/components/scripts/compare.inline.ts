import { ContentDetails } from "../../plugins/emitters/contentIndex"
import { FullSlug, SimpleSlug, resolveRelative, simplifySlug } from "../../util/path"
import { removeAllChildren } from "./util"

type LinkItem = { href: string; title: string }

const MIN_PICKERS = 2

document.addEventListener("nav", async () => {
  const root = document.getElementById("compare-container")
  if (!root) return

  const currentSlug = root.dataset.slug as FullSlug
  const data = (await fetchData) as Record<FullSlug, ContentDetails>
  const entries = Object.entries(data)
    .map(([slug, details]) => ({ slug: slug as FullSlug, title: details.title }))
    .sort((x, y) => x.title.localeCompare(y.title))

  const simpleToFull = new Map<SimpleSlug, FullSlug>(entries.map((e) => [simplifySlug(e.slug), e.slug]))
  const titleOf = (slug: FullSlug) => data[slug]?.title ?? slug
  const toLinkItem = (simple: SimpleSlug): LinkItem => {
    const full = simpleToFull.get(simple)
    return {
      href: resolveRelative(currentSlug, full ?? simple),
      title: full ? titleOf(full) : simple,
    }
  }
  const byTitle = (x: LinkItem, y: LinkItem) => x.title.localeCompare(y.title)

  // lower is a better match: exact title, then title prefix, then word prefix, then substring
  function matchRank(title: string, query: string): number {
    const t = title.toLowerCase()
    if (t === query) return 0
    if (t.startsWith(query)) return 1
    if (t.split(/\s+/).some((word) => word.startsWith(query))) return 2
    if (t.includes(query)) return 3
    return -1
  }

  function rankedMatches(query: string) {
    const q = query.toLowerCase()
    return entries
      .map((e) => ({ e, rank: matchRank(e.title, q) }))
      .filter(({ rank }) => rank >= 0)
      .sort((a, b) => a.rank - b.rank || a.e.title.localeCompare(b.e.title))
      .slice(0, 8)
      .map(({ e }) => e)
  }

  function findExactMatch(query: string) {
    const q = query.trim().toLowerCase()
    if (!q) return undefined
    return entries.find((e) => e.title.toLowerCase() === q)
  }

  const pickersContainer = document.getElementById("compare-pickers")
  const addButton = document.getElementById("compare-add-picker")
  const resetButton = document.getElementById("compare-reset")
  const results = document.getElementById("compare-results")
  if (!pickersContainer || !addButton || !resetButton || !results) return

  function readSelectionsFromUrl(): (FullSlug | undefined)[] {
    const slugs = new URLSearchParams(window.location.search)
      .getAll("note")
      .filter((slug) => Object.prototype.hasOwnProperty.call(data, slug)) as FullSlug[]
    return slugs.length >= MIN_PICKERS
      ? slugs
      : [...slugs, ...Array(MIN_PICKERS - slugs.length).fill(undefined)]
  }

  function updateUrl() {
    const params = new URLSearchParams()
    for (const slug of selections) {
      if (slug) params.append("note", slug)
    }
    const query = params.toString()
    const url = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`
    history.replaceState(null, "", url)
  }

  // one slot per picker; undefined means that picker has no note selected yet
  let selections: (FullSlug | undefined)[] = readSelectionsFromUrl()

  function renderSection(heading: string, items: LinkItem[]) {
    const section = document.createElement("div")
    section.classList.add("compare-section")

    const h3 = document.createElement("h3")
    h3.textContent = `${heading} (${items.length})`
    section.appendChild(h3)

    if (items.length === 0) {
      const p = document.createElement("p")
      p.classList.add("compare-empty")
      p.textContent = "None."
      section.appendChild(p)
    } else if (heading === "Shared tags") {
      const ul = document.createElement("ul")
      ul.classList.add("tags")
      for (const item of items) {
        const li = document.createElement("li")
        const p = document.createElement("p")
        p.textContent = item.title
        li.appendChild(p)
        ul.appendChild(li)
      }
      section.appendChild(ul)
    } else {
      const ul = document.createElement("ul")
      for (const item of items) {
        const li = document.createElement("li")
        const a = document.createElement("a")
        a.href = item.href
        a.classList.add("internal")
        a.textContent = item.title
        li.appendChild(a)
        ul.appendChild(li)
      }
      section.appendChild(ul)
    }

    results!.appendChild(section)
  }

  function renderResults() {
    updateUrl()
    removeAllChildren(results!)

    const filled = selections.filter((s): s is FullSlug => Boolean(s))
    if (filled.length < MIN_PICKERS) return

    const chosen = [...new Set(filled)]
    if (chosen.length < MIN_PICKERS) {
      const p = document.createElement("p")
      p.classList.add("compare-empty")
      p.textContent = "Pick different notes to compare."
      results!.appendChild(p)
      return
    }

    const simples = chosen.map(simplifySlug)
    const linkSets = chosen.map((slug) => new Set(data[slug].links ?? []))
    const sharedLinks = [...linkSets[0]]
      .filter((l) => !simples.includes(l))
      .filter((l) => linkSets.every((set) => set.has(l)))
      .map(toLinkItem)
      .sort(byTitle)

    const sharedBacklinks = entries
      .filter(({ slug }) => !chosen.includes(slug))
      .filter(({ slug }) => {
        const links = data[slug].links ?? []
        return simples.every((s) => links.includes(s))
      })
      .map(({ slug }) => ({ href: resolveRelative(currentSlug, slug), title: titleOf(slug) }))
      .sort(byTitle)

    const tagSets = chosen.map((slug) => new Set(data[slug].tags ?? []))
    const sharedTags = (tagSets[0] ? [...tagSets[0]] : [])
      .filter((t) => tagSets.every((set) => set.has(t)))
      .sort((x, y) => x.localeCompare(y))
      .map((t) => ({ href: "", title: `#${t}` }))

    const linkHeading = chosen.length === 2 ? "Notes both link to" : "Notes all link to"
    const backlinkHeading =
      chosen.length === 2 ? "Notes that link to both" : "Notes that link to all of them"

    renderSection(linkHeading, sharedLinks)
    renderSection(backlinkHeading, sharedBacklinks)
    renderSection("Shared tags", sharedTags)
  }

  function setupPickerInput(index: number, input: HTMLInputElement, suggestions: HTMLElement) {
    function hideSuggestions() {
      removeAllChildren(suggestions)
      suggestions.classList.remove("active")
    }

    function selectMatch(match: { slug: FullSlug; title: string }) {
      input.value = match.title
      selections[index] = match.slug
      hideSuggestions()
      renderResults()
    }

    // lets the user commit whatever they typed without clicking a suggestion,
    // as long as it's an exact (case-insensitive) title match
    function commitExactMatch(): boolean {
      const match = findExactMatch(input.value)
      if (!match) return false
      selectMatch(match)
      return true
    }

    function onInput() {
      selections[index] = undefined
      renderResults()

      const query = input.value.trim()
      hideSuggestions()
      if (query === "") return

      const matches = rankedMatches(query)
      if (matches.length === 0) return

      for (const match of matches) {
        const item = document.createElement("button")
        item.type = "button"
        item.classList.add("compare-suggestion")
        item.textContent = match.title
        item.addEventListener("click", () => selectMatch(match))
        suggestions.appendChild(item)
      }
      suggestions.classList.add("active")
    }

    function onKeydown(e: KeyboardEvent) {
      if (e.key !== "Enter") return
      e.preventDefault()
      if (commitExactMatch()) return
      const firstSuggestion = suggestions.querySelector(".compare-suggestion") as HTMLElement | null
      firstSuggestion?.click()
    }

    function onBlur() {
      commitExactMatch()
      setTimeout(hideSuggestions, 150)
    }

    input.addEventListener("input", onInput)
    window.addCleanup(() => input.removeEventListener("input", onInput))
    input.addEventListener("keydown", onKeydown)
    window.addCleanup(() => input.removeEventListener("keydown", onKeydown))
    input.addEventListener("blur", onBlur)
    window.addCleanup(() => input.removeEventListener("blur", onBlur))
  }

  function renderPickers() {
    removeAllChildren(pickersContainer!)

    selections.forEach((selectedSlug, index) => {
      const picker = document.createElement("div")
      picker.classList.add("compare-picker")

      const header = document.createElement("div")
      header.classList.add("compare-picker-header")

      const label = document.createElement("label")
      label.setAttribute("for", `compare-input-${index}`)
      label.textContent = `Note ${index + 1}`
      header.appendChild(label)

      if (selections.length > MIN_PICKERS) {
        const removeBtn = document.createElement("button")
        removeBtn.type = "button"
        removeBtn.classList.add("compare-remove")
        removeBtn.setAttribute("aria-label", `Remove note ${index + 1}`)
        removeBtn.textContent = "×"
        removeBtn.addEventListener("click", () => {
          selections.splice(index, 1)
          renderPickers()
          renderResults()
        })
        header.appendChild(removeBtn)
      }

      picker.appendChild(header)

      const input = document.createElement("input")
      input.type = "text"
      input.autocomplete = "off"
      input.id = `compare-input-${index}`
      input.placeholder = "Search for a note..."
      if (selectedSlug) input.value = titleOf(selectedSlug)
      picker.appendChild(input)

      const suggestions = document.createElement("div")
      suggestions.classList.add("compare-suggestions")
      suggestions.id = `compare-suggestions-${index}`
      picker.appendChild(suggestions)

      pickersContainer!.appendChild(picker)
      setupPickerInput(index, input, suggestions)
    })
  }

  function onAddPicker() {
    selections.push(undefined)
    renderPickers()
    const lastInput = document.getElementById(
      `compare-input-${selections.length - 1}`,
    ) as HTMLInputElement | null
    lastInput?.focus()
  }

  function onReset() {
    selections = Array(MIN_PICKERS).fill(undefined)
    renderPickers()
    renderResults()
  }

  addButton.addEventListener("click", onAddPicker)
  window.addCleanup(() => addButton.removeEventListener("click", onAddPicker))
  resetButton.addEventListener("click", onReset)
  window.addCleanup(() => resetButton.removeEventListener("click", onReset))

  renderPickers()
  renderResults()
})
