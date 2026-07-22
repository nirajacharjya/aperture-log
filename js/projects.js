const bar = document.getElementById("scroll-bar");

window.addEventListener("scroll", () => {
    const h = document.documentElement;
    bar.style.width =
        (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100 + "%";
});

const PROJECTS = [
{
    title: "Aperture Log",

    status: "Live",

    description:
        "A full-stack photography and blogging platform where users can share photographs, publish stories, manage their profiles, and explore creative work. Built with JavaScript, Firebase, and Vite.",

    tags: [
        "JavaScript",
        "Firebase",
        "Vite"
    ],

    github: "https://github.com/nirajacharjya/aperture-log",

    live: "https://aperture-log-65415.web.app/"
}
];

const container = document.getElementById("project-list");

document.getElementById("result-count").textContent = PROJECTS.length;

PROJECTS.forEach((project, index) => {

    const row = document.createElement("div");

    row.className = "proj-row";

    row.innerHTML = `

<div class="proj-index">
${String(index + 1).padStart(2, "0")}
</div>

<div class="proj-main">

    <div class="proj-top-row">

        <h3 class="proj-title">
            ${project.title}
        </h3>

        <span class="status-pill status-live">
            ${project.status}
        </span>

    </div>

    <p class="proj-desc">
        ${project.description}
    </p>

    <div class="tag-row">

        ${project.tags.map(tag => `
            <span class="tag">${tag}</span>
        `).join("")}

    </div>

</div>

<div class="proj-links">

    <a
        class="proj-link-btn"
        href="${project.github}"
        target="_blank"
        rel="noopener noreferrer">

        GitHub →

    </a>

    <a
        class="proj-link-btn"
        href="${project.live}"
        target="_blank"
        rel="noopener noreferrer">

        Live Demo →

    </a>

</div>

`;

    container.appendChild(row);

});