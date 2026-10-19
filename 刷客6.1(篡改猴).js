// ==UserScript==
// @name         学习通自动刷课（强力后台版 v6.1）
// @namespace    http://tampermonkey.net/
// @version      6.1
// @description  极速秒播，底层黑科技反制后台休眠
// @author       You
// @match        *://*.chaoxing.com/*
// @match        *://*.edu.cn/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';
    console.log("=== 学习通【强力后台版 v6.1】已启动 ===");

    // ================= 核心 1：突破后台隐藏限制 =================
    Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true });
    Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });
    const blockEvents = ['visibilitychange', 'blur', 'webkitvisibilitychange', 'mozvisibilitychange'];
    blockEvents.forEach(eventType => {
        window.addEventListener(eventType, (e) => e.stopImmediatePropagation(), true);
        document.addEventListener(eventType, (e) => e.stopImmediatePropagation(), true);
    });

    // ================= 核心 2：防止 requestAnimationFrame 被后台暂停 =================
    window.requestAnimationFrame = function(callback) { return setTimeout(callback, 16); };
    window.cancelAnimationFrame = function(id) { clearTimeout(id); };

    // ================= 核心 3：音频保活黑科技 =================
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            const ctx = new AudioContext();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            gainNode.gain.value = 0.001; // 极低音量，几乎听不到
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            oscillator.start();
            console.log("🎵 音频保活已启动...");
        }
    } catch(e) {}

    let noVideoCount = 0;
    let isClickingNext = false;

    const timer = setInterval(() => {
        try {
            const iframe1 = document.getElementById('iframe') || document.querySelector('iframe');
            if (!iframe1) return;

            const doc1 = iframe1.contentWindow.document;
            const iframe2 = doc1.querySelector('iframe') || doc1.querySelector('.ans-attach-online-video');

            let video = null;
            if (iframe2) {
                const doc2 = iframe2.contentWindow.document;
                video = doc2.getElementById('video_html5_api') || doc2.querySelector('video');
            } else {
                video = doc1.querySelector('video');
            }

            if (!video) {
                noVideoCount++;
                if (noVideoCount >= 5 && !isClickingNext) {
                    console.log("⏳ 长时间无视频，尝试点击下一个...");
                    playNext();
                }
                return;
            }

            noVideoCount = 0;
            isClickingNext = false;

            // ================= 核心 4：拦截 pause 事件，强行拉起 =================
            if (!video.hasAttribute('data-hooked')) {
                video.setAttribute('data-hooked', 'true');
                video.addEventListener('pause', () => {
                    if (!video.ended) {
                        setTimeout(() => {
                            video.muted = true;
                            video.play().catch(e=>{});
                        }, 300);
                    }
                });
                // 监听播放结束
                video.addEventListener('ended', () => {
                    if (!isClickingNext) {
                        console.log("🏁 视频 ended 事件触发，瞬间跳转...");
                        isClickingNext = true;
                        playNext();
                        setTimeout(() => { isClickingNext = false; }, 8000);
                    }
                });
            }

            // 露头就打：只要视频暂停了，立刻强推
            if (video.paused && !video.ended) {
                video.muted = true;
                video.play().catch(err => {});

                const doc = video.ownerDocument;
                const btns = doc.querySelectorAll('.vjs-big-play-button, .xgplayer-start, .xgplayer-play, .vjs-play-control, .prism-big-play-btn');
                btns.forEach(btn => {
                    if(btn && btn.offsetParent !== null) btn.click();
                });
            }

            // 极速结束判定
            const isEnded = video.ended || (video.duration > 0 && (video.currentTime / video.duration > 0.995));

            if (isEnded && !isClickingNext) {
                console.log("🏁 进度判定播完，瞬间跳转...");
                isClickingNext = true;
                playNext();
                setTimeout(() => { isClickingNext = false; }, 8000);
            }
        } catch (e) {}
    }, 1000);

    function playNext() {
        const posList = Array.from(document.querySelectorAll('.posCatalog_select, .posCatalog_name, [class*="posCatalog"]'));
        if (posList.length === 0) return;

        let startIdx = 0;
        for (let i = 0; i < posList.length; i++) {
            if (posList[i].classList.contains('posCatalog_active') ||
                (posList[i].parentElement && posList[i].parentElement.classList.contains('posCatalog_active')) ||
                posList[i].style.color === 'rgb(255, 110, 0)') {
                startIdx = i + 1;
                break;
            }
        }

        let targetNode = null;
        let targetText = "";

        for (let i = startIdx; i < posList.length; i++) {
            const node = posList[i];
            const text = node.textContent.trim();
            const isUnfinished = node.innerHTML.includes('jobUnfinish') || node.querySelector('.icon_WS') || node.innerHTML.includes('未完成');
            const isExamOrDiscuss = text.includes('测验') || text.includes('作业') || text.includes('讨论');

            if (isUnfinished && !isExamOrDiscuss && text.length > 3) {
                targetNode = node;
                targetText = text;
                break;
            }
        }

        if (targetNode) {
            let clickTarget = targetNode.querySelector('.posCatalog_name') || targetNode;
            console.log(`>>> 极速跳转至: [${targetText.substring(0, 20).replace(/[\r\n]/g, '')}]`);

            try {
                const evt = new MouseEvent('click', { view: window, bubbles: true, cancelable: true });
                clickTarget.dispatchEvent(evt);
            } catch(e) {}
            clickTarget.click();
        } else {
            for (let i = 0; i < posList.length; i++) {
                 const node = posList[i];
                 const text = node.textContent.trim();
                 const isUnfinished = node.innerHTML.includes('jobUnfinish') || node.querySelector('.icon_WS') || node.innerHTML.includes('未完成');
                 const isExamOrDiscuss = text.includes('测验') || text.includes('作业') || text.includes('讨论');

                 if (isUnfinished && !isExamOrDiscuss && text.length > 3) {
                     console.log(`>>> 全局极速跳转至: [${text.substring(0, 20).replace(/[\r\n]/g, '')}]`);
                     const clickTarget = node.querySelector('.posCatalog_name') || node;
                     try {
                        const evt = new MouseEvent('click', { view: window, bubbles: true, cancelable: true });
                        clickTarget.dispatchEvent(evt);
                     } catch(e) {}
                     clickTarget.click();
                     return;
                 }
            }
            console.log("🎉 全课所有未完成任务点已播放完毕，脚本停止。");
            clearInterval(timer);
        }
    }
})();
