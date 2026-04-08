// DONT PUT NODE CODE IN HERE FRONTEND ONLY
// Dark mode
function applyTheme(event) {
    if (event.matches) {
        document.body.classList.add("dark-theme");
    } else {
        document.body.classList.remove("dark-theme");
    }
}

window.addEventListener('load', () => {
    const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)"); // get system preference

    applyTheme(prefersDarkMode);

    prefersDarkMode.addEventListener("change", applyTheme); // checks if browser preference changes
});