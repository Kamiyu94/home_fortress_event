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
                   .replace(/交出\s*「(.*?)」/g, '<span class="text-red">交出「<span class="text-blue-bold">$1</span>」</span>');
    };
    
    let cardData = {
        chance: [
            { id: 'C1', title: '政府物資配給', description: '國軍/區公所冒險運來一批物資，你們幸運地領到了。', type: 'outcome', effect: '獲得「水 +10L」與「米 +5kg」。' },
            { id: 'C2', title: '醫療資源抵達', description: '無國界醫生或友軍醫療團設立了臨時醫療站。', type: 'outcome', effect: '全組 健康點數 +6。若有特殊身份者，該成員額外 +3 點。' },
            { id: 'C3', title: '幸運的發現', description: '你在巡視時，發現一間被遺棄的雜貨店還剩下一些有用的東西。', type: 'outcome', effect: '獲得「罐頭 x5」與「電池 x10」。' },
            { id: 'C4', title: '可靠的情報', description: '你的收音機接收到友軍的安全廣播，提振了士氣。', type: 'outcome', effect: '全組 健康點數 +3。(若無收音機則無效)' },
            { id: 'C5', title: '意外的潔淨水源', description: '你發現一處未受污染的隱藏水源（例如：未被發現的井）。', type: 'outcome', effect: '獲得「水 +20L」。' },
            { id: 'C6', title: '物資腐敗 (陷阱)', description: '你打開一箱存糧，發現因為儲存不當，已經全部腐敗發霉。', type: 'outcome', effect: '損失 20% 的米或乾糧。' },
            { id: 'C7', title: '假情報 (陷阱)', description: '你們聽到假消息，以為有空投物資，冒險外出卻一無所獲。', type: 'outcome', effect: '全組 健康點數 -3。並額外 損失「水 -1L」與「乾糧 -1包」。' },
        ],
        fate: [
            { id: 'F1', title: '第五縱隊襲擊', description: '合作者對你們的住所發動攻擊，雖然被擊退，但造成了損失。', type: 'outcome', effect: '全組 健康點數 -6。並 損失「30% 的藥品」。' },
            { id: 'F2', title: '鄰居搶食', description: '斷糧的鄰居破門而入，在混亂中搶走了你們的食物。', type: 'outcome', effect: '損失「米 x5kg」與「罐頭 x10」。(若有居家強固，損失減半)。' },
            { id: 'F3', title: '第五縱隊縱火', description: '附近發生縱火，濃煙與恐慌造成了嚴重壓力。', type: 'outcome', effect: '全組 健康點數 -3。' },
            { id: 'F4', title: '衛生危機', description: '由於廢棄物處理不當，組內爆發了傳染病。', type: 'outcome', effect: '全組 健康點數 -6。(若有準備「漂白水/消毒用品」，則改為 -2 點)。' },
            { id: 'F5', title: '精神崩潰', description: '長期的壓力下，一名成員精神狀況不穩，歇斯底里地破壞了物品。', type: 'outcome', effect: '損失「照明設備」一件。全組 健康點數 -3。(若有準備「無電娛樂用品」，可豁免)。' },
            { id: 'F6', title: '意外的轉折', description: '敵軍的空襲剛好炸開了附近無人銀行的金庫，你冒險撿到一些可用物資。', type: 'outcome', effect: '獲得「醫療包 x2」。' },
            { id: 'F7', title: '絕望的求助者', description: '一位帶著嬰兒的母親敲門，乞求你們給她一些藥品。', type: 'choice',
                choices: [
                    { text: '幫助她', effect: '交出「藥品 x1」。全組 健康點數 -2 (因失去物資的焦慮)。' },
                    { text: '拒絕她', effect: '全組 健康點數 -6 (因巨大的心理壓力與罪惡感)。' }
                ]
            },
            { id: 'F8', title: '黑市商人', description: '一個黑市商人路過，他願意交換物資。', type: 'choice',
                choices: [
                    { text: '交易', effect: '交出「任一非消耗品 (如工具組)」，換取「瓦斯罐 x3」。' },
                    { text: '拒絕', effect: '沒有任何變化。' }
                ]
            }
        ]
    };

    // --- 3. 牌庫狀態 ---
    let mainDecks = {};
    let discardPiles = {};
    let isDrawing = false; // 防止重複點擊
    let flashInterval; // 閃動動畫計時器

    // --- 4. 核心功能 ---

    // 初始化/重置牌庫
    function resetDecks() {
        // 深拷貝一份原始數據，防止汙染
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

    // 執行抽牌動畫
    function playDrawAnimation() {
        if (isDrawing) return;
        isDrawing = true;
        stopFlashing();

        let speed = 50; // 初始速度
        let duration = 1500; // 加速階段時長
        let slowdownTime = 2000; // 減速階段總時長
        let isGreen = Math.random() < 0.5; // 初始狀態
        let animationTimeout;

        // 1. 高速閃動階段
        function fastFlash() {
            if (isGreen) {
                drawButtonText.textContent = '機會';
                drawButton.className = 'draw-button-container green';
            } else {
                drawButtonText.textContent = '命運';
                drawButton.className = 'draw-button-container red';
            }
            isGreen = !isGreen;
            animationTimeout = setTimeout(fastFlash, speed);
        }

        fastFlash();

        // 2. 停止加速，準備減速
        setTimeout(() => {
            clearTimeout(animationTimeout); // 停止高速閃動

            // 3. 漸漸減速階段
            function slowDown(currentSpeed) {
                if (currentSpeed > 1000) {
                    // 4. 最終停止
                    const finalDeck = isGreen ? 'fate' : 'chance'; // 上一幀是 green，停在 fate
                    showLoading(finalDeck);
                    return;
                }

                if (isGreen) {
                    drawButtonText.textContent = '機會';
                    drawButton.className = 'draw-button-container green';
                } else {
                    drawButtonText.textContent = '命運';
                    drawButton.className = 'draw-button-container red';
                }
                isGreen = !isGreen;
                
                setTimeout(() => slowDown(currentSpeed * 1.3), currentSpeed); // 速度越來越慢
            }
            slowDown(speed * 3); // 從一個較慢的速度開始

        }, duration);
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
        
        // 檢查牌庫是否已空
        if (deck.length === 0) {
            alert(`「${deckType === 'chance' ? '機會' : '命運'}」牌庫已經抽完！請重置牌庫。`);
            goHome(); // 回到主畫面
            return;
        }

        // 隨機抽一張
        const cardIndex = Math.floor(Math.random() * deck.length);
        const card = deck.splice(cardIndex, 1)[0]; // 從牌庫移除
        discardPiles[deckType].push(card); // 放入棄牌堆

        displayCard(card, deckType);
    }

    // 顯示卡片內容
    function displayCard(card, deckType) {
        // 清空上次的結果
        resultContent.innerHTML = '';
        choiceButtonsContainer.innerHTML = '';

        // 顯示基本資訊
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
            // 直接結果
            resultContent.innerHTML += `
                <h4>效果：</h4>
                <div class="event-effect">
                    <h2>${formatEffect(card.effect)}</h2>
                </div>
            `;
            // 顯示控制按鈕
            controlButtonsContainer.style.display = 'flex';
            choiceButtonsContainer.style.display = 'none';

        } else if (card.type === 'choice') {
            // 抉擇事件
            // 隱藏控制按鈕
            controlButtonsContainer.style.display = 'none';
            choiceButtonsContainer.style.display = 'flex';

            // 顯示抉擇按鈕
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
        // 隱藏抉擇按鈕，顯示控制按鈕
        choiceButtonsContainer.style.display = 'none';
        controlButtonsContainer.style.display = 'flex';
    }

    // 回到主畫面
    function goHome() {
        switchScreen('draw');
        startFlashing();
        isDrawing = false;
    }

    // --- 5. 綁定事件監聽 ---
    
    // 點擊抽取器
    drawButton.addEventListener('click', playDrawAnimation);

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