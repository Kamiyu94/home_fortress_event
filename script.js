// 等待 HTML 內容加載完成
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. 獲取所有 HTML 元素 ---
    const screens = {
        draw: document.getElementById('screen-draw'),
        loading: document.getElementById('screen-loading'),
        result: document.getElementById('screen-result'),
    };
    const drawButton = document.getElementById('draw-button');
    const drawButtonText = document.getElementById('draw-button-text');
    const loadingText = document.getElementById('loading-text');
    const promptText = document.querySelector('.prompt-text'); // 獲取提示文字
    
    const resultContent = document.getElementById('result-content');
    const choiceButtonsContainer = document.getElementById('choice-buttons');
    const controlButtonsContainer = document.getElementById('control-buttons');
    
    const btnContinue = document.getElementById('btn-continue');
    const btnReset = document.getElementById('btn-reset');

    // --- 2. 事件卡片數據 ---
    // (type: 'outcome' = 直接結果, 'choice' = 需選擇)
    // (formatEffect: 用來格式化文字的輔助函數)
    const formatEffect = (text) => {
        return text.replace(/(\+[\d\.]+\s*點)/g, '<span class="text-green">$1</span>')
                   .replace(/(-[\d\.]+\s*點)/g, '<span class="text-red">$1</span>')
                   .replace(/損失\s*(.*?)(?=\s*。|$|,)/g, '<span class="text-red">損失 $1</span>')
                   .replace(/(獲得|換取)\s*「(.*?)」/g, '$1「<span class="text-blue-bold">$2</span>」')
                   // 【修改】讓「支付」也顯示為紅色
                   .replace(/(交出|支付)\s*「(.*?)」/g, '<span class="text-red">$1「<span class="text-blue-bold">$2</span>」</span>');
    };
    
    let cardData = {
        chance: [
            // (機會牌庫內容不變)
            { id: 'C1', title: '政府物資配給', description: '國軍/區公所冒險運來一批物資，你們幸運地領到了。', type: 'outcome', effect: '獲得「水 +10L」與「米 +5kg」。' },
            { id: 'C2', title: '醫療資源抵達', description: '無國界醫生或友軍醫療團設立了臨時醫療站。', type: 'outcome', effect: '全組 健康點數 +6。若有特殊身份者，該成員額外 +3 點。' },
            { id: 'C3', title: '幸運的發現', description: '你在巡視時，發現一間被遺棄的雜貨店還剩下一些有用的東西。', type: 'outcome', effect: '獲得「罐頭 x5」與「電池 x10」。' },
            { id: 'C4', title: '可靠的情報', description: '你的收音機接收到友軍的安全廣播，提振了士氣。', type: 'outcome', effect: '全組 健康點數 +3。(若無收音機則無效)' },
            { id: 'C5', title: '意外的潔淨水源', description: '你發現一處未受污染的隱藏水源（例如：未被發現的井）。', type: 'outcome', effect: '獲得「水 +20L」。' },
            { id: 'C6', title: '物資腐敗 (陷阱)', description: '你打開一箱存糧，發現因為儲存不當，已經全部腐敗發霉。', type: 'outcome', effect: '損失 20% 的米或乾糧。' },
            { id: 'C7', title: '假情報 (陷阱)', description: '你們聽到假消息，以為有空投物資，冒險外出卻一無所獲。', type: 'outcome', effect: '全組 健康點數 -3。並額外 損失「水 -1L」與「乾糧 -1包」。' },
        ],
        fate: [
            // 【★ 已修改 ★】
            { id: 'F1', title: '第五縱隊襲擊', description: '合作者對你們的住所發動攻擊，雖然被擊退，但造成了損失。', type: 'outcome', effect: '全組 健康點數 -6。並 損失「30% 的水與30% 的糧食」。' },
            
            // (F2, F3, F4, F5, F6 不變)
            { id: 'F2', title: '鄰居搶食', description: '斷糧的鄰居破門而入，在混亂中搶走了你們的食物。', type: 'outcome', effect: '損失「米 x5kg」與「罐頭 x10」。(若有居家強固，損失減半)。' },
            { id: 'F3', title: '第五縱隊縱火', description: '附近發生縱火，濃煙與恐慌造成了嚴重壓力。', type: 'outcome', effect: '全組 健康點數 -3。' },
            { id: 'F4', title: '衛生危機', description: '由於廢棄物處理不當，組內爆發了傳染病。', type: 'outcome', effect: '全組 健康點數 -6。(若有準備「漂白水/消毒用品」，則改為 -2 點)。' },
            { id: 'F5', title: '精神崩潰', description: '長期的壓力下，一名成員精神狀況不穩，歇斯底里地破壞了物品。', type: 'outcome', effect: '損失「糧食」一人份。全組 健康點數 -3。(若有準備「無電娛樂用品」，可豁免)。' },
            { id: 'F6', title: '意外的轉折', description: '敵軍的空襲剛好炸開了附近無人銀行的金庫，你冒險撿到一些可用物資。', type: 'outcome', effect: '獲得「現金 10 萬」。' },
            
            // 【★ 已修改 ★】
            { id: 'F7', title: '絕望的求助者', description: '一位帶著嬰兒的母親敲門，乞求你們給她一些食物與水。', type: 'choice',
                choices: [
                    { text: '幫助她', effect: '交出「一個人七天份的糧食與水」。全組 健康點數 -2 (因失去物資的焦慮)。' },
                    { text: '拒絕她', effect: '全組 健康點數 -6 (因巨大的心理壓力與罪惡感)。' }
                ]
            },
            // 【★ 已修改 ★】
            { id: 'F8', title: '黑市商人', description: '一個黑市商人路過，他願意交換物資，但只收現金。', type: 'choice',
                choices: [
                    { text: '交易 (需有現金)', effect: '支付「20,000 現金」。換取「四個人一週的糧食與水」或「其他想要的物品」。(若無現金則無法交易)' },
                    { text: '拒絕交易', effect: '沒有任何變化。' }
                ]
            }
        ]
    };

    // --- 3. 牌庫狀態 ---
    let mainDecks = {};
    let discardPiles = {};
    let isDrawing = false; // 防止重複點擊
    let flashInterval; // 閃動動畫計時器
    let determinedDeck = null; // 儲存第一階段抽到的牌庫 (chance 或 fate)

    // --- 4. 核心功能 ---

    // 初始化/重置牌庫
    function resetDecks() {
        mainDecks.chance = JSON.parse(JSON.stringify(cardData.chance));
        mainDecks.fate = JSON.parse(JSON.stringify(cardData.fate));
        discardPiles.chance = [];
        discardPiles.fate = [];
        console.log("牌庫已重置");
    }

    // 切換畫面
    function switchScreen(screenName) {
        Object.values(screens).forEach(screen => screen.classList.remove('active'));
        screens[screenName].classList.add('active');
    }

    // 開始待機閃動
    function startFlashing() {
        let isGreen = true;
        flashInterval = setInterval(() => {
            if (isGreen) {
                drawButtonText.textContent = '機會';
                drawButton.className = 'draw-button-container green';
            } else {
                drawButtonText.textContent = '命運';
                drawButton.className = 'draw-button-container red';
            }
            isGreen = !isGreen;
        }, 800); // 待機閃動速度
    }

    // 停止閃動
    function stopFlashing() {
        clearInterval(flashInterval);
    }

    // 執行抽牌動畫 (固定 1.5 秒)
    function playDrawAnimation() {
        stopFlashing();
        promptText.textContent = '(抽取中...)'; // 更新提示文字

        let speed = 50; // 高速閃動的幀率 (50ms)
        let totalAnimationTime = 1500; // 總動畫時間 1.5 秒
        let isGreen = Math.random() < 0.5;
        let animationTimeout;

        // 1. 高速閃動階段 (會一直跑到被下面的 setTimeout 停止)
        function fastFlash() {
            if (isGreen) {
                drawButtonText.textContent = '機會';
                drawButton.className = 'draw-button-container green';
            } else {
                drawButtonText.textContent = '命運';
                drawButton.className = 'draw-button-container red';
            }
            isGreen = !isGreen; // 為下一幀做準備
            animationTimeout = setTimeout(fastFlash, speed);
        }

        // 立即開始閃動
        fastFlash();

        // 2. 設定一個計時器，在 1.5 秒後「強制停止」
        setTimeout(() => {
            
            // 3. 停止高速閃動
            clearTimeout(animationTimeout);

            // 4. 決定最終結果
            // 因為 isGreen 在 fastFlash 最後被翻轉了，
            // 所以當前 isGreen 的「相反」才是畫面上顯示的。
            const finalDeck = isGreen ? 'fate' : 'chance';
            const deckName = finalDeck === 'chance' ? '機會' : '命運';
            const colorClass = finalDeck === 'chance' ? 'green' : 'red';
            
            // 5. 強制設定最終畫面 (防止閃爍)
            drawButtonText.textContent = deckName;
            drawButton.className = `draw-button-container ${colorClass}`;

            // 6. 設定狀態，等待第二次點擊
            determinedDeck = finalDeck; 
            promptText.innerHTML = `您抽中了 <span class="deck-name ${colorClass}">${deckName}</span>！<br>請再次點擊上方區域抽牌`;
            isDrawing = false; // 允許第二次點擊

        }, totalAnimationTime); // 在 1500ms 後執行停止
    }

    // 顯示讀取畫面
    function showLoading(deckType) {
        const deckName = deckType === 'chance' ? '機會' : '命運';
        const colorClass = deckType === 'chance' ? 'green' : 'red';
        loadingText.innerHTML = `正在從 <span class="deck-name ${colorClass}">${deckName}</span> 牌庫抽取...`;
        switchScreen('loading');

        setTimeout(() => {
            drawCard(deckType);
        }, 1500); // 停留 1.5 秒
    }

    // 抽卡並顯示結果
    function drawCard(deckType) {
        let deck = mainDecks[deckType];
        
        if (deck.length === 0) {
            alert(`「${deckType === 'chance' ? '機會' : '命運'}」牌庫已經抽完！請重置牌庫。`);
            goHome(); 
            return;
        }

        const cardIndex = Math.floor(Math.random() * deck.length);
        const card = deck.splice(cardIndex, 1)[0]; 
        discardPiles[deckType].push(card); 

        displayCard(card, deckType);
    }

    // 顯示卡片內容
    function displayCard(card, deckType) {
        resultContent.innerHTML = '';
        choiceButtonsContainer.innerHTML = '';

        const deckName = deckType === 'chance' ? '機會' : '命運';
        const colorClass = deckType === 'chance' ? 'green' : 'red';
        resultContent.innerHTML += `
            <h3>你抽到了 (來自 <span class="deck-name ${colorClass}">${deckName}</span> 牌庫)：</h3>
            <h1 class="event-title">${card.title}</h1>
            <hr>
            <h4>情境：</h4>
            <p class="event-description">${card.description}</p>
        `;

        if (card.type === 'outcome') {
            resultContent.innerHTML += `
                <h4>效果：</h4>
                <div class="event-effect">
                    <h2>${formatEffect(card.effect)}</h2>
                </div>
            `;
            controlButtonsContainer.style.display = 'flex';
            choiceButtonsContainer.style.display = 'none';

        } else if (card.type === 'choice') {
            controlButtonsContainer.style.display = 'none';
            choiceButtonsContainer.style.display = 'flex';

            card.choices.forEach(choice => {
                const choiceBtn = document.createElement('button');
                choiceBtn.className = 'btn btn-large btn-choice';
                choiceBtn.textContent = choice.text;
                choiceBtn.onclick = () => {
                    showChoiceResult(choice);
                };
                choiceButtonsContainer.appendChild(choiceBtn);
            });
        }
        
        switchScreen('result');
    }

    // 顯示抉擇後的結果
    function showChoiceResult(choice) {
        resultContent.innerHTML += `
            <hr>
            <h4>你的決定：${choice.text}</h4>
            <div class="event-effect">
                <h2>${formatEffect(choice.effect)}</h2>
            </div>
        `;
        choiceButtonsContainer.style.display = 'none';
        controlButtonsContainer.style.display = 'flex';
    }

    // 回到主畫面
    function goHome() {
        switchScreen('draw');
        startFlashing();
        isDrawing = false;
        determinedDeck = null; // 重置抽中的牌庫狀態
        promptText.textContent = '(點擊上方區域以抽取)'; // 重置提示文字
    }

    // --- 5. 綁定事件監聽 ---
    
    // 點擊抽取器的主要邏輯
    drawButton.addEventListener('click', () => {
        if (isDrawing) return; // 如果正在動畫中，禁止點擊

        if (determinedDeck) {
            // --- 狀態 B：已經選好牌庫，第二次點擊 ---
            isDrawing = true; // 鎖定點擊，防止讀取時又點
            showLoading(determinedDeck); // 執行讀取和抽卡
            determinedDeck = null; // 清除狀態
        } else {
            // --- STATE A：尚未選定牌庫，第一次點擊 ---
            isDrawing = true; // 鎖定點擊，防止動畫時又點
            playDrawAnimation(); // 開始跑動畫
        }
    });

    // 點擊「繼續抽取」
    btnContinue.addEventListener('click', goHome);

    // 點擊「重置牌庫」
    btnReset.addEventListener('click', () => {
        if (confirm('確定要重置所有牌庫嗎？（已抽過的卡片會全部放回去）')) {
            resetDecks();
            goHome();
        }
    });

    // --- 6. 程式啟動 ---
    resetDecks(); // 第一次加載時，初始化牌庫
    goHome(); // 顯示主畫面並開始閃動

});
