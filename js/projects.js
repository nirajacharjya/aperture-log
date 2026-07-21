const bar = document.getElementById("scroll-bar");

window.addEventListener("scroll", () => {

    const h = document.documentElement;

    bar.style.width =
        (h.scrollTop/(h.scrollHeight-h.clientHeight))*100+"%";

});

const PROJECTS=[

{

title:"Aperture Log",

status:"Featured Project",

image:"images/image2.png",

description:
"A modern photography and blogging platform where users can upload photos, publish articles, share stories, comment, react and explore beautiful photography. Built completely from scratch.",

tags:[
"HTML",
"CSS",
"JavaScript",
"Firebase",
"Firestore",
"Cloudinary",
"Google Analytics"
],

github:"https://github.com/nirajacharjya/aperture-log",

live:"https://aperture-log-65415.web.app"

}

];

const container=document.getElementById("project-list");

document.getElementById("result-count").textContent=PROJECTS.length;

PROJECTS.forEach(project=>{

const card=document.createElement("div");

card.className="project-card";

card.innerHTML=`

<img class="project-image"
src="${project.image}">

<div class="project-content">

<span class="status-pill status-live">
${project.status}
</span>

<h2 class="project-title">
${project.title}
</h2>

<p class="project-desc">
${project.description}
</p>

<div class="tag-row">

${project.tags.map(tag=>`
<span class="tag">${tag}</span>
`).join("")}

</div>

<div class="project-links">

<a class="project-btn"
href="${project.github}"
target="_blank">

GitHub →

</a>

<a class="project-btn primary-btn"
href="${project.live}"
target="_blank">

Live Website →

</a>

</div>

</div>

`;

container.appendChild(card);

});