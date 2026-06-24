const projectSources = {
  "arch-6020": "content/projects/arch-6020.md",
  "arch-2017": "content/projects/arch-2017.md",
  "study-abroad": "content/projects/study-abroad.md",
  "knowledge-atlas": "content/projects/knowledge-atlas.md",
  "interface-studies": "content/projects/interface-studies.md",
};

const detail = document.querySelector("#project-detail");
const detailContent = document.querySelector("[data-project-content]");
const closeProject = document.querySelector("[data-close-project]");

const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const inlineMarkdown = (value) => {
  const escaped = escapeHtml(value);
  return escaped
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
};

const parseFrontMatter = (source) => {
  if (!source.startsWith("---")) {
    return { meta: {}, body: source };
  }

  const end = source.indexOf("\n---", 3);
  if (end === -1) {
    return { meta: {}, body: source };
  }

  const meta = {};
  const frontMatter = source.slice(3, end).trim();
  frontMatter.split(/\r?\n/).forEach((line) => {
    const separator = line.indexOf(":");
    if (separator === -1) return;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    meta[key] = value;
  });

  return { meta, body: source.slice(end + 4).trim() };
};

const renderBlocks = (markdown) => {
  const lines = markdown.split(/\r?\n/);
  const html = [];
  let paragraph = [];
  let list = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!list.length) return;
    html.push(`<ul>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
    list = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }

    const image = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (image) {
      flushParagraph();
      flushList();
      html.push(
        `<figure><img src="${escapeHtml(image[2])}" alt="${escapeHtml(image[1])}" loading="lazy" /><figcaption>${inlineMarkdown(image[1])}</figcaption></figure>`,
      );
      return;
    }

    if (trimmed.startsWith("## ")) {
      flushParagraph();
      flushList();
      html.push(`<h2>${inlineMarkdown(trimmed.slice(3))}</h2>`);
      return;
    }

    if (trimmed.startsWith("### ")) {
      flushParagraph();
      flushList();
      html.push(`<h3>${inlineMarkdown(trimmed.slice(4))}</h3>`);
      return;
    }

    if (trimmed.startsWith("- ")) {
      flushParagraph();
      list.push(trimmed.slice(2));
      return;
    }

    paragraph.push(trimmed);
  });

  flushParagraph();
  flushList();
  return html.join("");
};

const renderProject = (markdown) => {
  const { meta, body } = parseFrontMatter(markdown);
  const title = meta.title || "Untitled project";
  const year = meta.year ? `<p class="kicker">${inlineMarkdown(meta.year)} / ${inlineMarkdown(meta.type || "Project")}</p>` : "";
  const summary = meta.summary ? `<p>${inlineMarkdown(meta.summary)}</p>` : "";
  const cover = meta.cover
    ? `<img src="${escapeHtml(meta.cover)}" alt="${escapeHtml(title)} cover image" />`
    : "";

  return `
    <header class="project-hero">
      <div>
        ${year}
        <h1>${inlineMarkdown(title)}</h1>
        ${summary}
      </div>
      ${cover}
    </header>
    ${renderBlocks(body)}
  `;
};

const openProject = async (slug, updateHash = true) => {
  const source = projectSources[slug];
  if (!source) return;

  document.body.classList.add("viewing-project");
  detail.hidden = false;
  detailContent.innerHTML = "<p>Loading project...</p>";

  try {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Could not load ${source}`);
    }
    const markdown = await response.text();
    detailContent.innerHTML = renderProject(markdown);
    if (updateHash) {
      history.pushState(null, "", `#project/${slug}`);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    detailContent.innerHTML = `<p class="error">${escapeHtml(error.message)}</p>`;
  }
};

const showIndex = (updateHash = true) => {
  document.body.classList.remove("viewing-project");
  detail.hidden = true;
  detailContent.innerHTML = "";
  if (updateHash) {
    history.pushState(null, "", "#");
  }
};

document.querySelectorAll("[data-project]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    openProject(link.dataset.project);
  });
});

closeProject.addEventListener("click", (event) => {
  event.preventDefault();
  showIndex();
});

const syncRoute = () => {
  const match = window.location.hash.match(/^#project\/(.+)$/);
  if (match) {
    openProject(match[1], false);
  } else {
    showIndex(false);
  }
};

window.addEventListener("popstate", syncRoute);
window.addEventListener("hashchange", syncRoute);
syncRoute();
