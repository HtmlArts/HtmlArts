const SVG_NS = "http://www.w3.org/2000/svg";

export const PAGE_TEMPLATES = [
  { name: "Editorial", label: "Leaf study", color: "#d9bd8e", ink: "#76583d", art: "leaf" },
  { name: "Swiss Grid", label: "Data in motion", color: "#d9b17a", ink: "#8b6747", art: "chart" },
  { name: "Botanical", label: "Mountain light", color: "#8fa28a", ink: "#76583d", art: "mountain" },
  { name: "Geometric", label: "Orbit", color: "#9fb4a6", ink: "#718b80", art: "orbit" },
  { name: "Comic", label: "A little character", color: "#e9c15f", ink: "#76583d", art: "comic" },
  { name: "Watercolour", label: "Soft waves", color: "#9fb4ae", ink: "#648c8a", art: "waves" },
];

const THEMES = {
  Editorial: { background: "#fbf8f1", ink: "#33271f", accent: "#795234", font: "Georgia, serif" },
  "Swiss Grid": { background: "#f7f6f1", ink: "#343b36", accent: "#8b6747", font: "Arial, sans-serif" },
  Botanical: { background: "#f5f5e9", ink: "#38473b", accent: "#718a70", font: "Georgia, serif" },
  Geometric: { background: "#f0f3f0", ink: "#33443f", accent: "#718b80", font: "Arial, sans-serif" },
  Comic: { background: "#fff8e4", ink: "#433226", accent: "#b86f38", font: "Trebuchet MS, sans-serif" },
  Watercolour: { background: "#f1f7f5", ink: "#314541", accent: "#648c8a", font: "Georgia, serif" },
};

export function getPageTemplate(name) {
  return PAGE_TEMPLATES.find((template) => template.name === name) ?? PAGE_TEMPLATES[0];
}

export function getPageTheme(name) {
  return THEMES[name] ?? THEMES.Editorial;
}

export function renderTemplateGallery(document, listElement) {
  listElement.replaceChildren();
  const fragment = document.createDocumentFragment();
  for (const template of PAGE_TEMPLATES) {
    const card = document.createElement("article");
    card.className = "template-card";

    const select = document.createElement("button");
    select.type = "button";
    select.className = "template-select";
    select.dataset.templateSelect = template.name;
    select.setAttribute("aria-label", `Use ${template.name} template`);

    const preview = document.createElement("span");
    preview.className = "template-preview";
    preview.append(createArtwork(document, template));
    select.append(preview);

    const details = document.createElement("span");
    details.className = "template-details";
    const name = document.createElement("strong");
    name.textContent = `${template.name} Page`;
    const category = document.createElement("span");
    category.className = "template-tag";
    category.textContent = "Page art";
    const more = document.createElement("span");
    more.className = "template-more";
    more.textContent = "Use this style →";
    details.append(name, category, more);
    select.append(details);
    card.append(select);
    fragment.append(card);
  }
  listElement.append(fragment);
}

function createArtwork(document, template) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 350 250");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  const background = svgElement(document, "rect", {
    width: "350",
    height: "250",
    rx: "12",
    fill: "#f4ead8",
  });
  svg.append(background);

  if (template.art === "leaf") {
    svg.append(
      svgElement(document, "path", {
        d: "M75 210Q100 65 280 42q-15 145-180 168Z",
        fill: template.color,
        stroke: template.ink,
        "stroke-width": "3",
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
      }),
      svgElement(document, "path", {
        d: "M76 210 255 64M120 170l-5-53m40 23 2-48m19 22 31-34m-85 99-45-6m79-21 42-35",
        fill: "none",
        stroke: template.ink,
        "stroke-width": "3",
        "stroke-linecap": "round",
      }),
    );
  } else if (template.art === "chart") {
    svg.append(
      svgElement(document, "path", {
        d: "M48 215h260M68 205v-38h42v38m20 0v-75h42v75m20 0V99h42v106m20 0V65h42v140",
        fill: template.color,
        stroke: template.ink,
        "stroke-width": "3",
      }),
      svgElement(document, "path", {
        d: "m68 145 70-28 56-37 72-28 28-5",
        fill: "none",
        stroke: "#a66c37",
        "stroke-width": "6",
      }),
    );
  } else if (template.art === "mountain") {
    svg.append(
      svgElement(document, "circle", { cx: "220", cy: "70", r: "24", fill: "#e8bd6d" }),
      svgElement(document, "path", {
        d: "M28 190 115 82l55 68 48-88 105 128Z",
        fill: "#b8b29b",
        stroke: template.ink,
        "stroke-width": "3",
        "stroke-linejoin": "round",
      }),
      svgElement(document, "path", {
        d: "M28 192q150-42 295 0v35H28Z",
        fill: template.color,
      }),
    );
  } else if (template.art === "orbit") {
    for (const rotation of ["0", "60", "120"]) {
      svg.append(
        svgElement(document, "ellipse", {
          cx: "175",
          cy: "125",
          rx: "125",
          ry: "48",
          transform: `rotate(${rotation} 175 125)`,
          fill: "none",
          stroke: template.ink,
          "stroke-width": "5",
        }),
      );
    }
    svg.append(svgElement(document, "circle", { cx: "175", cy: "125", r: "13", fill: "#d5a65d" }));
  } else if (template.art === "comic") {
    svg.append(
      svgElement(document, "path", {
        d: "M82 187q-18-90 50-142 50-38 94-3-49 3-53 58-4 59-61 104-17 12-30-17Z",
        fill: template.color,
        stroke: template.ink,
        "stroke-width": "3",
        "stroke-linejoin": "round",
      }),
      svgElement(document, "path", {
        d: "M75 205q80 18 165-2",
        fill: "none",
        stroke: "#b98d55",
        "stroke-width": "5",
      }),
    );
  } else {
    svg.append(
      svgElement(document, "path", {
        d: "M25 130q55-65 110 0t110 0 75 0v100H25Z",
        fill: template.color,
      }),
      svgElement(document, "path", {
        d: "M25 165q55-65 110 0t110 0 75 0",
        fill: "none",
        stroke: template.ink,
        "stroke-width": "8",
      }),
      svgElement(document, "path", {
        d: "M25 197q55-65 110 0t110 0 75 0",
        fill: "none",
        stroke: "#d5e0d6",
        "stroke-width": "7",
      }),
    );
  }
  return svg;
}

function svgElement(document, name, attributes) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [attribute, value] of Object.entries(attributes)) element.setAttribute(attribute, value);
  return element;
}
