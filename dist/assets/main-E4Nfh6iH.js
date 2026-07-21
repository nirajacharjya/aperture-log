import{a as e,c as t,d as n,f as r,i,m as a,r as o,t as s,u as c,y as l}from"./navbar-DmpNDR9H.js";var u=l((()=>{i(),e();var s=document.getElementById(`scroll-bar`),l=document.getElementById(`totop`);window.addEventListener(`scroll`,()=>{let e=document.documentElement,t=e.scrollTop/(e.scrollHeight-e.clientHeight)*100;s.style.width=t+`%`,l&&l.classList.toggle(`show`,e.scrollTop>500)}),l&&l.addEventListener(`click`,()=>{window.scrollTo({top:0,behavior:`smooth`})});var u=document.getElementById(`ticker`);u&&(u.innerHTML+=u.innerHTML);async function d(){let e=document.getElementById(`home-gallery`),i=await t(r(a(o,`photos`),n(`createdAt`,`desc`),c(6)));e.innerHTML=``,i.forEach(t=>{let n=t.data(),r=document.createElement(`div`);r.className=`photo-tile`,r.innerHTML=`
    <a href="photography.html">
        <img src="${n.image}" alt="${n.title}" loading="lazy">

        <div class="tile-overlay">
            <span class="t-cat">${n.category?n.category.charAt(0).toUpperCase()+n.category.slice(1):``}</span>
        </div>
    </a>
`,e.appendChild(r)})}d()}));s(),u();