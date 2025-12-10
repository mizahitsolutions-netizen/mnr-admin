const slugify = (str = "") =>
  str
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")   // spaces & underscores -> -
    .replace(/[^\w-]+/g, "")   // remove non-word chars
    .replace(/--+/g, "-");     // collapse multiple dashes

export default slugify;
