import { QuartzComponent, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
// @ts-ignore
import script from "./scripts/comments.inline"

const Comments: QuartzComponent = ({ displayClass, fileData }: QuartzComponentProps) => {
  // Allow per-page opt-out via frontmatter
  const disableComment: boolean =
    typeof fileData.frontmatter?.comments !== "undefined" &&
    (!fileData.frontmatter?.comments || fileData.frontmatter?.comments === "false")

  if (disableComment) {
    return <></>
  }

  return (
    <section
      class={classNames(displayClass, "giscus")}
      data-repo="Devansh-Mahajan/Obsidian-Website"
      data-repo-id="R_kgDOPqqdPQ"
      data-category="General"
      data-category-id="DIC_kwDOPqqdPc4CvEYH"
      data-mapping="pathname"
      data-strict="0"
      data-reactions-enabled="1"
      data-input-position="bottom"
      data-theme-url="https://giscus.app/themes"
      data-light-theme="light"
      data-dark-theme="dark"
      data-lang="en"
    />
  )
}

Comments.afterDOMLoaded = script

export default Comments
