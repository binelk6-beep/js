//现在的版本相比001，是可以跳章节了，但是还是在一个章节末尾不能跳到下一个章节的开头，可能跳到最新的未播放视频

(function() {
    'use strict';
    console.log("=== 学习通【严格顺播防乱跳版】已启动 ===");

    // ================= 核心：突破后台暂停限制 =================
    Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true });
    Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });
    const blockEvents = ['visibilitychange', 'blur', 'webkitvisibilitychange', 'mozvisibilitychange'];
    blockEvents.forEach(eventType => {
        window.addEventListener(eventType, (e) => e.stopImmediatePropagation(), true);
        document.addEventListener(eventType, (e) => e.stopImmediatePropagation(), true);
    });

    // ================= 状态控制（防止死循环） =================
    let isSwitching = false; // 跳转冷却锁
    
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
                // 强制拉起
                if (video.paused && !video.ended && !isSwitching) {
                    video.muted = true; 
                    video.play().catch(err => {});
                    console.log("强行拉起播放...");
                }

                // 判断视频是否结束 (兼容某些时候 ended 属性不触发的情况)
                const isEnded = video.ended || (video.duration > 0 && (video.duration - video.currentTime < 1.5));

                if (isEnded && !isSwitching) {
                    console.log("视频播放结束，触发顺播逻辑...");
                    isSwitching = true; // 开启冷却
                    playNext();
                    
                    // 冷却 15 秒，给页面充分的时间加载下一个视频
                    setTimeout(() => {
                        isSwitching = false;
                    }, 15000);
                }
            }
        } catch (e) {}
    }, 3000); 

    // ================= 核心：严格顺序寻找下一个 =================
    function playNext() {
        // 1. 只获取“右侧当前列表”的任务点，绝对不碰左侧大标题
        const posList = Array.from(document.querySelectorAll('.posCatalog_select'));
        if (posList.length === 0) return;

        let currentIdx = -1;
        
        // 2. 找到当前正在播放的视频索引
        for (let i = 0; i < posList.length; i++) {
            if (posList[i].classList.contains('posCatalog_active') || 
                (posList[i].parentElement && posList[i].parentElement.classList.contains('posCatalog_active'))) {
                currentIdx = i;
                break;
            }
        }

        // 3. 如果找到了当前索引，严格从它的【下一个】开始顺延找
        if (currentIdx !== -1) {
            for (let i = currentIdx + 1; i < posList.length; i++) {
                const node = posList[i];
                const text = node.textContent.trim();

                // 过滤：跳过测验、作业、讨论
                if (text.includes('测验') || text.includes('作业') || text.includes('讨论')) {
                    console.log(`跳过非视频节点: ${text.substring(0, 10)}...`);
                    continue;
                }

                // 过滤：跳过已完成
                if (text.includes('已完成') || node.querySelector('.icon_Completed')) {
                    continue;
                }

                // 找到第一个合法的、未完成的视频，直接点击！
                let clickTarget = node.querySelector('.posCatalog_name') || node;
                console.log(`>>> 顺播成功，跳转至: [${text.substring(0, 20)}]`);
                clickTarget.click();
                return; // 结束函数
            }
        }

        // 4. 如果当前列表已经播到了尽头，去左侧找下一个“大章节”
        console.log("当前列表已播完，尝试进入下一个大章节...");
        
        // 找左侧带有未完成图标的大章节 (icon_WS 通常是左侧章节未完成的标志)
        const leftChapters = document.querySelectorAll('a');
        for (let chapter of leftChapters) {
            // 必须是未完成的章节，且不能被隐藏
            if (chapter.querySelector('.icon_WS') || chapter.innerHTML.includes('jobUnfinish')) {
                let text = chapter.textContent.trim();
                if (text.includes('测验') || text.includes('作业')) continue; // 跳过测验章
                
                console.log(`>>> 进入新章节: [${text.substring(0, 20)}]`);
                chapter.click();
                return;
            }
        }

        // 5. 如果既没有下一个视频，也没有下一个大章节，彻底结束
        console.log("🎉 整个课程已全部播放完毕！脚本自动停止。");
        clearInterval(timer);
    }
})();
