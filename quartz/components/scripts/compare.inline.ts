import { ContentDetails } from "../../plugins/emitters/contentIndex"
import { FullSlug, SimpleSlug, resolveRelative, simplifySlug } from "../../util/path"
import { removeAllChildren } from "./util"

type Side = "a" | "b"
type LinkItem = { href: string; title: string }

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

  const selected: Partial<Record<Side, FullSlug>> = {}

  function renderList(container: HTMLElement, heading: string, items: LinkItem[]) {
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

    container.appendChild(section)
  }

  function renderResults() {
    const results = document.getElementById("compare-results")
    if (!results) return
    removeAllChildren(results)

    const { a, b } = selected
    if (!a || !b) return

    if (a === b) {
      const p = document.createElement("p")
      p.classList.add("compare-empty")
      p.textContent = "Pick two different notes to compare."
      results.appendChild(p)
      return
    }

    const detailsA = data[a]
    const detailsB = data[b]
    const simpleA = simplifySlug(a)
    const simpleB = simplifySlug(b)

    const linksB = new Set(detailsB.links ?? [])
    const sharedLinks = (detailsA.links ?? [])
      .filter((l) => l !== simpleA && l !== simpleB && linksB.has(l))
      .map(toLinkItem)
      .sort(byTitle)

    const sharedBacklinks = entries
      .filter(({ slug }) => slug !== a && slug !== b)
      .filter(({ slug }) => {
        const links = data[slug].links ?? []
        return links.includes(simpleA) && links.includes(simpleB)
      })
      .map(({ slug }) => ({ href: resolveRelative(currentSlug, slug), title: titleOf(slug) }))
      .sort(byTitle)

    const tagsA = new Set(detailsA.tags ?? [])
    const sharedTags = (detailsB.tags ?? [])
      .filter((t) => tagsA.has(t))
      .sort((x, y) => x.localeCompare(y))
      .map((t) => ({ href: "", title: `#${t}` }))

    renderList(results, "Notes both link to", sharedLinks)
    renderList(results, "Notes that link to both", sharedBacklinks)
    renderList(results, "Shared tags", sharedTags)
  }

  function setupPicker(side: Side) {
    const input = document.getElementById(`compare-input-${side}`) as HTMLInputElement | null
    const suggestions = document.getElementById(`compare-suggestions-${side}`)
    if (!input || !suggestions) return

    function hideSuggestions() {
      removeAllChildren(suggestions!)
      suggestions!.classList.remove("active")
    }

    function onInput() {
      selected[side] = undefined
      renderResults()

      const query = input!.value.trim().toLowerCase()
      hideSuggestions()
      if (query === "") return

      const matches = entries.filter((e) => e.title.toLowerCase().includes(query)).slice(0, 8)
      if (matches.length === 0) return

      for (const match of matches) {
        const item = document.createElement("button")
        item.type = "button"
        item.classList.add("compare-suggestion")
        item.textContent = match.title
        item.addEventListener("click", () => {
          input!.value = match.title
          selected[side] = match.slug
          hideSuggestions()
          renderResults()
        })
        suggestions!.appendChild(item)
      }
      suggestions!.classList.add("active")
    }

    function onBlur() {
      setTimeout(hideSuggestions, 150)
    }

    input.addEventListener("input", onInput)
    window.addCleanup(() => input.removeEventListener("input", onInput))
    input.addEventListener("blur", onBlur)
    window.addCleanup(() => input.removeEventListener("blur", onBlur))
  }

  setupPicker("a")
  setupPicker("b")
  renderResults()
})
