import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
// @ts-ignore
import script from "./scripts/compare.inline"
import style from "./styles/compare.scss"

const Compare: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  return (
    <div id="compare-container" class="compare-page popover-hint" data-slug={fileData.slug}>
      <p class="compare-intro">
        Pick two or more notes to see what they have in common: notes they all link to, notes
        that link to all of them, and shared tags.
      </p>
      <div class="compare-pickers" id="compare-pickers"></div>
      <div class="compare-actions">
        <button type="button" id="compare-add-picker" class="compare-add">
          + Add another note
        </button>
        <button type="button" id="compare-reset" class="compare-reset" aria-label="Reset comparison">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <title>Reset comparison</title>
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 4v5h5" />
          </svg>
        </button>
      </div>
      <div id="compare-results"></div>
    </div>
  )
}

Compare.css = style
Compare.afterDOMLoaded = script

export default (() => Compare) satisfies QuartzComponentConstructor
