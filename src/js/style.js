function direction() {
    if (innerHeight > innerWidth) {
        alert("请使用横屏");
        setTimeout(direction, 50);
    } else {
        // 导包css
        let link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "../css/style.css";
        document.head.appendChild(link);
    }
}

window.addEventListener("load", direction);