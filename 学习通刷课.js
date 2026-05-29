(function() {
    'use strict';
    console.log("=== 学习通【强力后台版】脚本已启动 ===");

    // ================= 核心：突破后台暂停限制 =================
    // 1. 破解隐藏页面暂停：强制让系统认为页面永远是可见的
    Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true });
    Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });

    // 2. 拦截所有可能触发暂停的事件（比如失焦、切窗口）
    const blockEvents = ['visibilitychange', 'blur', 'webkitvisibilitychange', 'mozvisibilitychange'];
    blockEvents.forEach(eventType => {
        window.addEventListener(eventType, (e) => e.stopImmediatePropagation(), true);
        document.addEventListener(eventType, (e) => e.stopImmediatePropagation(), true);
    });

    // ================= 自动化播放与切集逻辑 =================
    const timer = setInterval(() => {
        try {
            // 穿透两层 iframe 寻找视频
            const iframe1 = document.getElementById('iframe') || document.querySelector('iframe');
            if (!iframe1) return;
            
            const doc1 = iframe1.contentWindow.document;
            const iframe2 = doc1.querySelector('iframe') || doc1.querySelector('.ans-attach-online-video');
            if (!iframe2) return;
            
            const doc2 = iframe2.contentWindow.document;
            const video = doc2.getElementById('video_html5_api') || doc2.querySelector('video');

            if (video) {
                // 如果视频被系统暂停了，直接强制拉起来播放
                if (video.paused && !video.ended) {
                    video.muted = true; // 静音防拦截
                    video.play().catch(err => {});
                    console.log("已在后台强行拉起播放...");
                }

                // 如果当前视频放完了，切下一集
                if (video.ended) {
                    console.log("当前视频结束，准备切集...");
                    playNext();
                }
            }
        } catch (e) {
            // 忽略由于未加载完成导致的报错
        }
    }, 3000); // 缩短检查间隔到 3 秒，防止卡顿

    function playNext() {
        const posList = document.querySelectorAll('.posCatalog_select, .posCatalog_active, .jobUnfinish');
        let currentIdx = -1;

        for (let i = 0; i < posList.length; i++) {
            if (posList[i].classList.contains('posCatalog_active') || posList[i].parentElement.classList.contains('posCatalog_active')) {
                currentIdx = i;
                break;
            }
        }

        if (currentIdx !== -1 && currentIdx + 1 < posList.length) {
            const nextNode = posList[currentIdx + 1];
            const clickTarget = nextNode.querySelector('.posCatalog_name') || nextNode;
            console.log("正在后台为您跳转到:", clickTarget.textContent.trim());
            clickTarget.click();
        } else {
            console.log("全课播放完毕或未找到后续任务点。");
            clearInterval(timer);
        }
    }
})();
