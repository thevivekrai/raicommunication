document.addEventListener("DOMContentLoaded", () => {
  const navbar = document.querySelector(".navbar");
  const navLinks = document.querySelectorAll(".navbar-collapse .nav-link");

  const handleScroll = () => {
    if (window.scrollY > 20) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  };

  handleScroll();
  window.addEventListener("scroll", handleScroll);

  const navbarCollapse = document.querySelector(".navbar-collapse");
  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (navbarCollapse.classList.contains("show")) {
        const collapseInstance = bootstrap.Collapse.getInstance(navbarCollapse) || new bootstrap.Collapse(navbarCollapse);
        collapseInstance.hide();
      }
    });
  });
});
