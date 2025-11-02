// 【★ 唯一需要您修改的地方 ★】
const SPREADSHEET_ID = '1pEwL40e9FDGOV5b9o1lLEDhr_MSrIYqFrHmn89WFFko'; // <--- 事件列表的 sheet ID

// --- 1. 獲取所有 HTML 元素 ---
// (這部分不變)
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
const btnResetHome = document.getElementById('btn-reset-home');
const chanceEmptyWarning = document.getElementById('chance-empty');
const fateEmptyWarning = document.getElementById('fate-empty');

// --- 2. 事件卡片數據 ---
// 【★ 已修改 ★】 
// 我們不再靜態定義 cardData，而是先宣告一個空物件。
// 真正的資料將由 loadGameData() 函數從 Google Sheet 載入。
let cardData = {
    chance: [],
    fate: []
};
const formatEffect = (text) => {
    return text.replace(/(\+[\d\.]+\s*點)/g, '<span class="text-green">$1</span>')
               .replace(/(-[\d\.]+\s*點)/g, '<span class="text-red">$1</span>')
               .replace(/損失\s*(.*?)(?=\s*。|$|,)/g, '<span class="text-red">損失 $1</span>')
               .replace(/(獲得|換取)\s*「(.*?)」/g, '$1「<span class="text-blue-bold">$2</span>」')
               .replace(/(交出|支付)\s*「(.*?)」/g, '<span class="text-red">$1「<span class="text-blue-bold">$2</span>」</span>');
};

// --- 3. 牌庫狀態 ---
// (這部分不變)
let mainDecks = {};
let discardPiles = {};
let isDrawing = false; 
let flashInterval; 
let determinedDeck = null; 

// --- 4. 核心功能 ---

// 【★ 新增 ★】 Google Sheet 資料載入與解析
/**
 * 解析從 Google Sheet JSON Feed 來的資料
 * @param {object} data - Google 的 JSON 資料
 * @returns {Array} - 格式化後的卡片陣列
 */
function parseGoogleSheet(data) {
    const entries = data.feed.entry || [];
    const cards = [];
    
    entries.forEach(entry => {
        // 建立基本卡片結構
        const card = {
            id: entry.gsx$id ? entry.gsx$id.$t : '',
            title: entry.gsx$title ? entry.gsx$title.$t : '',
            description: entry.gsx$description ? entry.gsx$description.$t : '',
            type: entry.gsx$type ? entry.gsx$type.$t : 'outcome', // 預設為 outcome
            effect: entry.gsx$effect ? entry.gsx$effect.$t : '',
            choices: [] // 準備放置選項
        };

        // 檢查並加入選項1
        if (entry.gsx$choice1text && entry.gsx$choice1text.$t) {
            card.choices.push({
                text: entry.gsx$choice1text.$t,
                effect: entry.gsx$choice1effect ? entry.gsx$choice1effect.$t : ''
            });
        }
        
        // 檢查並加入選項2
        if (entry.gsx$choice2text && entry.gsx$choice2text.$t) {
            card.choices.push({
                text: entry.gsx$choice2text.$t,
                effect: entry.gsx$choice2effect ? entry.gsx$choice2effect.$t : ''
            });
        }
        
        // 如果卡片類型是 'outcome'，我們移除空的 choices 陣列
        if (card.type === 'outcome') {
            delete card.choices;
        }
        
        cards.push(card);
    });
    return cards;
}

/**
 * 從 Google Sheet 載入遊戲資料
 */
async function loadGameData() {
    // 顯示讀取中...
    switchScreen('loading');
    loadingText.innerHTML = '正在從 Google Sheet 載入事件資料...';

    // Google Sheet JSON Feed 的 URL 格式
    // 1 = 第一個工作表 (Chance)
    // 2 = 第二個工作表 (Fate)
    const chanceURL = `https://spreadsheets.google.com/feeds/list/${SPREADSHEET_ID}/1/public/values?alt=json`;
    const fateURL = `https://spreadsheets.google.com/feeds/list/${SPREADSHEET_ID}/2/public/values?alt=json`;

    try {
        // 同時抓取兩個工作表
        const [chanceResponse, fateResponse] = await Promise.all([
            fetch(chanceURL),
            fetch(fateURL)
        ]);

        if (!chanceResponse.ok || !fateResponse.ok) {
            throw new Error('無法抓取 Google Sheet 資料。請確認已「發佈到網路」。');
        }

        const chanceData = await chanceResponse.json();
        const fateData = await fateResponse.json();

        // 解析資料並存入 cardData
        cardData.chance = parseGoogleSheet(chanceData);
        cardData.fate = parseGoogleSheet(fateData);

        // 資料載入成功，初始化遊戲
        resetDecks(); 
        goHome(); 

    } catch (error) {
        console.error('載入資料失敗:', error);
        // 顯示錯誤訊息
        loadingText.innerHTML = `
            <span class="text-red">資料載入失敗！</span><br>
            <span style="font-size: 1rem;">請確認 SPREADSHEET_ID 正確，<br>且 Google Sheet 已「發佈到網路」。</span>
        `;
    }
}


// --- 剩下的功能 (完全不變) ---

// 初始化/重置牌庫
function resetDecks() {
    mainDecks.chance = JSON.parse(JSON.stringify(cardData.chance));
    mainDecks.fate = JSON.parse(JSON.stringify(cardData.fate));
    discardPiles.chance = [];
    discardPiles.fate = [];
    console.log("牌庫已重置，Chance: " + mainDecks.chance.length + " 張, Fate: " + mainDecks.fate.length + " 張");
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
    }, 800); 
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

// 顯示讀取畫面 (抽卡片時)
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

    const deckName = deckType === 'chance' ? '機會' : '命D運';
    const colorClass = deckType === 'chance' ? 'green' : 'red';
    resultContent.innerHTML += `
        <h3>你抽到了 (來自 <span class="deck-name ${colorClass}">${deckName}</span> 牌庫)：</h3>
        <h1 class="event-title">${card.title}</h1>
        <hr>
        <h4>情境：</h4>
        <p class="event-description">${card.description}</p>
    `;

    if (card.type === 'outcome' || !card.choices || card.choices.length === 0) {
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
    determinedDeck = null; 
    promptText.textContent = '(點擊上方區域以抽取)'; 

    // 檢查牌庫並更新首頁提示
    chanceEmptyWarning.style.display = mainDecks.chance.length === 0 ? 'block' : 'none';
    fateEmptyWarning.style.display = mainDecks.fate.length === 0 ? 'block' : 'none';
}

// 統一的重置函數
function handleReset() {
    if (confirm('確定要重置所有牌庫嗎？（已抽過的卡片會全部放回去）')) {
        resetDecks();
        goHome();
    }
}

// --- 5. 綁定事件監聽 ---

// 點擊抽取器的主要邏輯
drawButton.addEventListener('click', () => {
    if (isDrawing) return; 

    if (determinedDeck) {
        isDrawing = true; 
        showLoading(determinedDeck); 
        determinedDeck = null; 
    } else {
        const chanceCards = mainDecks.chance.length;
        const fateCards = mainDecks.fate.length;

        if (chanceCards === 0 && fateCards === 0) {
            alert('所有牌庫都已抽完，請重置牌庫！');
            return; 
        }

        isDrawing = true; 

        if (chanceCards > 0 && fateCards > 0) {
            playDrawAnimation(); 
        } else if (chanceCards > 0 && fateCards === 0) {
            forceDeckChoice('chance');
        } else if (chanceCards === 0 && fateCards > 0) {
            forceDeckChoice('fate');
        }
    }
});

// 點擊「繼續抽取」
btnContinue.addEventListener('click', goHome);

// 點擊「重置牌庫」 (結果頁)
btnReset.addEventListener('click', handleReset);

// 點擊「重置牌庫」 (首頁)
btnResetHome.addEventListener('click', handleReset);

// --- 6. 程式啟動 ---
// 【★ 已修改 ★】
// 網頁載入時不再直接呼叫 resetDecks()，
// 而是呼叫 loadGameData() 來啟動遊戲。
document.addEventListener('DOMContentLoaded', loadGameData);
