export const THEME_KEY = "foodspin-theme";

/** Inline script that runs before first paint (see layout.tsx) so a saved Light/Dark choice never flashes. */
export const themeBootScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
