// 【★ 請您再次確認這 3 行是您正確的 GID ★】
const SPREADSHEET_ID = '1pEwL40e9FDGOV5b9o1lLEDhr_MSrIYqFrHmn89WFFko'; 
const CHANCE_SHEET_GID = '0'; // <--- 您的 Chance GID
const FATE_SHEET_GID = '995792555'; // <--- 您的 Fate GID (請替換!)

// Google Visualization API URL 格式 (最穩定)
const SHEETS_V4_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&gid=`;


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
const btnResetHome = document.getElementById('btn-reset-home');
const chanceEmptyWarning = document.getElementById('chance-empty');
const fateEmptyWarning = document.getElementById('fate-empty');

// --- 2. 事件卡片數據 ---
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
let mainDecks = {};
let discardPiles = {};
let isDrawing = false; 
let flashInterval; 
let determinedDeck = null; 

// --- 4. 核心功能 ---

// 【★ 修正後的解析函式，處理空工作表 ★】
function parseGoogleSheet(data) {
    const jsonText = data.match(/google\.visualization\.Query\.setResponse\((.*)\);/);
    if (!jsonText || !jsonText[1]) {
        throw new Error("Google Sheet JSON 格式解析失敗。");
    }
    const queryData = JSON.parse(jsonText[1]);
    
    // 【★ 關鍵修正 1 ★】
    // 檢查 table 和 cols 是否存在
    if (!queryData.table || !queryData.table.cols) {
         throw new Error("工作表結構錯誤，找不到欄位 (cols)。請確認 GID 是否指向了正確的工作表。");
    }
    
    const cols = queryData.table.cols;
    const headers = cols.map(col => col.label);
    
    // 【★ 關鍵修正 2 ★】
    // 檢查 rows 是否存在，如果不存在 (null)，則視為空陣列
    const rows = queryData.table.rows || []; 
    const cards = [];

    rows.forEach(row => {
        const rowValues = row.c;
        if (!rowValues) return;

        const card = { choices: [] };
        let choiceIndex = 1;

        headers.forEach((header, i) => {
            const value = rowValues[i] && rowValues[i].v !== null ? rowValues[i].v : (rowValues[i] && rowValues[i].f ? rowValues[i].f : '');
            
            if (header.startsWith('choice') && header.endsWith('text')) {
                if (value) {
                    card.choices.push({
                        text: value,
                        effect: '' 
                    });
                }
            } else if (header.startsWith('choice') && header.endsWith('effect')) {
                if (card.choices.length >= choiceIndex) {
                    card.choices[choiceIndex - 1].effect = value;
                }
                choiceIndex++;
            } else {
                card[header] = value;
            }
        });
        
        card.choices = card.choices.filter(c => c.text);

        if (card.type === 'outcome' || card.type === '') {
            delete card.choices;
        }
        
        cards.push(card);
    });
    return cards.filter(card => card.id); 
}

/**
 * 從 Google Sheet 載入遊戲資料
 */
async function loadGameData() {
    switchScreen('loading');
    loadingText.innerHTML = '正在從 Google Sheet 載入事件資料...';

    const chanceURL = SHEETS_V4_URL + CHANCE_SHEET_GID;
    const fateURL = SHEETS_V4_URL + FATE_SHEET_GID;
    
    try {
        const [chanceResponse, fateResponse] = await Promise.all([
            fetch(chanceURL),
            fetch(fateURL)
        ]);

        if (!chanceResponse.ok || !fateResponse.ok) {
            throw new Error('無法抓取 Google Sheet 資料。請確認已「發佈到網路」且 GID 正確。');
        }

        const chanceData = await chanceResponse.text(); 
        const fateData = await fateResponse.text();

        cardData.chance = parseGoogleSheet(chanceData);
        cardData.fate = parseGoogleSheet(fateData);

        // 【★ 關鍵修正 3 ★】
        // 必須「兩個」牌庫都為空才拋出錯誤
        if (cardData.chance.length === 0 && cardData.fate.length === 0) { 
            throw new Error('兩個牌庫都為空，請檢查 Google Sheet 是否已填入資料 (非只有標題)。');
        }

        // 資料載入成功，初始化遊戲
        resetDecks(); 
        goHome(); 

    } catch (error) {
        console.error('載入資料失敗:', error);
        loadingText.innerHTML = `
            <span class="text-red">資料載入失敗！</span><br>
            <span style="font-size: 1rem;">錯誤原因: ${error.message}<br>請確認 GID 與欄位標題正確，且至少一個工作表有資料。</span>
        `;
    }
}


// --- 剩下的功能 (完全不變) ---

function resetDecks() {
    mainDecks.chance = JSON.parse(JSON.stringify(cardData.chance));
    mainDecks.fate = JSON.parse(JSON.stringify(cardData.fate));
    discardPiles.chance = [];
    discardPiles.fate = [];
    console.log("牌庫已重置，Chance: " + mainDecks.chance.length + " 張, Fate: " + mainDecks.fate.length + " 張");
}

function switchScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
}

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

function stopFlashing() {
    clearInterval(flashInterval);
}

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
        stopFlashing(); 

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

function forceDeckChoice(deckType) {
    stopFlashing();
    const deckName = deckType === 'chance' ? '機會' : '命運';
    const colorClass = deckType === 'chance' ? 'green' : 'red';
    
    drawButtonText.textContent = deckName;
    drawButton.className = `draw-button-container ${colorClass}`;
    determinedDeck = deckType;
    
    promptText.innerHTML = `您抽中了 <span class="deck-name ${colorClass}">${deckName}</span>！(這是唯一剩下的牌庫)<br>請再次點擊上方區域抽牌`;
    isDrawing = false; 
}

function showLoading(deckType) {
    stopFlashing(); 
    const deckName = deckType === 'chance' ? '機會' : '命運';
    const colorClass = deckType === 'chance' ? 'green' : 'red';
    loadingText.innerHTML = `正在從 <span class="deck-name ${colorClass}">${deckName}</span> 牌庫抽取...`;
    switchScreen('loading');

    setTimeout(() => {
        drawCard(deckType);
    }, 1500); 
}

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

    if (card.type === 'outcome' || !card.choices || card.choices.length === 0) {
        resultContent.innerHTML += `
            <h4>效果：</h4>
            <div class="event-effect">
                <h2>${formatEffect(card.effect || card.effect)}</h2>
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

function handleReset() {
    if (confirm('確定要重置所有牌庫嗎？（已抽過的卡片會全部放回去）')) {
        resetDecks();
        goHome();
    }
}

// --- 5. 綁定事件監聽 ---

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

btnContinue.addEventListener('click', goHome);
btnReset.addEventListener('click', handleReset);
btnResetHome.addEventListener('click', handleReset);

// --- 6. 程式啟動 ---
document.addEventListener('DOMContentLoaded', loadGameData);
