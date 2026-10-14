import { Element, Root, RootContent } from "hast"
import { QuartzTransformerPlugin } from "../types"

const dimensionFields: Array<{ key: string; label: string }> = [
  { key: "height-m", label: "Height (m)" },
  { key: "diameter-m", label: "Diameter (m)" },
  { key: "stem-length-m", label: "Stem length (m)" },
]

function cell(tagName: "th" | "td", value: string): Element {
  return {
    type: "element",
    tagName,
    properties: {},
    children: [{ type: "text", value }],
  }
}

function row(cells: Element[]): Element {
  return {
    type: "element",
    tagName: "tr",
    properties: {},
    children: cells,
  }
}

function isFootnotesSection(node: RootContent): boolean {
  return (
    node.type === "element" &&
    node.tagName === "section" &&
    node.properties?.dataFootnotes !== undefined
  )
}

export const Dimensions: QuartzTransformerPlugin = () => {
  return {
    name: "Dimensions",
    htmlPlugins() {
      return [
        () => (tree: Root, file) => {
          const frontmatter = (file.data.frontmatter ?? {}) as Record<string, unknown>
          const rows = dimensionFields
            .map(({ key, label }) => {
              const raw = frontmatter[key]
              if (raw === undefined || raw === null || raw === "") return undefined
              return row([cell("td", label), cell("td", String(raw))])
            })
            .filter((r): r is Element => r !== undefined)

          if (rows.length === 0) return

          const table: Element = {
            type: "element",
            tagName: "table",
            properties: { className: ["dimensions-table"] },
            children: [
              {
                type: "element",
                tagName: "thead",
                properties: {},
                children: [row([cell("th", "Dimension"), cell("th", "At maturity")])],
              },
              {
                type: "element",
                tagName: "tbody",
                properties: {},
                children: rows,
              },
            ],
          }

          const footnotesIdx = tree.children.findIndex(isFootnotesSection)
          if (footnotesIdx === -1) {
            tree.children.push(table)
          } else {
            tree.children.splice(footnotesIdx, 0, table)
          }
        },
      ]
    },
  }
}
