import{A as e,i as t,t as n}from"./navbar-DKAsSNUJ.js";import{d as r,h as i,l as a,n as o,r as s,s as c,t as l,u}from"./firestore-Dnk4qTg2.js";var d=e((()=>{t(),o(),s();var e=document.getElementById(`scroll-bar`),n=document.getElementById(`totop`);window.addEventListener(`scroll`,()=>{let t=document.documentElement,r=t.scrollTop/(t.scrollHeight-t.clientHeight)*100;e.style.width=r+`%`,n&&n.classList.toggle(`show`,t.scrollTop>500)}),n&&n.addEventListener(`click`,()=>{window.scrollTo({top:0,behavior:`smooth`})});var d=document.getElementById(`ticker`);d&&(d.innerHTML+=d.innerHTML);async function f(){let e=document.getElementById(`home-gallery`),t=await c(r(i(l,`photos`),u(`createdAt`,`desc`),a(8)));e.innerHTML=``,t.forEach(t=>{let n=t.data(),r=document.createElement(`div`);r.className=`photo-tile`,r.innerHTML=`
    <a href="photography.html">
        <img src="${n.image}" alt="${n.title}" loading="lazy">

        <div class="tile-overlay">
            <span class="t-cat">${n.category?n.category.charAt(0).toUpperCase()+n.category.slice(1):``}</span>
        </div>
    </a>
`,e.appendChild(r)})}f()}));n(),d();