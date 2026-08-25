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
      <button type="button" id="compare-add-picker" class="compare-add">
        + Add another note
      </button>
      <div id="compare-results"></div>
    </div>
  )
}

Compare.css = style
Compare.afterDOMLoaded = script

export default (() => Compare) satisfies QuartzComponentConstructor
