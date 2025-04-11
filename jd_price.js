/*
 * 脚本名称：京东比价
 * 使用说明：进入APP商品详情页面触发。
 * 支持版本：App V15.0.80（自行测试）
 * 脚本作者：小白脸
 
[Script]
京东比价 = type=http-response,pattern=^https:\/\/in\.m\.jd\.com\/product\/graphext\/\d+\.html,requires-body=1,max-size=0,binary-body-mode=0,script-path=https://raw.githubusercontent.com/ly6610111gmail6/qx/refs/heads/main/jd_price.js,timeout=60
 
[MITM]
hostname = %APPEND% in.m.jd.com

*/

// ==================== 新增核心功能 ====================
// 1. 加密库初始化
function initCryptoJS() {
    CryptoJS = function(t, r) {
        // ... [保留代码一中完整的CryptoJS实现] ...
    }(Math);
}

// 2. 工具函数
function jsonToQueryString(jsonObject) {
    return Object.keys(jsonObject).map(key => 
        `${encodeURIComponent(key)}=${encodeURIComponent(jsonObject[key])}`
    ).join('&');
}

function jsonToCustomString(jsonObject) {
    return Object.keys(jsonObject)
        .filter(key => jsonObject[key] !== '' && key.toLowerCase() !== 'token')
        .sort()
        .map(key => `${key.toUpperCase()}${jsonObject[key].toUpperCase()}`)
        .join('');
}

function md5(word) {
    return CryptoJS.MD5(word).toString();
}

// 3. 增强版Promise实现
function createResolvablePromise() {
    let resolveFn, rejectFn;
    const promise = new Promise((resolve, reject) => {
        resolveFn = resolve;
        rejectFn = reject;
    });
    return { 
        promise, 
        resolve: resolveFn, 
        reject: rejectFn 
    };
}

// ==================== 修改核心逻辑 ====================
const http = (op) => {
    const { promise, resolve, reject } = createResolvablePromise();
    const timer = setTimeout(() => {
        reject(new Error("请求超时，请检查网络连接"));
    }, 5000);

    this.$httpClient?.[op.method || "get"](op, (err, resp, data) => {
        clearTimeout(timer);
        err ? reject(err) : resolve(JSON.parse(data));
    });

    this.$task?.fetch(op).then(
        ({ body }) => {
            clearTimeout(timer);
            resolve(JSON.parse(body));
        }, 
        ({ error }) => {
            clearTimeout(timer);
            reject(error);
        }
    );

    return promise;
};

// ==================== 关键修改：API请求 ====================
const getPriceData = async () => {
    const share_url = `https://item.m.jd.com/product/${$request.url.match(/\d+/)}.html`;
    
    // 1. 构建签名请求体
    const rest_body = {
        methodName: "getHistoryTrend",
        p_url: encodeURIComponent(share_url),
        t: Date.now().toString(),
        c_appver: "4.0.10"
    };
    
    // 2. 生成加密token
    rest_body.token = md5(
        encodeURIComponent(
            "3E41D1331F5DDAFCD0A38FE2D52FF66F" +
            jsonToCustomString(rest_body) +
            "3E41D1331F5DDAFCD0A38FE2D52FF66F"
        )
    ).toUpperCase();

    // 3. 发送请求
    const body = await http({
        method: "post",
        url: "https://apapia-history.manmanbuy.com/ChromeWidgetServices/WidgetServices.ashx",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 13_1_3 like Mac OS X)"
        },
        body: jsonToQueryString(rest_body)
    });

    if (body.err) return body;

    // 4. 数据清洗
    const { jiagequshiyh } = body.single;
    const cleanedData = jiagequshiyh.replace(/,\s*\]/g, ']'); // 修复JSON格式
    
    return {
        groupName: "历史比价",
        atts: getJdData({
            ...body,
            single: {
                ...body.single,
                jiagequshiyh: cleanedData
            }
        })
    };
};

// ==================== 保留原有功能 ====================
// [保持原有的 toDate, parseNumber, formatNumber, comparePrices, 
//  priceHistoryTable, getJdData 等函数不变]

// ==================== 执行入口 ====================
initCryptoJS(); // 初始化加密库

getPriceData()
    .then((priceData) => {
        let { body, headers } = $response;
        const tableHTML = priceHistoryTable(priceData);
        body = body.replace("<body>", `<body>${tableHTML}`);
        $done({ body, headers });
    })
    .catch((e) => {
        console.log(`比价功能加载失败: ${e}`);
        $done({});
    });
