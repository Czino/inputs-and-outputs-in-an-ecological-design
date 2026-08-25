import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
// @ts-ignore
import script from "./scripts/compare.inline"
import style from "./styles/compare.scss"

const Compare: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  return (
    <div id="compare-container" class="compare-page popover-hint" data-slug={fileData.slug}>
      <p class="compare-intro">
        Pick two notes to see what they have in common: notes they both link to, notes that link
        to both of them, and shared tags.
      </p>
      <div class="compare-pickers">
        <div class="compare-picker">
          <label for="compare-input-a">Note A</label>
          <input
            autocomplete="off"
            id="compare-input-a"
            type="text"
            placeholder="Search for a note..."
          />
          <div class="compare-suggestions" id="compare-suggestions-a"></div>
        </div>
        <div class="compare-picker">
          <label for="compare-input-b">Note B</label>
          <input
            autocomplete="off"
            id="compare-input-b"
            type="text"
            placeholder="Search for a note..."
          />
          <div class="compare-suggestions" id="compare-suggestions-b"></div>
        </div>
      </div>
      <div id="compare-results"></div>
    </div>
  )
}

Compare.css = style
Compare.afterDOMLoaded = script

export default (() => Compare) satisfies QuartzComponentConstructor
