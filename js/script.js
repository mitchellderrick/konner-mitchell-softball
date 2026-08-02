document.addEventListener("DOMContentLoaded", function () {
    const yearElement = document.getElementById("currentYear");

    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
});
