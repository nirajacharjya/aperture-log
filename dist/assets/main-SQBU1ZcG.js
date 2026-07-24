import{n as e,t}from"./navbar-BE0pcXJT.js";import{d as n,h as r,l as i,n as a,r as o,s,t as c,u as l}from"./firestore-BjPrYuqs.js";var u=e((()=>{a(),o();var e=document.getElementById(`scroll-bar`),t=document.getElementById(`totop`);window.addEventListener(`scroll`,()=>{let n=document.documentElement,r=n.scrollTop/(n.scrollHeight-n.clientHeight)*100;e.style.width=r+`%`,t&&t.classList.toggle(`show`,n.scrollTop>500)}),t&&t.addEventListener(`click`,()=>{window.scrollTo({top:0,behavior:`smooth`})});var u=document.getElementById(`ticker`);u&&(u.innerHTML+=u.innerHTML);function d(e,t){return!e||!e.includes(`/upload/`)?e:e.replace(`/upload/`,`/upload/f_auto,q_auto,w_${t}/`)}async function f(){let e=document.getElementById(`home-gallery`),t=await s(n(r(c,`photos`),l(`createdAt`,`desc`),i(8)));e.innerHTML=``;let a=0;t.forEach(t=>{let n=t.data(),r=a<4,i=r?`eager`:`lazy`,o=r?` fetchpriority="high"`:``,s=d(n.image,400),c=document.createElement(`div`);c.className=`photo-tile`,c.innerHTML=`
    <a href="photography.html">
        <img src="${s}" alt="${n.title}" width="400" height="500"
            loading="${i}" decoding="async"${o}>

        <div class="tile-overlay">
            <span class="t-cat">${n.category?n.category.charAt(0).toUpperCase()+n.category.slice(1):``}</span>
        </div>
    </a>
`,e.appendChild(c),a++})}f()}));t(),u();