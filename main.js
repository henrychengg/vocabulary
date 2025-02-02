// ==UserScript==
// @name         New Userscript
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://www.vocabulary.com/lists/*/practice*
// @match        https://www.vocabulary.com/vocabtrainer/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=vocabulary.com
// @grant        none
// @require      file://G:\我的云端硬盘\Programming\js\Projects\Vocabulary Bot\main.js
// ==/UserScript==

(function () {
    'use strict';

    // 初始化变量
    let url = window.location.href;
    let practiceID = url.split('/')[4];

    // 判断是练习还是掌握模式
    let isPractice = (url.split('/')[3] === 'lists') ? true : false;

    var stor = window.localStorage;
    var curList;
    var pLists = new Object(); // 存储问题列表

    var keyword = (isPractice) ? ".question" : ".box-question";
    var keyTypeIndex = (isPractice) ? 4 : 5;

    var choiceIndex = 0;

    // 初始化存储
    if (!stor.practiceLists) {
        stor.practiceLists = JSON.stringify(pLists);
    }
    pLists = JSON.parse(stor.practiceLists);

    // 读取当前列表
    if (!pLists.hasOwnProperty(practiceID)) {
        curList = new PracticeList(practiceID);
        pLists[practiceID] = curList;
        stor.practiceLists = JSON.stringify(pLists);
    } else {
        curList = pLists[practiceID];
    }
    console.log("curList:" + curList.id);

    // 定期执行回答问题
    setInterval(answerQuestion, 250);

    // 定义Deepseek API配置
    const DEEPSEEK_API_KEY = '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'; // 替换为你的API密钥
    const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

    async function callDeepseekAPI(question) {
        try {
            const response = await fetch(DEEPSEEK_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
                    'HTTP-Referer': 'https://www.vocabulary.com',
                },
                body: JSON.stringify({
                    model: "deepseek-chat",
                    messages: [{
                        role: "user",
                        content: `Answer this vocabulary question: ${question}`
                    }],
                    temperature: 0.7,
                    max_tokens: 100,
                }),
            });

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('调用Deepseek API失败:', error);
            return null;
        }
    }

    async function answerQuestion() {
        // 获取当前问题
        let curQ = document.querySelectorAll(keyword);
        curQ = curQ[curQ.length - 1];

        // 获取问题类型
        let qType = curQ.classList[1][keyTypeIndex].toUpperCase();

        // 处理填空题类型'T'
        if (qType === 'T') {
            answerTypeT(curQ);
            clickNext();
            return;
        }

        // 提取问题内容
        let question;
        switch (qType) {
            case 'P':
            case 'L':
                question = curQ.querySelector(".sentence").children[0].innerText;
                break;
            case 'H':
                question = curQ.querySelector(".sentence").children[0].innerText;
                break;
            case 'F':
                question = curQ.querySelector(".sentence").innerText.split(' ')[0];
                break;
            case 'I':
                if (isPractice) {
                    question = curQ.querySelector(".wrapper").innerText.split('\n')[1];
                } else {
                    question = curQ.querySelector(".box-word").innerText.split('\n')[1];
                }
                break;
            case 'G':
                question = curQ.querySelector(".questionContent").style.backgroundImage.split('/')[5];
                break;
            default:
                question = curQ.querySelector(".instructions").querySelector("strong").innerText;
                break;
        }

        // 检查是否已记录答案
        let qList;
        switch (qType) {
            case 'S':
                qList = curList.qTypeS;
                break;
            case 'D':
                qList = curList.qTypeD;
                break;
            case 'P':
                qList = curList.qTypeP;
                break;
            case 'H':
                qList = curList.qTypeH;
                break;
            case 'L':
                qList = curList.qTypeL;
                break;
            case 'A':
                qList = curList.qTypeA;
                break;
            case 'F':
                qList = curList.qTypeF;
                break;
            case 'I':
                qList = curList.qTypeI;
                break;
            case 'G':
                qList = curList.qTypeG;
                break;
            default:
                console.log("未知问题类型");
                return;
        }

        if (!qList.hasOwnProperty(question)) {
            // 调用Deepseek API获取答案
            const answer = await callDeepseekAPI(question);
            if (answer) {
                // 保存答案
                qList[question] = answer;
                stor.practiceLists = JSON.stringify(pLists);
                console.log(`记录问题: ${question}, 答案: ${answer}`);

                // 自动选择正确答案
                const choices = curQ.querySelector(".choices").children;
                for (let i = 0; i < choices.length; i++) {
                    if (choices[i].innerText === answer) {
                        choices[i].click();
                        clickNext();
                        return;
                    }
                }
            } else {
                // 如果API调用失败，继续使用原有逻辑
                console.log("Deepseek API调用失败，使用原有逻辑");
                // 原有逻辑...
            }
        } else {
            // 已记录答案，直接选择
            const choices = curQ.querySelector(".choices").children;
            for (let i = 0; i < choices.length; i++) {
                if (choices[i].innerText === qList[question]) {
                    choices[i].click();
                    console.log("已记录答案:" + choices[i].innerText);
                    clickNext();
                    return;
                }
            }
        }
    }

    function clickNext() {
        if (isPractice) {
            document.querySelector(".next").click();
        } else {
            document.querySelector('.btn-next').click();
        }
    }

    function answerTypeT(curQ) {
        let answer = curQ.querySelector('.complete').children[0].innerText;
        curQ.querySelector('input').value = answer;
        curQ.querySelector('.spellit').click();
    }

    // 定义PracticeList和Q对象
    function PracticeList(id) {
        this.id = id;
        this.qTypeD = new Object();
        this.qTypeS = new Object();
        this.qTypeP = new Object();
        this.qTypeH = new Object();
        this.qTypeL = new Object();
        this.qTypeA = new Object();
        this.qTypeF = new Object();
        this.qTypeI = new Object();
        this.qTypeG = new Object();
    }

    function Q(q, a) {
        this.q = q;
        this.a = a;
    }
})();
