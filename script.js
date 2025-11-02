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
    const promptText = document.querySelector('.prompt-text'); 
    
    const resultContent = document.getElementById('result-content');
    const choiceButtonsContainer = document.getElementById('choice-buttons');
    const controlButtonsContainer = document.getElementById('control-buttons');
    
    const btnContinue = document.getElementById('btn-continue');
    const btnReset = document.getElementById('btn-reset');
    
    // 【★ 獲取新按鈕 ★】 (根據您的 index.html)
    const btnResetHome = document.getElementById('btn-reset-home');
    const chanceEmptyWarning = document.getElementById('chance-empty');
    const fateEmptyWarning = document.getElementById('fate-empty');

    // --- 2. 事件卡片數據 ---

    // 【★ 已修改 ★】 更新此函式以辨識新詞彙
    const formatEffect = (text) => {
        let formattedText = text;

        // 1. 處理點數 (最優先)
        // 綠色: +X 點
        formattedText = formattedText.replace(/(\+[\d\.]+\s*點)/g, '<span class="text-green">$1</span>');
        // 紅色: -X 點 或 健康點數 -X (沒有點)
        formattedText = formattedText.replace(/(-[\d\.]+\s*點|健康點數\s*-\d+)(?=\s*。|\)|$|,)/g, '<span class="text-red">$1</span>');

        // 2. 處理正面關鍵字
        // 藍色: 獲得「」, 則獲得「」, 則改為 獲得「」, 換取「」
        formattedText = formattedText.replace(/((?:則\s*|則改為\s*)?獲得|換取)\s*「(.*?)」/g, '$1「<span class="text-blue-bold">$2</span>」');
        // 綠色: 無損失, 可豁免
        formattedText = formattedText.replace(/(無損失|可豁免)(?=\s*。|\)|$|,)/g, '<span class="text-green">$1</span>');

        // 3. 處理負面關鍵字
        // 紅色: 交出「」, 支付「」, 消耗「」, 損失「」 (包含引號的)
        formattedText = formattedText.replace(/(交出|支付|消耗|損失)\s*「(.*?)」/g, '<span class="text-red">$1「<span class="text-blue-bold">$2</span>」</span>');
        // 紅色: 損失 (不含引號的), 則損失 (不含引號的)
        formattedText = formattedText.replace(/((?:則)?損失)\s+(?!「)(.*?)(?=\s*。|$|,|\()/g, '<span class="text-red">$1 $2</span>');

        return formattedText;
    };
    
    let cardData = {
        chance: [
            // --- 原始 7 張 ---
            { id: 'C1', title: '政府物資配給', description: '國軍/區公所冒險運來一批物資，你們幸運地領到了。', type: 'outcome', effect: '獲得「水 +10L」與「米 +5kg」。' },
            { id: 'C2', title: '醫療資源抵達', description: '無國界醫生或友軍醫療團設立了臨時醫療站。', type: 'outcome', effect: '全組 健康點數 +6。若有特殊身份者，該成員額外 +3 點。' },
            { id: 'C3', title: '幸運的發現', description: '你在巡視時，發現一間被遺棄的雜貨店還剩下一些有用的東西。', type: 'outcome', effect: '獲得「罐頭 x5」與「照明設備 x1」。' },
            { id: 'C4', title: '可靠的情報', description: '你的收音機接收到友軍的安全廣播，提振了士氣。', type: 'outcome', effect: '全組 健康點數 +3。(若無收音機則無效)' },
            { id: 'C5', title: '意外的潔淨水源', description: '你發現一處未受污染的隱藏水源（例如：未被發現的井）。', type: 'outcome', effect: '獲得「水 +20L」若有濾水器，則獲得「水 +30L」。' },
            { id: 'C6', title: '物資腐敗 (陷阱)', description: '你打開一箱存糧，發現因為儲存不當，已經全部腐敗發霉。', type: 'outcome', effect: '損失 20% 的食物。' },
            { id: 'C7', title: '假情報 (陷阱)', description: '你們聽到假消息，以為有空投物資，冒險外出卻一無所獲。', type: 'outcome', effect: '全組 健康點數 -3。並額外 損失「水 -1L」與「乾糧 -1包」。' },
            
            // --- 原始 7 張 (來自上次更新) ---
            { id: 'C8', title: '鄰居的善意', description: '一位友善的鄰居與你分享了多餘的物資。', type: 'outcome', effect: '獲得「醫療包 x1」與「水 x5L」。' },
            // 【★ 修正 #3 ★】
            { id: 'C9', title: '搜到醫療箱', description: '你在廢棄的車輛中找到一個完整的醫療箱。', type: 'outcome', effect: '獲得「醫療包 x2」與「水 x5L」。' },
            { id: 'C10', title: '衛生用品補給', description: '人道組織空投了一批衛生用品，你撿到了包裹。', type: 'outcome', effect: '獲得「水 x2L」與「醫療包 x1」。' },
            { id: 'C11', title: '臨時通訊站', description: '友軍架設了臨時通訊站，你成功聯絡上家人報平安。', type: 'outcome', effect: '全組 健康點數 +3。若有無線電則全組 健康點數 +6' },
            { id: 'C12', title: '能源補給', description: '你找到一包未開封的物資。', type: 'outcome', effect: '獲得「米 x10kg」與「照明設備 x1」。' },
            { id: 'C13', title: '發現嬰兒用品 (陷阱)', description: '你發現了一批「嬰兒用品」，但這是個陷阱，你觸發了警報並倉皇逃離。', type: 'outcome', effect: '全組 健康點數 -2 (因驚嚇)。' },
            { id: 'C14', title: '乾淨的衣物', description: '你找到一個被遺棄的行李箱，裡面有乾淨的衣物可供更換。', type: 'outcome', effect: '全組 健康點數 +2 (士氣提升)。' },
            
            // --- 新增選擇題 ---
            // 【★ 修正 #1 ★】
            { id: 'C15', title: '受困的商人', description: '你發現一名商人被壓在貨物下。你聽到了遠處有威脅... ', type: 'choice',
                choices: [
                    { text: '花時間救他 (需 1x 醫療包)', effect: '交出「醫療包 x1」。商人感謝你，並給了你「現金 2萬」。(若無醫療包則無法選擇)' },
                    { text: '快速搜刮他的貨物', effect: '獲得「罐頭 x3」。全組 健康點數 -2 (因良心不安)。' }
                ]
            },
            { id: 'C16', title: '破損的管線', description: '你發現一條微弱流出乾淨水源的水管，但修復它需要工具。', type: 'choice',
                choices: [
                    { text: '使用工具修理 (需 1x 工具組)', effect: '你修復了它。獲得「水 +20L」。(若無工具組則無法選擇)' },
                    { text: '直接取水', effect: '你只能接到「水 +3L」，且水管完全損毀。' }
                ]
            },
        ],
        fate: [
            // --- 原始 8 張 ---
            { id: 'F1', title: '第五縱隊襲擊', description: '合作者對你們的住所發動攻擊，雖然被擊退，但造成了損失。', type: 'outcome', effect: '全組 健康點數 -6。並 損失「30% 的水與糧食」。' },
            { id: 'F2', title: '鄰居搶食', description: '斷糧的鄰居破門而入，在混亂中搶走了你們的食物。', type: 'outcome', effect: '損失「米 x5kg」與「罐頭 x10」。(若有「防衛性武器」，則無損失)。' },
            { id: 'F3', title: '第五縱隊縱火', description: '附近發生縱火，濃煙與恐慌造成了嚴重壓力。', type: 'outcome', effect: '全組 健康點數 -3。' },
            { id: 'F4', title: '衛生危機', description: '由於廢棄物處理不當，組內爆發了傳染病。', type: 'outcome', effect: '全組 健康點數 -6。(若有準備「酒精/消毒用品」，則改為 -2 點)。' },
            { id: 'F5', title: '精神崩潰', description: '長期的壓力下，一名成員精神狀況不穩，歇斯底里地破壞了物品。', type: 'outcome', effect: '損失「糧食」一天人份。全組 健康點數 -3。(若有準備「無電娛樂用品」，可豁免)。' },
            { id: 'F6', title: '意外的轉折', description: '敵軍的空襲剛好炸開了附近無人銀行的金庫，你冒險撿到一些可用物資。', type: 'outcome', effect: '獲得「現金 10 萬」。' },
            { id: 'F7', title: '絕望的求助者', description: '一位帶著嬰兒的母親敲門，乞求你們給她一些食物與水。', type: 'choice',
                choices: [
                    { text: '幫助她', effect: '交出「七天一人份的糧食與水」。全組 健康點數 -2 (因失去物資的焦慮)。' },
                    { text: '拒絕她', effect: '全組 健康點數 -6 (因巨大的心理壓力與罪惡感)。' }
                ]
            },
            { id: 'F8', title: '黑市商人', description: '一個黑市商人路過，他願意交換物資，但只收現金。', type: 'choice',
                choices: [
                    { text: '交易 (需有現金)', effect: '支付「20,000 現金」。換取「四個人一週的糧食與水」或「其他想要的物品」。(若無現金則無法交易)' },
                    { text: '拒絕交易', effect: '沒有任何變化。' }
                ]
            },
            
            // --- 原始 8 張 (來自上次更新) ---
            { id: 'F9', title: '傳染病發作', description: '組內一名成員的傳染病發作，急需藥物。', type: 'outcome', effect: '損失「醫療包 x2」。(若無藥物，全組 健康點數 -6)' },
            { id: 'F10', title: '寵物/嬰兒生病', description: '家中的寵物或嬰兒生病了，需要額外照顧。', type: 'outcome', effect: '全組 健康點數 -3 (因焦慮)。並額外 損失「乾淨的水 1L」。' },
            // 【★ 修正 #4 ★】
            { id: 'F11', title: '幫派索取保護費', description: '當地幫派前來索取保護費。', type: 'choice', 
                choices: [ 
                    { text: '支付物資', effect: '交出「現金 x10,000」。幫派這週不會找你麻煩。' }, 
                    { text: '拒絕支付', effect: '你拒絕了。全組 健康點數 -3 (因恐懼)，若有防衛性武器則無損失。' } 
                ] 
            },
            { id: 'F12', title: '飲用水污染', description: '你儲存的一批飲用水因容器破裂而受到污染。', type: 'outcome', effect: '損失「飲用水 5L」。(若有「濾水器」，則損失2L)。' },
            { id: 'F13', title: '衛生用品短缺', description: '組內的女性成員生理期來了，但衛生用品不足。', type: 'outcome', effect: '全組 健康點數 -2 (因不適與壓力)。(若有準備「女性生理用品或醫療包」，可豁免)。' },
            // 【★ 修正 #2 ★】
            { id: 'F14', title: '嚴重外傷', description: '一名成員在偵查時不慎受了重傷，血流不止。', type: 'choice', 
                choices: [ 
                    { text: '使用醫療包', effect: '消耗「醫療包 x1」。' }, 
                    { text: '簡易處理', effect: '全組 健康點數 -6 (因感染風險)。' } 
                ] 
            },
            { id: 'F15', title: '絕望的士兵', description: '一名崩潰的逃兵闖入，要求你交出所有食物。', type: 'choice', 
                choices: [ 
                    { text: '交出食物', effect: '損失「30% 的糧食」。' }, 
                    { text: '武力對抗', effect: '全組 健康點數 -3。 (若有「防衛性武器」，則改為 獲得「糧食 x1包」)。' } 
                ] 
            },
            { id: 'F16', title: '失去光明', description: '你最後的照明設備壞了，暴露出安全風險。', type: 'outcome', effect: '損失「照明設備 x1」。(若無照明設備，全組 健康點數 -3)。' },

            // --- 新增選擇題 ---
            { id: 'F17', title: '可疑的空投', description: '你看到一個空投物資箱降落在附近，但那裡看起來很空曠。', type: 'choice',
                choices: [
                    { text: '攜帶武器前往 (需 防衛性武器)', effect: '你遭遇了埋伏，但在抵抗後成功帶走物資。獲得「四人份糧食 x1週份」。全組 健康點數 -3 (因戰鬥)。(若無武器無法選擇)' },
                    { text: '直接衝過去', effect: '這是個陷阱！你被搶走了物資並受了傷。損失「一週一人份糧食」。全組 健康點數 -6。' }
                ]
            },
            { id: 'F18', title: '封鎖區檢查站', description: '你必須通過一個由武裝人員控制的檢查站。', type: 'choice',
                choices: [
                    { text: '賄賂守衛 (需 10,000 現金)', effect: '支付「10,000 現金」。他們讓你通過了。(若無現金無法選擇)' },
                    { text: '試圖蒙混', effect: '你被識破並被粗暴對待。損失「米 x1kg」。全組 健康點數 -3。' }
                ]
            },
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
        promptText.textContent = '(抽取中...)'; 

        let speed = 50; 
        let totalAnimationTime = 1500; 
        let isGreen = Math.random() < 0.5;
        let animationTimeout;

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

        setTimeout(() => {
            clearTimeout(animationTimeout);
            stopFlashing(); // 【★ Bug 修正 ★】 確保所有計時器都被清除

            const finalDeck = isGreen ? 'fate' : 'chance';
            const deckName = finalDeck === 'chance' ? '機會' : '命運';
            const colorClass = finalDeck === 'chance' ? 'green' : 'red';
            
            drawButtonText.textContent = deckName;
            drawButton.className = `draw-button-container ${colorClass}`;

            determinedDeck = finalDeck; 
            promptText.innerHTML = `您抽中了 <span class="deck-name ${colorClass}">${deckName}</span>！<br>請再次點擊上方區域抽牌`;
            isDrawing = false; 

        }, totalAnimationTime); 
    }

    // 強制選擇唯一剩下的牌庫
    function forceDeckChoice(deckType) {
        stopFlashing(); // 【★ Bug 修正 ★】 確保清除待機閃動
        const deckName = deckType === 'chance' ? '機會' : '命運';
        const colorClass = deckType === 'chance' ? 'green' : 'red';
        
        drawButtonText.textContent = deckName;
        drawButton.className = `draw-button-container ${colorClass}`;
        determinedDeck = deckType;
        
        promptText.innerHTML = `您抽中了 <span class="deck-name ${colorClass}">${deckName}</span>！(這是唯一剩下的牌庫)<br>請再次點擊上方區域抽牌`;
        isDrawing = false; 
    }

    // 顯示讀取畫面
    function showLoading(deckType) {
        stopFlashing(); // 【★ Bug 修正 ★】 確保清除待機閃動
        const deckName = deckType === 'chance' ? '機會' : '命運';
        const colorClass = deckType === 'chance' ? 'green' : 'red';
        loadingText.innerHTML = `正在從 <span class="deck-name ${colorClass}">${deckName}</span> 牌庫抽取...`;
        switchScreen('loading');

        setTimeout(() => {
            drawCard(deckType);
        }, 1500); 
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
        resultContent.innerHTML +=
