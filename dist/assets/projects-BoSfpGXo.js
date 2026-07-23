import{A as e,t}from"./navbar-DKAsSNUJ.js";var n=e((()=>{var e=document.getElementById(`scroll-bar`);window.addEventListener(`scroll`,()=>{let t=document.documentElement;e.style.width=t.scrollTop/(t.scrollHeight-t.clientHeight)*100+`%`});var t=[{title:`Aperture Log`,status:`Live`,description:`A full-stack photography and blogging platform where users can share photographs, publish stories, manage their profiles, and explore creative work. Built with JavaScript, Firebase, and Vite.`,tags:[`JavaScript`,`Firebase`,`Vite`],github:`https://github.com/nirajacharjya/aperture-log`,live:`https://aperture-log-65415.web.app/`}],n=document.getElementById(`project-list`);document.getElementById(`result-count`).textContent=t.length,t.forEach((e,t)=>{let r=document.createElement(`div`);r.className=`proj-row`,r.innerHTML=`

<div class="proj-index">
${String(t+1).padStart(2,`0`)}
</div>

<div class="proj-main">

    <div class="proj-top-row">

        <h3 class="proj-title">
            ${e.title}
        </h3>

        <span class="status-pill status-live">
            ${e.status}
        </span>

    </div>

    <p class="proj-desc">
        ${e.description}
    </p>

    <div class="tag-row">

        ${e.tags.map(e=>`
            <span class="tag">${e}</span>
        `).join(``)}

    </div>

</div>

<div class="proj-links">

    <a
        class="proj-link-btn"
        href="${e.github}"
        target="_blank"
        rel="noopener noreferrer">

        GitHub →

    </a>

    <a
        class="proj-link-btn"
        href="${e.live}"
        target="_blank"
        rel="noopener noreferrer">

        Live Demo →

    </a>

</div>

`,n.appendChild(r)})}));t(),n();